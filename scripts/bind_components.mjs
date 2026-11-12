// Add identity metadata to the optimized GLB without rewriting geometry bytes.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateComponentIndex,meshOwnership} from '../src/component-index.js';
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');

const near=(a,b,tolerance=1e-8)=>Number.isFinite(a)&&Math.abs(a-b)<=tolerance;
const vector=(value,expected)=>Array.isArray(value)&&value.length===expected.length&&value.every((x,i)=>near(x,expected[i]));
const zeroTransform=model=>vector(model?.transform?.offsetMm,[0,0,0])&&vector(model?.transform?.rotationDeg,[0,0,0])&&vector(model?.transform?.scale,[1,1,1]);

export function calibrateBoardSurfaces(gltf, components, thicknessMm=null) {
  const root=gltf.nodes?.[gltf.scenes?.[0]?.nodes?.[0]];
  if(!root||root.matrix||!vector(root.translation??[0,0,0],[0,0,0])||!vector(root.rotation??[0,0,0,1],[0,0,0,1])||!vector(root.scale??[1,1,1],[1,1,1]))return null;
  const sides={'F.Cu':[],'B.Cu':[]};
  for(const component of components) {
    if(!sides[component.layer]||component.modelNodes?.length!==1)continue;
    const models=(component.modelSources??[]).filter(model=>model.resolved&&!model.hidden);
    if(models.length!==1||!zeroTransform(models[0]))continue;
    const node=gltf.nodes[component.modelNodes[0]],translation=node.translation??[0,0,0];
    if(node.matrix||!vector(node.scale??[1,1,1],[1,1,1])||translation.length!==3||!translation.every(Number.isFinite))continue;
    if(!near(translation[0],component.positionMm?.x*.001)||!near(translation[2],component.positionMm?.y*.001))continue;
    sides[component.layer].push({reference:component.reference,uuid:component.uuid,modelNode:component.modelNodes[0],layer:component.layer,sourcePositionMm:component.positionMm,translation});
  }
  if(Object.entries(sides).some(([side,anchors])=>anchors.length<(side==='B.Cu'&&Number.isFinite(thicknessMm)?1:2)||anchors.some(anchor=>!near(anchor.translation[1],anchors[0].translation[1],1e-9))))return null;
  const frontY=sides['F.Cu'][0].translation[1],backY=sides['B.Cu'][0].translation[1];
  if(frontY<=backY)return null;
  if(Number.isFinite(thicknessMm)&&!near((frontY-backY)*1000,thicknessMm,.05))return null;
  return {frontY,backY,units:'metres',coordinateSystem:'Native KiCad GLB: X=PCB x, Z=PCB y, Y=front-up',anchors:[...sides['F.Cu'],...sides['B.Cu']]};
}

export function accessoryFallback(accessory, calibration) {
  const envelope=accessory.sourceEnvelope,models=(accessory.modelSources??[]).filter(model=>model.resolved&&!model.hidden);
  if(!envelope||!calibration)return {boxes:[],fallbackStatus:'Source envelope or verified front/back GLB anchors are unavailable.'};
  if(models.length!==1||!zeroTransform(models[0])||envelope.sourceSha256!==models[0].sourceSha256||!envelope.sourcePath||envelope.sourcePath!==models[0].sourcePath||!near(accessory.positionMm?.rotation,0)||!['F.Cu','B.Cu'].includes(accessory.layer))return {boxes:[],fallbackStatus:'Native accessory placement does not match the validated zero-transform envelope.'};
  if(!Number.isFinite(accessory.positionMm.x)||!Number.isFinite(accessory.positionMm.y)||!envelope.boxesMm?.length||envelope.boxesMm.some(box=>!near(box.centerMm?.[1],0)||!box.sizeMm?.every(x=>Number.isFinite(x)&&x>0)||box.sizeMm.length!==3||!box.centerMm.every(Number.isFinite)||box.centerMm.length!==3))return {boxes:[],fallbackStatus:'Source box geometry is outside the validated envelope adapter.'};
  const front=accessory.layer==='F.Cu',surfaceY=front?calibration.frontY:calibration.backY;
  const boxes=envelope.boxesMm.map(box=>({center:[(accessory.positionMm.x+box.centerMm[0])*.001,surfaceY+(front?1:-1)*box.centerMm[2]*.001,accessory.positionMm.y*.001],size:[box.sizeMm[0]*.001,box.sizeMm[2]*.001,box.sizeMm[1]*.001],color:box.color,opacity:box.opacity}));
  return {boxes,fallbackStatus:'Source review-envelope boxes placed from native footprint coordinates.',provenance:{kind:'source-vrml-boxes',sourcePath:envelope.sourcePath,sourceSha256:envelope.sourceSha256,sourceUnitsToMm:envelope.sourceUnitsToMm,nativeReference:accessory.reference,nativeUuid:accessory.uuid,positionMm:accessory.positionMm,layer:accessory.layer,calibration}};
}

export function calibrateEnclosureFront(gltf,components,nominalThicknessMm){
  const anchors=[];
  for(const c of components){
    const models=c.modelSources?.filter(m=>m.resolved&&!m.hidden)??[];
    if(c.layer!=='F.Cu'||models.length!==1||!zeroTransform(models[0])||c.modelNodes.length!==1)continue;
    const node=gltf.nodes[c.modelNodes[0]],t=node.translation;
    if(node.matrix||!vector(node.scale??[1,1,1],[1,1,1])||!t||!near(t[0],c.positionMm.x*.001)||!near(t[2],c.positionMm.y*.001))continue;
    anchors.push({reference:c.reference,translation:t});
  }
  if(anchors.length<3||!Number.isFinite(nominalThicknessMm)||anchors.some(a=>!near(a.translation[1],anchors[0].translation[1],1e-9)))return null;
  return {frontY:anchors[0].translation[1],nominalThicknessMm,units:'metres',method:'Three or more agreeing zero-offset front component origins; CAD uses native nominal PCB thickness.',anchors};
}

