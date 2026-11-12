import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {validateComponentIndex,componentIdFromObject} from '../src/component-index.js';
import {availableViews} from '../src/project-data.js';
import {attachEnclosure} from '../src/enclosure.js';

const root=path.resolve(process.env.VIEWER_DIST??'dist');
const info=JSON.parse(await fs.readFile(path.join(root,'build-info.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'data/manifest.json'),'utf8'));
const errors=[],sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let modelCount=0,componentCount=0,modeledCount=0,sheetCount=0,accessoryCount=0;
for(const route of info.routes) {
  const html=await fs.readFile(path.join(root,route),'utf8');
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href=match[1].replaceAll('&amp;','&');if(/^(https?:|mailto:|data:|#)/.test(href))continue;
    const resolved=path.resolve(path.dirname(path.join(root,route)),decodeURIComponent(href.split(/[?#]/)[0]));
    if(!resolved.startsWith(root+path.sep)){errors.push(`${route}: escaped output root (${href})`);continue;}
    try{await fs.access(resolved);}catch{errors.push(`${route}: missing ${href}`);}
  }
  if(!html.includes(manifest.snapshot.id))errors.push(`${route}: missing snapshot identity`);
}
for(const [file,expected] of Object.entries(manifest.snapshot.outputHashes))if(sha(await fs.readFile(path.join(root,file)))!==expected)errors.push(`Hash mismatch: ${file}`);
for(const [file,expected] of Object.entries(info.featureHashes??{}))if(sha(await fs.readFile(path.join(root,file)))!==expected)errors.push(`Feature render hash mismatch: ${file}`);
for(const [file,expected] of Object.entries(info.brandingHashes??{}))if(sha(await fs.readFile(path.join(root,file)))!==expected)errors.push(`Branding hash mismatch: ${file}`);
for(const variant of manifest.variants) {
  for(const view of availableViews(variant)){const route=`${variant.id}/${view==='overview'?'':view+'/'}index.html`;if(!info.routes.includes(route))errors.push(`Missing available view: ${route}`);}
  const sheets=variant.schematic?.sheets??[],sheetIds=new Set(sheets.map(s=>s.id));sheetCount+=sheets.length;
  if(sheetIds.size!==sheets.length)errors.push(`Duplicate sheet instance: ${variant.id}`);
  for(const sheet of sheets) {
    await fs.access(path.join(root,sheet.url));
    for(const symbol of sheet.symbols)if(symbol.schematicSheetId!==sheet.id)errors.push(`Symbol is assigned to a different sheet: ${symbol.reference}`);
  }
  for(const layer of variant.pcb?.layers??[]) {
    const svg=await fs.readFile(path.join(root,layer.url),'utf8'),bounds=svg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);
    if(!bounds||bounds.some((x,i)=>Math.abs(x-variant.pcb.viewBox[i])>1e-6))errors.push(`Unregistered layer: ${variant.id} ${layer.id}`);
  }
  if(variant.pcb)for(const layer of variant.pcb.copperLayers)if(!variant.pcb.layers.some(item=>item.id===layer))errors.push(`Missing copper layer export: ${layer}`);
  const indexUrl=variant.componentsUrl??variant.model?.componentsUrl;
  const index=indexUrl?JSON.parse(await fs.readFile(path.join(root,indexUrl),'utf8')):null;
  if(index) {
    componentCount+=index.components.length;
    const ids=new Set(),refs=new Set();
    for(const c of index.components) {
      if(ids.has(c.id)||refs.has(c.reference))errors.push(`Duplicate component identity: ${c.reference}`);ids.add(c.id);refs.add(c.reference);
      if(c.schematicSheetId&&!sheetIds.has(c.schematicSheetId))errors.push(`Component links to a missing sheet: ${c.reference}`);
      if(c.identityStatus==='verified'&&!sheets.some(s=>s.id===c.schematicSheetId&&s.symbols.some(symbol=>symbol.reference===c.reference&&symbol.uuid===c.symbolUuid)))errors.push(`Verified component has no matching native symbol: ${c.reference}`);
    }
  }
  if(!variant.model)continue;
  modelCount++;
  const bytes=await fs.readFile(path.join(root,variant.model.url));
  if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length){errors.push(`Invalid GLB: ${variant.id}`);continue;}
  const loaded=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  if(variant.enclosure){
    const e=variant.enclosure;
    if(e.board_sha256!==index.source.pcbSha256)errors.push('Enclosure and PCB revisions differ');
    const caseBytes=await fs.readFile(path.join(root,e.modelUrl));
    const caseGltf=await new GLTFLoader().parseAsync(caseBytes.buffer.slice(caseBytes.byteOffset,caseBytes.byteOffset+caseBytes.byteLength),'');
    if(caseGltf.parser.json.buffers.some(b=>b.uri))errors.push('External enclosure GLB buffer');
    const holder=new THREE.Group(),assembly=attachEnclosure(holder,caseGltf,e);
    holder.updateMatrixWorld(true);
    for(const part of e.parts){
      const object=assembly.objects.get(part.id),bounds=new THREE.Box3().setFromObject(object);
      if(!object||bounds.isEmpty())errors.push('Missing enclosure part: '+part.id);
      for(const kind of ['stepUrl','stlUrl'])await fs.access(path.join(root,part[kind]));
    }
    assembly.setMode('board');if(assembly.root.visible)errors.push('Board mode did not hide enclosure');
    assembly.setMode('exploded');if(!assembly.root.visible)errors.push('Exploded mode hid enclosure');
  }
  if(loaded.parser.json.buffers.some(buffer=>buffer.uri))errors.push(`External GLB buffer: ${variant.id}`);
  validateComponentIndex(loaded.parser.json,index);
  if(sha(bytes)!==index.modelSha256)errors.push(`Component model hash mismatch: ${variant.id}`);
  if(index.components.filter(c=>c.hasModel).length!==variant.model.modeledFootprints)errors.push(`Model coverage mismatch: ${variant.id}`);
  loaded.scene.updateMatrixWorld(true);
  const objects=new Map();loaded.scene.traverse(object=>{const id=object.userData.viewerComponentId;if(id){if(!objects.has(id))objects.set(id,[]);objects.get(id).push(object);}});
  for(const c of index.components.filter(c=>c.hasModel)) {
    const roots=objects.get(c.id)??[];
    if(roots.length!==c.modelNodes.length){errors.push(`Loaded model binding mismatch: ${c.reference}`);continue;}
    // Probe real triangles rather than assuming every board is populated on the
    // front or that edge connectors are invisible from the other side.
    let picked=false;
    for(const object of roots) {
      const meshes=[];object.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});
      for(const mesh of meshes) {
        const positions=mesh.geometry.getAttribute('position'),indices=mesh.geometry.index;
        for(let triangle=0;triangle<Math.min(indices?.count??positions.count,90)&&!picked;triangle+=3) {
          const vertices=[0,1,2].map(n=>new THREE.Vector3().fromBufferAttribute(positions,indices?indices.getX(triangle+n):triangle+n).applyMatrix4(mesh.matrixWorld));
          const normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));if(normal.lengthSq()<1e-20)continue;normal.normalize();
          const center=vertices[0].clone().add(vertices[1]).add(vertices[2]).multiplyScalar(1/3);
          const ray=new THREE.Raycaster(center.clone().addScaledVector(normal,.00001),normal.clone().negate());
          const hit=ray.intersectObject(object,true)[0];if(hit&&componentIdFromObject(hit.object)===c.id)picked=true;
        }
      }
    }
    if(!picked)errors.push(`Cannot raycast indexed component geometry: ${c.reference}`);
    modeledCount++;
  }
  accessoryCount+=(index.accessories??[]).filter(a=>a.hasModel||a.boxes?.length).length;
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else {
  console.log(`Verified ${info.routes.length} pages, every local link, ${Object.keys(manifest.snapshot.outputHashes).length} artifact hashes, ${sheetCount} sheet instances, and registered PCB layers.`);
  console.log(`Verified ${componentCount} component records, ${modeledCount} model identities with real triangle raycasts, ${modelCount} self-contained GLBs, and ${accessoryCount} assembly accessories.`);
}
