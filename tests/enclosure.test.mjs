import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachEnclosure} from '../src/enclosure.js';
import {assemblyMode,assemblyUrl,partOffset} from '../src/enclosure-state.js';
import {availableViews} from '../src/project-data.js';

test('assembly deep links preserve other state and reject unknown modes',()=>{
  assert.equal(assemblyMode('bad','exploded'),'exploded');
  const url=assemblyUrl('https://example.test/sub/badge/enclosure/?ref=J101#main','board');
  assert.equal(url.searchParams.get('ref'),'J101');assert.equal(url.searchParams.get('assembly'),'board');assert.equal(url.hash,'#main');
  assert.deepEqual(partOffset({explode_mm:[0,0,35]},'exploded',.5),[0,0,.0175]);
  assert.deepEqual(partOffset({explode_mm:[0,0,35]},'assembled'),[0,0,0]);
});
test('enclosure registration maps CAD millimetre datums into the native KiCad frame',()=>{
  const model=new THREE.Group(),scene=new THREE.Group();
  const plate=new THREE.Mesh(new THREE.BoxGeometry(.01,.01,.001),new THREE.MeshStandardMaterial());plate.name='front';scene.add(plate);
  const metadata={frontSurfaceM:.0016012,parts:[{id:'front',group:'front',explode_mm:[0,0,35]}]};
  const e=attachEnclosure(model,{scene},metadata);model.updateMatrixWorld(true);
  const p=scene.localToWorld(new THREE.Vector3(.051,.0225,.0064));
  assert.ok(p.distanceTo(new THREE.Vector3(.206,.0080012,.1175))<1e-12);
  e.setMode('board');assert.equal(scene.visible,false);
  e.setMode('exploded');assert.equal(scene.visible,true);assert.ok(Math.abs(plate.position.z-.035)<1e-12);
  e.setExplosion(.5);assert.ok(Math.abs(plate.position.z-.0175)<1e-12);
  e.setVisible('front',false);e.setMode('assembled');assert.equal(plate.visible,false);
});
test('missing case geometry fails instead of presenting a partial assembly',()=>{
  assert.throws(()=>attachEnclosure(new THREE.Group(),{scene:new THREE.Group()},{frontSurfaceM:0,parts:[{id:'front'}]}),/parts list/);
});
test('enclosure navigation is conditional and preserves electrical views',()=>{
  assert.deepEqual(availableViews({enclosure:{},schematic:{sheets:[{}]},pcb:{layers:[{}]}}),['overview','enclosure','schematic','pcb']);
  assert.deepEqual(availableViews({}),['overview']);
});