export function bindComponents(gltf, source, bindingId) {
  const output=structuredClone(gltf), index={schemaVersion:1,bindingId,variant:source.variant,source:source.source,components:[],accessories:[]};
  const references=new Set(), ids=new Set();
  if(output.scenes?.length!==1||output.scenes[0].nodes?.length!==1)throw new Error('Expected one KiCad board root.');
  const boardRoot=output.nodes[output.scenes[0].nodes[0]];if(!boardRoot||Number.isInteger(boardRoot.mesh))throw new Error('Invalid KiCad board root.');
  function bind(record,accessory=false) {
    if(references.has(record.reference)||ids.has(record.id))throw new Error(`Duplicate source identity: ${record.reference}`);
    references.add(record.reference);ids.add(record.id);
    const matches=output.nodes.map((node,i)=>node.name===record.reference?i:-1).filter(i=>i>=0);
    const partial=source.allowMissingModels===true||accessory;
    if(matches.length>1||(!partial&&matches.length!==(record.hasModel?1:0)))throw new Error(`${record.reference}: expected ${record.hasModel?1:0} exact KiCad reference node, found ${matches.length}.`);
    if(partial&&matches.length&&(!record.modelSources?.some(model=>model.resolved&&!model.hidden)))throw new Error(`${record.reference}: model has no verified native source.`);
    if(matches.length){const node=output.nodes[matches[0]];if(Number.isInteger(node.mesh)||!boardRoot.children?.includes(matches[0])||!node.children?.length)throw new Error(`${record.reference}: expected a KiCad component assembly parent.`);
      node.extras={...node.extras,...(accessory?{viewerAccessoryId:record.id,viewerAccessoryReference:record.reference}:{viewerComponentId:record.id,viewerComponentReference:record.reference})};}
    return {...record,hasModel:matches.length>0,modelNodes:matches};
  }
  for(const component of source.components)index.components.push(bind(component));
  for(const accessory of source.accessories??[])index.accessories.push(bind(accessory,true));
  const ownership=meshOwnership(output);
  for(const component of index.components) {
    component.meshNodes=[...ownership].filter(([,owner])=>owner===component.id).map(([i])=>i);
    if(component.hasModel&&!component.meshNodes.length)throw new Error(`No geometry for ${component.reference}`);
  }
  const calibration=calibrateBoardSurfaces(output,index.components,source.source?.pcbThicknessMm);
  index.boardCalibration=calibrateEnclosureFront(output,index.components,source.source?.pcbThicknessMm);
  for(const accessory of index.accessories) {
    accessory.meshNodes=[];
    function collect(i){if(ownership.has(i)){if(ownership.get(i)!==null)throw new Error('Accessory overlaps a component identity.');accessory.meshNodes.push(i);}for(const c of output.nodes[i].children??[])collect(c);}
    for(const i of accessory.modelNodes)collect(i);
    if(accessory.hasModel&&!accessory.meshNodes.length)throw new Error(`No geometry for ${accessory.reference}`);
    Object.assign(accessory,accessory.hasModel?{boxes:[],fallbackStatus:'Native accessory model is included.'}:accessoryFallback(accessory,calibration));
  }
  index.boardMeshNodes=[...ownership].filter(([,owner])=>owner===null).map(([i])=>i);
  output.asset.extras={...output.asset.extras,viewerComponentIndex:bindingId};
  validateComponentIndex(output,index);
  return {gltf:output,index};
}

export function readGlb(buffer) {
  if(buffer.toString('ascii',0,4)!=='glTF'||buffer.readUInt32LE(4)!==2||buffer.readUInt32LE(8)!==buffer.length)throw new Error('Invalid GLB header.');
  const jsonLength=buffer.readUInt32LE(12);
  if(buffer.readUInt32LE(16)!==0x4e4f534a)throw new Error('Missing GLB JSON chunk.');
  return {gltf:JSON.parse(buffer.toString('utf8',20,20+jsonLength)),tail:buffer.subarray(20+jsonLength)};
}
export function writeGlb(gltf,tail) {
  const json=Buffer.from(JSON.stringify(gltf)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,0x20);json.copy(padded);
  const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  return Buffer.concat([header,padded,tail]);
}

async function main() {
  const [modelPath,sourcePath,indexPath]=process.argv.slice(2);if(!indexPath)throw new Error('Usage: node scripts/bind_components.mjs model.glb component-source.json components.json');
  const original=await fs.readFile(modelPath),source=JSON.parse(await fs.readFile(sourcePath,'utf8'));
  const {gltf,tail}=readGlb(original),bindingId=digest(JSON.stringify({source,modelSha256:digest(original)}));
  const bound=bindComponents(gltf,source,bindingId),bytes=writeGlb(bound.gltf,tail);
  if(!readGlb(bytes).tail.equals(tail))throw new Error('Component binding changed geometry bytes.');
  await fs.writeFile(modelPath,bytes);bound.index.modelSha256=digest(bytes);
  await fs.writeFile(indexPath,JSON.stringify(bound.index,null,2)+'\n');
  console.log(JSON.stringify({components:bound.index.components.length,modeledComponents:bound.index.components.filter(c=>c.hasModel).length,accessories:bound.index.accessories.length,renderableAccessories:bound.index.accessories.filter(a=>a.hasModel||a.boxes?.length).length,bindingId,modelBytes:bytes.length}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
