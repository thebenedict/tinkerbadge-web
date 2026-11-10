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
