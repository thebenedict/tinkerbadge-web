import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {attachAccessories,setNativeAccessoriesVisible} from '../src/accessories.js';
import fs from 'node:fs/promises';
import {componentFromIntersections,isEffectivelyVisible} from '../src/component-index.js';
test('source envelope coordinates remain in the native model frame',()=>{const model=new THREE.Group(),root=new THREE.Group();model.add(root);const index={accessories:[{id:'display',label:'Display envelope',defaultVisible:true,hasModel:false,boxes:[{center:[.155,.002,.1505],size:[.0933,.00092,.0549],color:[.1,.1,.1]}]}]};const accessories=attachAccessories(model,index);const group=root.children[0],box=group.children[0];assert.deepEqual(box.position.toArray(),[.155,.002,.1505]);assert.equal(accessories.items.length,1);assert.equal(group.userData.viewerComponentId,undefined);accessories.setVisible(false);assert.equal(isEffectivelyVisible(box),false);accessories.dispose();assert.equal(root.children.length,0);});
test('visible accessories occlude PCB picks and hidden accessories do not',()=>{const component={isMesh:true,userData:{viewerComponentId:'U1'}},accessoryRoot={visible:true,userData:{viewerAccessoryId:'display'}},accessory={isMesh:true,parent:accessoryRoot};const hits=[{object:accessory},{object:component}];assert.equal(componentFromIntersections(hits),null);accessoryRoot.visible=false;assert.equal(componentFromIntersections(hits),'U1');});
test('native accessories are toggled without adding duplicate boxes',()=>{const model=new THREE.Group(),root=new THREE.Group(),native=new THREE.Group();native.userData.viewerAccessoryId='battery';model.add(root);root.add(native);const accessories=attachAccessories(model,{accessories:[{id:'battery',hasModel:true,defaultVisible:true,modelNodes:[1]}]});assert.equal(root.children.length,1);accessories.setVisible(false);assert.equal(native.visible,false);accessories.dispose();assert.equal(root.children.length,1);});


test('native accessories start hidden before metadata loads without hiding board parts',()=>{
  const model=new THREE.Group(),board=new THREE.Group(),display=new THREE.Group(),battery=new THREE.Group();
  display.userData.viewerAccessoryId='display';battery.userData.viewerAccessoryId='battery';model.add(board,display,battery);
  setNativeAccessoriesVisible(model);assert.equal(display.visible,false);assert.equal(battery.visible,false);assert.equal(board.visible,true);
  setNativeAccessoriesVisible(model,true);assert.equal(display.visible,true);assert.equal(battery.visible,true);
});
test('attachment uses the current toggle choice instead of snapshot display defaults',()=>{
  const model=new THREE.Group(),root=new THREE.Group(),native=new THREE.Group();native.userData.viewerAccessoryId='battery';model.add(root);root.add(native);
  const index={accessories:[{id:'battery',hasModel:true,defaultVisible:true},{id:'panel',hasModel:false,defaultVisible:true,boxes:[{center:[0,0,0],size:[.1,.001,.05]}]}]};
  let attached=attachAccessories(model,index);assert.equal(native.visible,false);assert.equal(root.children[1].visible,false);attached.dispose();
  attached=attachAccessories(model,index,true);assert.equal(native.visible,true);assert.equal(root.children[1].visible,true);attached.setVisible(false);assert.equal(native.visible,false);attached.dispose();
});
test('overview starts unchecked and passes the retained toggle choice on model reload',async()=>{
  const builder=await fs.readFile('scripts/build.mjs','utf8'),overview=await fs.readFile('src/overview.js','utf8');
  assert.match(builder,/id="show-accessories" type="checkbox" disabled/);assert.doesNotMatch(builder,/id="show-accessories"[^>]*checked/);
  assert.match(overview,/accessoriesVisible:accessoryToggle\?\.checked\?\?false/);assert.match(overview,/accessoryToggle\.checked=readAccessoryChoice/);assert.doesNotMatch(overview,/accessoryToggle\.checked\s*=\s*true/);
});


test('an explicit accessory choice survives navigation only for its saved model key',async()=>{
  const {readAccessoryChoice,saveAccessoryChoice}=await import('../src/accessory-preference.js');
  const values=new Map(),storage=()=>({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)});
  assert.equal(readAccessoryChoice('model-a',storage),false);
  saveAccessoryChoice('model-a',true,storage);assert.equal(readAccessoryChoice('model-a',storage),true);assert.equal(readAccessoryChoice('model-b',storage),false);
  saveAccessoryChoice('model-a',false,storage);assert.equal(readAccessoryChoice('model-a',storage),false);
});
test('blocked preference storage does not prevent default-off viewing or toggling',async()=>{
  const {readAccessoryChoice,saveAccessoryChoice}=await import('../src/accessory-preference.js');
  const blocked=()=>{throw new Error('Storage unavailable');};assert.equal(readAccessoryChoice('model',blocked),false);assert.doesNotThrow(()=>saveAccessoryChoice('model',true,blocked));
});
