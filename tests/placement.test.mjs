import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {placementNote} from '../scripts/placement.mjs';
const variant=references=>({pcb:{},schematic:{population:{unplacedReferences:references}}});

test('PCB placement note uses the actual unplaced reference count',()=>{
  assert.match(placementNote(variant(['U1']),'../schematic/index.html'),/1 schematic component is not yet placed.*Its symbol remains/);
  const note=placementNote(variant(['U1','J1','L1']),'../schematic/index.html');
  assert.match(note,/3 schematic components are not yet placed/);assert.match(note,/role="note"/);
  assert.match(note,/Their symbols remain available in the/);assert.match(note,/href="\.\.\/schematic\/index\.html"/);
  assert.doesNotMatch(note,/<h[1-6]|sidebar-card|green/);
});
test('placement note is omitted for complete, schematic-only, or board-only projects',()=>{
  for(const v of [variant([]),{pcb:{},schematic:null},{pcb:null,schematic:{population:{unplacedReferences:['U1']}}}])assert.equal(placementNote(v,'schematic.html'),'');
});
test('placement summary is rendered only on the PCB page',async()=>{
  const source=await fs.readFile('scripts/build.mjs','utf8');
  const overview=source.slice(source.indexOf('async function overview('),source.indexOf('function drawingArea('));
  const pcb=source.slice(source.indexOf('function pcb('),source.indexOf('async function write('));
  assert.doesNotMatch(overview,/components not placed|sidebar-card green|placementNote/);assert.match(pcb,/placementNote\(variant/);
});

test('PCB note combines the native routing report with the verified unplaced population',()=>{
  const v={...variant(['U1','J1']),pcb:{routing:{unconnectedItems:48,missingFootprints:2}}};
  const note=placementNote(v,'../schematic/index.html');
  assert.match(note,/KiCad reports 48 unconnected items\./);
  assert.match(note,/2 schematic components are not yet placed/);
  assert.doesNotMatch(note,/percent|%|complete|fabrication-ready|<h[1-6]|sidebar-card/);
  v.pcb.routing.unconnectedItems=1;
  assert.match(placementNote(v,'sheet.html'),/1 unconnected item\./);
});
test('routing-only notes do not require a schematic, and zero remaining counts make no release claim',()=>{
  assert.match(placementNote({pcb:{routing:{unconnectedItems:1,missingFootprints:0}}},null),/1 unconnected item/);
  assert.doesNotMatch(placementNote({pcb:{routing:{unconnectedItems:1,missingFootprints:1}}},null),/<a|symbols remain/);
  assert.equal(placementNote({pcb:{routing:{unconnectedItems:0,missingFootprints:0}}},null),'');
});
test('inconsistent or invalid routing counts stop the build instead of making a misleading note',()=>{
  assert.throws(()=>placementNote({ ...variant(['U1']),pcb:{routing:{unconnectedItems:48,missingFootprints:2}}},'sheet.html'),/does not match/);
  for(const value of [-1,1.5,'48',NaN,undefined])assert.throws(()=>placementNote({pcb:{routing:{unconnectedItems:value,missingFootprints:0}}},null));
});

test('PCB progress-note text meets normal-text contrast',async()=>{
  const css=await fs.readFile('src/style.css','utf8');
  const foreground=css.match(/\.placement-note\{[^}]*color:(#[0-9a-f]{6})/)[1];
  const background=css.match(/--paper:(#[0-9a-f]{6})/)[1];
  const luminance=hex=>hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  const values=[luminance(foreground),luminance(background)].sort((a,b)=>a-b);
  assert.ok((values[1]+.05)/(values[0]+.05)>=4.5);
});
