import test from 'node:test';
import assert from 'node:assert/strict';
import {bindComponents,readGlb,writeGlb} from '../scripts/bind_components.mjs';
const fixture=()=>({asset:{version:'2.0'},scenes:[{nodes:[0]}],nodes:[{children:[1,3]},{name:'R1',children:[2]},{mesh:0},{name:'board',mesh:1}],meshes:[{},{}]});
const component=(id,reference,extra={})=>({id,reference,hasModel:false,modelExpected:true,schematicSheetId:'/root/power',modelSources:[{resolved:true,hidden:false}],...extra});
test('partial native export binds present models and honestly lists absent models',()=>{
 const {gltf,index}=bindComponents(fixture(),{variant:'badge',source:{},allowMissingModels:true,components:[component('one','R1'),component('two','R2')]},'partial');
 assert.deepEqual(index.components.map(c=>c.hasModel),[true,false]);assert.deepEqual(index.components[1].modelNodes,[]);assert.equal(index.components[0].schematicSheetId,'/root/power');assert.equal(gltf.nodes[1].extras.viewerComponentId,'one');
});
test('partial binding still rejects invented model sources',()=>{
 assert.throws(()=>bindComponents(fixture(),{variant:'badge',allowMissingModels:true,components:[component('one','R1',{modelSources:[]})]},'key'),/verified native source/);
});
test('partial binding supports multiple model meshes under one native assembly',()=>{
 const gltf=fixture();gltf.nodes.push({mesh:0});gltf.nodes[1].children.push(4);
 const result=bindComponents(gltf,{variant:'badge',allowMissingModels:true,components:[component('one','R1')]},'key');assert.deepEqual(result.index.components[0].meshNodes,[2,4]);
});
test('bare board remains a valid bound model with no fabricated components',()=>{
 const gltf=fixture();gltf.nodes=[{children:[1]},{name:'board',mesh:0}];
 const result=bindComponents(gltf,{variant:'badge',allowMissingModels:true,components:[]},'key');assert.deepEqual(result.index.components,[]);assert.deepEqual(result.index.boardMeshNodes,[1]);
});
test('partial model metadata preserves the native GLB binary tail',()=>{
 const tail=Buffer.from([4,0,0,0,0x42,0x49,0x4e,0,9,8,7,6]);const original=writeGlb(fixture(),tail);
 const parsed=readGlb(original);const bound=bindComponents(parsed.gltf,{variant:'badge',allowMissingModels:true,components:[component('one','R1')]},'key');
 assert.ok(readGlb(writeGlb(bound.gltf,parsed.tail)).tail.equals(tail));
});

const nativeModel=()=>({resolved:true,hidden:false,sourcePath:'models/review.wrl',sourceSha256:'source-hash',transform:{offsetMm:[0,0,0],rotationDeg:[0,0,0],scale:[1,1,1]}});
function calibratedFixture(){
 const gltf={asset:{version:'2.0'},scenes:[{nodes:[0]}],nodes:[{children:[]}],meshes:[{}]},components=[];
 for(let i=0;i<4;i++){const node=gltf.nodes.length,front=i<2,x=10+i,y=20+i;gltf.nodes[0].children.push(node);gltf.nodes.push({name:`R${i+1}`,translation:[x*.001,front?.000795:-.000805,y*.001],children:[node+1]},{mesh:0});components.push(component(`part-${i}`,`R${i+1}`,{uuid:`uuid-${i}`,positionMm:{x,y,rotation:0},layer:front?'F.Cu':'B.Cu',modelSources:[nativeModel()]}));}
 const accessory={id:'badge:accessory:display',key:'display',reference:'MECH_PANEL',uuid:'panel-uuid',label:'Panel',description:'Proposed display envelope',status:'proposed',defaultVisible:true,positionMm:{x:50,y:60,rotation:0},layer:'F.Cu',modelSources:[nativeModel()],sourceEnvelope:{kind:'source-vrml-boxes',sourcePath:'models/review.wrl',sourceSha256:'source-hash',sourceUnitsToMm:2.54,boxesMm:[{centerMm:[-2.3,0,1.935],sizeMm:[81.12,47.32,.03],color:[.88,.9,.85],opacity:1}]}};
 return {gltf,source:{variant:'badge',source:{},allowMissingModels:true,components,accessories:[accessory]}};
}
test('source envelopes use verified native surfaces and stay out of electrical identities',()=>{
 const {gltf,source}=calibratedFixture();const result=bindComponents(gltf,source,'boxes');const accessory=result.index.accessories[0];
 assert.equal(result.index.components.length,4);assert.equal(accessory.hasModel,false);assert.equal(accessory.boxes.length,1);
 accessory.boxes[0].center.forEach((n,i)=>assert.ok(Math.abs(n-[.0477,.00273,.06][i])<1e-10));
 assert.deepEqual(accessory.boxes[0].size,[.08112000000000001,.00003,.04732]);assert.equal(accessory.provenance.calibration.anchors.length,4);assert.equal(accessory.provenance.sourceSha256,'source-hash');
});
test('accessory fallback fails closed for insufficient, moved, or inconsistent anchors',()=>{
 for(const mutate of [x=>x.source.components[3].modelSources[0].transform.offsetMm[2]=1,x=>x.gltf.nodes[1].translation[0]+=.001,x=>x.gltf.nodes[3].translation[1]+=.0001]){
  const fixture=calibratedFixture();mutate(fixture);assert.equal(bindComponents(fixture.gltf,fixture.source,'bad').index.accessories[0].boxes.length,0);
 }
});
test('accessory fallback rejects changed placement and stale source hashes',()=>{
 for(const mutate of [a=>a.positionMm.rotation=90,a=>a.sourceEnvelope.sourceSha256='stale',a=>a.sourceEnvelope.boxesMm[0].centerMm[1]=2]){
  const {gltf,source}=calibratedFixture();mutate(source.accessories[0]);assert.deepEqual(bindComponents(gltf,source,'bad').index.accessories[0].boxes,[]);
 }
});
test('native accessory geometry is tagged once and never duplicated with boxes',()=>{
 const {gltf,source}=calibratedFixture();const node=gltf.nodes.length;gltf.nodes[0].children.push(node);gltf.nodes.push({name:'MECH_PANEL',children:[node+1]},{mesh:0});
 const result=bindComponents(gltf,source,'native');const accessory=result.index.accessories[0];assert.equal(accessory.hasModel,true);assert.deepEqual(accessory.boxes,[]);assert.equal(result.gltf.nodes[node].extras.viewerAccessoryId,accessory.id);assert.equal(result.gltf.nodes[node].extras.viewerComponentId,undefined);assert.deepEqual(accessory.meshNodes,[node+1]);assert.ok(result.index.boardMeshNodes.includes(node+1));
});
test('an electrical reference cannot also become an accessory',()=>{
 const {gltf,source}=calibratedFixture();source.accessories[0].reference='R1';assert.throws(()=>bindComponents(gltf,source,'dup'),/Duplicate source identity/);
});
