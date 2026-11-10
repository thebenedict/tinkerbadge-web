import test from 'node:test';
import assert from 'node:assert/strict';
import {availableViews,projectFacts,schematicCount,sourceMatchLabel,schematicSheetUrl,boardDimensions} from '../src/project-data.js';
const schematic={sheets:[{symbols:[]},{symbols:[{reference:'U1'},{reference:'R1'}]},{symbols:[{reference:'U1'}]}]};
test('schematic-first projects expose only available views',()=>{assert.deepEqual(availableViews({schematic,pcb:null,model:null}),['overview','schematic']);assert.deepEqual(availableViews({schematic:null,pcb:null,model:null}),['overview']);});
test('four-layer and empty-board facts come from project data',()=>{const facts=projectFacts({schematic,pcb:{widthMm:110,heightMm:100,copperLayers:['F.Cu','In1.Cu','In2.Cu','B.Cu'],thicknessMm:1.6,components:[]},model:{modeledFootprints:0},facts:[{label:'Display',value:'3.7',unit:'in'}]});assert.equal(facts.find(f=>f.label==='Copper layers').value,4);assert.equal(facts.find(f=>f.label==='Placed footprints').value,0);assert.equal(facts.find(f=>f.label==='Display').unit,'in');});
test('schematic count deduplicates multi-unit references instead of counting symbols',()=>{assert.equal(schematicCount({schematic}),2);assert.equal(schematicCount({schematic:{...schematic,population:{symbols:9}}}),2);});

test('source labels distinguish board-only reservations from mismatches',()=>{assert.equal(sourceMatchLabel({identityStatus:'verified'}),'');assert.equal(sourceMatchLabel({identityStatus:'board-only'}),'Board-only footprint');assert.equal(sourceMatchLabel({identityStatus:'pcb-only'}),'No schematic match');assert.equal(sourceMatchLabel({identityStatus:'verified',sourceDifferences:[{field:'Value'}]}),'PCB and schematic differ');});

test('manual sheet changes clear cross-sheet reference focus',()=>{const url=schematicSheetUrl('https://example.test/badge/schematic/?sheet=first&ref=U201&unit=2','second');assert.equal(url.searchParams.get('sheet'),'second');assert.equal(url.searchParams.has('ref'),false);assert.equal(url.searchParams.has('unit'),false);});
test('boards without a supported outline do not print null dimensions',()=>{assert.equal(boardDimensions({widthMm:null,heightMm:null}),null);assert.equal(boardDimensions({widthMm:110.000001,heightMm:100}),'110 × 100');});
