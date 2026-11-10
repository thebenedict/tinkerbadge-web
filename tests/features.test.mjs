import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {featureAnchors,projectAnchor,leaderPoints} from '../src/feature-geometry.js';
import {loadFeatures,featurePreview} from '../scripts/features.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const components=[{reference:'D1',x:10,y:20,layer:'F.Cu'},{reference:'D2',x:20,y:20,layer:'F.Cu'},{reference:'U1',x:30,y:40,layer:'B.Cu'},{reference:'RES1',x:50,y:60,layer:'B.Cu',boardOnly:true}];

test('feature anchors point to one representative component',()=>{
  const result=featureAnchors({anchors:[['D1']]},components,'front',[2,0,1,0,2,3]);
  assert.deepEqual(result,[{references:['D1'],pointMm:[10,20],pixel:[21,43]}]);
});
test('multiple leaders and group-centroid anchors are rejected',()=>{
  for(const anchors of [[],[['D1'],['D2']],[['D1','D2']]])assert.throws(()=>featureAnchors({anchors},components,'front',[1,0,0,0,1,0]),/one representative component and one leader/);
});
test('representative anchors follow the same reference after placement changes',()=>{
  const moved=components.map(component=>component.reference==='D1'?{...component,x:45,y:65}:component);
  const anchor=featureAnchors({anchors:[['D1']]},moved,'front',[2,0,1,0,2,3])[0];
  assert.deepEqual(anchor.pointMm,[45,65]);assert.deepEqual(anchor.pixel,[91,133]);
});
test('back feature projection mirrors x while preserving y',()=>assert.deepEqual(projectAnchor([-4,0,1240,0,4,-400],[174.5,178]),[542,312]));
test('feature anchors fail closed on missing, duplicate, wrong-side and unlabeled reservation references',()=>{
  for(const [feature,parts,side] of [[{anchors:[['missing']]},components,'front'],[{anchors:[['D1']]},[...components,components[0]],'front'],[{anchors:[['D1']]},components,'back'],[{anchors:[['RES1']]},components,'back']])assert.throws(()=>featureAnchors(feature,parts,side,[1,0,0,0,1,0]));
  assert.equal(featureAnchors({anchors:[['RES1']],reservation:true},components,'back',[1,0,0,0,1,0])[0].pointMm[0],50);
});
test('leaders scale from native image pixels without drifting on resize',()=>{
  const label={x:0,y:100,width:150,height:80},image={x:170,y:20,width:400,height:300};
  assert.deepEqual(leaderPoints(label,image,[240,180],[960,720]),[[150,135],[210,135],[270,95]]);
  assert.deepEqual(leaderPoints({x:0,y:320,width:150,height:80},{x:0,y:0,width:320,height:240},[240,180],[960,720],true),[[75,320],[75,252],[80,60]]);
});
test('current badge feature metadata covers requested hardware and verified rendered anchors',async()=>{
  const manifest=JSON.parse(await fs.readFile(path.join(root,'public/data/manifest.json'),'utf8'));
  const variant=manifest.variants.find(v=>v.id==='badge');if(!variant)return;
  const features=await loadFeatures({root,publicDir:path.join(root,'public'),manifest,variant});
  const labels=features.views.flatMap(v=>v.features);
  assert.deepEqual(labels.map(f=>f.id),['processor-front','encounters','light','role','qwiic','affinity','processor','motion','nfc','sao','battery','nfc-antenna']);
  assert.deepEqual(features.views.map(view=>[view.id,view.side]),[['front','front'],['components','front'],['back','back']]);
  assert.deepEqual(features.views.map(view=>view.features.length),[6,3,3]);
  for(const label of labels){assert.equal(label.anchors.length,1,label.id);assert.equal(label.anchors[0].references.length,1,label.id);}
  assert.equal(labels.find(f=>f.id==='encounters').description,'Detect conversation partners and share credentials');
  assert.deepEqual(labels.find(f=>f.id==='encounters').anchors[0].references,['U504']);
  assert.deepEqual(labels.find(f=>f.id==='role').anchors[0].references,['D402']);
  assert.deepEqual(labels.find(f=>f.id==='affinity').anchors[0].references,['D406']);
  assert.equal(labels.find(f=>f.id==='sao').description,'Space for a badge add-on.');
  assert.match(labels.find(f=>f.id==='nfc').description,/Rear coil layout pending/);
  const html=featurePreview(features,url=>url);for(const view of features.views)assert.ok(html.includes(`${view.imageUrl}?v=${view.sha256.slice(0,16)}`));assert.match(html,/Unlocked ESP32-S3/);assert.match(html,/data-feature-view="back" hidden/);assert.match(html,/data-feature-view="components" hidden/);assert.match(html,/type="radio"/);assert.match(html,/<noscript><style>@layer base\{\.feature-diagram/);
  const stale=structuredClone(manifest);stale.snapshot.id='wrong';await assert.rejects(loadFeatures({root,publicDir:path.join(root,'public'),manifest:stale,variant}),/do not match/);
});

test('presentation view names cannot substitute for native board sides',()=>{assert.throws(()=>featureAnchors({anchors:[['D1']]},components,'components',[1,0,0,0,1,0]),/explicit board side/);});

test('rear region anchors use frozen native coordinates without impersonating fitted parts',()=>{
  const region={reference:'RES1',x:50,y:60,layer:'F.Cu',boardOnly:true,models:[]};
  const feature={anchors:[['RES1']],anchorType:'board-region',reservation:true,sourceDocument:'docs/plan.md'};
  assert.deepEqual(featureAnchors(feature,[region],'back',[-2,0,200,0,2,0])[0].pixel,[100,120]);
  for(const bad of [{...region,boardOnly:false},{...region,models:[{path:'part.step'}]}])assert.throws(()=>featureAnchors(feature,[bad],'back',[1,0,0,0,1,0]),/model-less reservation/);
  assert.throws(()=>featureAnchors({...feature,sourceDocument:null},[region],'back',[1,0,0,0,1,0]),/documented/);
});
test('accessory anchors use native assembly positions and enforce the viewing side',()=>{
  const accessory={id:'battery',reference:'MECH_BATTERY',positionMm:{x:154,y:147.5},layer:'B.Cu'};
  const feature={anchors:[['MECH_BATTERY']],anchorType:'accessory',reservation:true};
  assert.deepEqual(featureAnchors(feature,[],'back',[-1,0,310,0,1,0],[accessory])[0].pointMm,[154,147.5]);
  assert.throws(()=>featureAnchors(feature,[],'front',[1,0,0,0,1,0],[accessory]),/wrong side/);
  assert.throws(()=>featureAnchors({...feature,reservation:false},[],'back',[1,0,0,0,1,0],[accessory]),/provisional/);
});

test('exposed model-point anchors follow native footprint rotation and fail if the model changes',()=>{
  const part={reference:'U1',x:130,y:113.25,rotation:0,layer:'F.Cu',footprint:'RF_Module:ESP',modelSources:[{sourceSha256:'pinned-model'}]};
  const feature={anchors:[['U1']],anchorOffsetMm:[0,-9.75],anchorFootprint:'RF_Module:ESP',anchorModelSha256:'pinned-model',sourceDocument:'board.kicad_pcb'};
  assert.deepEqual(featureAnchors(feature,[part],'front',[1,0,0,0,1,0])[0].pointMm,[130,103.5]);
  const rotated=featureAnchors(feature,[{...part,rotation:90}],'front',[1,0,0,0,1,0])[0].pointMm;
  assert.ok(Math.abs(rotated[0]-120.25)<1e-9);assert.ok(Math.abs(rotated[1]-113.25)<1e-9);
  assert.throws(()=>featureAnchors(feature,[{...part,modelSources:[]}],'front',[1,0,0,0,1,0]),/verified native footprint and model/);
});
