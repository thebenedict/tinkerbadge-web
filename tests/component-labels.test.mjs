import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {componentName,componentLabel,componentOptionLabel,componentSearchText,componentSecondaryLabel} from '../src/component-labels.js';
const receiver={reference:'U504',displayName:'Infrared receiver',value:'IRM-H638T/TR2',properties:{MPN:'IRM-H638T/TR2'},sourceSheetName:'Peripherals'};
test('shared component labels preserve the readable name, reference and part value',()=>{
  assert.equal(componentName(receiver),'Infrared receiver');
  assert.equal(componentLabel(receiver),'Infrared receiver');
  assert.equal(componentOptionLabel(receiver),'U504 · Infrared receiver · IRM-H638T/TR2');
  assert.equal(componentSecondaryLabel(receiver),'IRM-H638T/TR2 · Peripherals');
});
test('missing or invalid names fall back to source metadata without role inference',()=>{
  for(const displayName of [null,undefined,{},'',42])assert.equal(componentLabel({reference:'Q1',value:'AO3400A',displayName}),'AO3400A');
  assert.equal(componentOptionLabel({reference:'R1',value:'10k'}),'R1 · 10k');
  assert.equal(componentLabel({reference:'J1'}),'J1');
  assert.equal(componentOptionLabel({reference:'R1',value:'Resistor',displayName:'Resistor'}),'R1 · Resistor');
});
test('search can find names, native values, MPNs, nets and sheet names',()=>{
  const text=componentSearchText({...receiver,nets:['IR_RX'],bom:{partNumber:'another-part'}});
  for(const token of ['infrared','u504','irm-h638t/tr2','ir_rx','peripherals','another-part'])assert.ok(text.includes(token),token);
});
test('all inspectors consume the same exported displayName field',async()=>{
  const model=await fs.readFile('src/model-inspector.js','utf8'),drawing=await fs.readFile('src/drawing.js','utf8');
  assert.match(model,/component-labels.js/);assert.match(model,/escapeHtml\(componentLabel\(c\)\)/);
  assert.match(drawing,/heading.textContent=componentName\(component\)/);assert.match(drawing,/componentSearchText\(c\)/);
  for(const route of ['pcb','schematic'])assert.match(await fs.readFile(`src/${route}.js`,'utf8'),/showProperties\(c\)/);
});
