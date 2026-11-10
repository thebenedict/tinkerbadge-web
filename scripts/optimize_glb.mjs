// Merge only compatible primitives inside each mesh. No geometry simplification,
// node flattening, transform changes, texture processing, or external decoders.
import {NodeIO, getBounds} from '@gltf-transform/core';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node scripts/optimize_glb.mjs input.glb output.glb');
const io=new NodeIO();const doc=await io.read(input);const root=doc.getRoot();
if(root.listSkins().length||root.listAnimations().length||root.listExtensionsUsed().length)throw new Error('This optimizer handles the static, uncompressed native KiCad export only.');
const materialIndex=new Map(root.listMaterials().map((m,i)=>[m,i]));
const nodeState=()=>root.listNodes().map(n=>({name:n.getName(),translation:n.getTranslation(),rotation:n.getRotation(),scale:n.getScale(),mesh:n.getMesh()?.getName()}));
function stats(){let primitives=0,triangles=0;for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){primitives++;triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;}return {meshes:root.listMeshes().length,primitives,triangles};}
function geometryDigest(){
  // Preserve every indexed triangle, winding, material, and vertex attribute.
  const hashes=[];
  for(const[mi,mesh]of root.listMeshes().entries())for(const p of mesh.listPrimitives()){
    if(p.getMode()!==4||p.listTargets().length)throw new Error('Only ordinary triangle primitives are supported.');
    const semantics=p.listSemantics().sort();const indices=p.getIndices()?.getArray()??Uint32Array.from({length:p.getAttribute('POSITION').getCount()},(_,i)=>i);
    for(let i=0;i<indices.length;i+=3){const values=[mi,materialIndex.get(p.getMaterial())??-1];for(let j=0;j<3;j++)for(const semantic of semantics){const a=p.getAttribute(semantic),size=a.getElementSize(),array=a.getArray();for(let k=0;k<size;k++)values.push(array[indices[i+j]*size+k]);}hashes.push(crypto.createHash('sha256').update(JSON.stringify([semantics,values])).digest('hex'));}
  }
  return crypto.createHash('sha256').update(hashes.sort().join('')).digest('hex');
}
const before={...stats(),bounds:getBounds(root.listScenes()[0]),nodes:nodeState(),geometry:geometryDigest(),bytes:(await fs.stat(input)).size};
const buffer=root.listBuffers()[0]??doc.createBuffer();
for(const mesh of root.listMeshes()){
  const groups=new Map();
  for(const p of mesh.listPrimitives()){
    const signature=JSON.stringify([materialIndex.get(p.getMaterial()),p.getMode(),p.listSemantics().sort().map(s=>{const a=p.getAttribute(s);return[s,a.getType(),a.getComponentType(),a.getNormalized()];})]);
    if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push(p);
  }
  for(const group of groups.values()){
    if(group.length<2)continue;
    const template=group[0],vertices=group.reduce((n,p)=>n+p.getAttribute('POSITION').getCount(),0);
    const count=group.reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount()),0);
    const merged=doc.createPrimitive().setMode(template.getMode()).setMaterial(template.getMaterial());
    for(const semantic of template.listSemantics()){
      const first=template.getAttribute(semantic),size=first.getElementSize();const array=new (first.getArray().constructor)(vertices*size);let offset=0;
      for(const p of group){const data=p.getAttribute(semantic).getArray();array.set(data,offset);offset+=data.length;}
      merged.setAttribute(semantic,doc.createAccessor().setType(first.getType()).setNormalized(first.getNormalized()).setArray(array).setBuffer(buffer));
    }
    const indices=vertices>65535?new Uint32Array(count):new Uint16Array(count);let indexOffset=0,vertexOffset=0;
    for(const p of group){const length=p.getAttribute('POSITION').getCount(),source=p.getIndices()?.getArray()??Uint32Array.from({length},(_,i)=>i);for(const index of source)indices[indexOffset++]=index+vertexOffset;vertexOffset+=length;}
    merged.setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer));
    for(const p of group){mesh.removePrimitive(p);p.dispose();}mesh.addPrimitive(merged);
  }
}
const used=new Set();for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){if(p.getIndices())used.add(p.getIndices());for(const a of p.listAttributes())used.add(a);}for(const a of root.listAccessors())if(!used.has(a))a.dispose();
const after={...stats(),bounds:getBounds(root.listScenes()[0]),nodes:nodeState(),geometry:geometryDigest()};
if(before.geometry!==after.geometry||JSON.stringify(before.nodes)!==JSON.stringify(after.nodes)||JSON.stringify(before.bounds)!==JSON.stringify(after.bounds))throw new Error('Optimizer changed geometry, transforms, or node identities.');
await io.write(output,doc);after.bytes=(await fs.stat(output)).size;
console.log(JSON.stringify({before:{primitives:before.primitives,triangles:before.triangles,bytes:before.bytes},after:{primitives:after.primitives,triangles:after.triangles,bytes:after.bytes},geometrySha256:after.geometry,nodeCount:after.nodes.length,preserved:['triangles','winding','vertex attributes','materials','node names','transforms','bounds'],tool:'@gltf-transform/core 4.2.1'}));
