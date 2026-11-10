import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {interactionExamples} from '../scripts/interactions.mjs';
import {projectPresentation} from '../scripts/presentation.mjs';
const presentation=JSON.parse(await fs.readFile('config/presentation.json','utf8'));
const section=presentation.exampleInteractions;

test('homepage examples preserve the requested meetup flow and opt-in boundary',()=>{
  const html=interactionExamples(section);
  assert.equal(section.items.length,7);
  for(const text of ['Example interactions','Proposed meetup flow','QR code','name and affiliation','AIT profile','speaker, sponsor, organizer or attendee','Affinity lights along the bottom','similar colors','Opt in to BLE and IR conversation detection','intentional badge tap','exchange contact details','end of the night to check out','buy your own for experiments','Speakers could receive one as a gift','Make something new','custom firmware','Qwiic or SAO'])assert.ok(html.includes(text),text);
  assert.equal((html.match(/<li class="interaction-example(?: interaction-example-wide)?">/g)??[]).length,7);
  assert.equal(section.items.at(-1).title,'Make something new');
  assert.equal(section.items.at(-1).wide,true);
  assert.doesNotMatch(html,/<ol|\b0[1-6]\s|<button|<script|<a\s/);
});
test('examples use semantic static text and decorative sketches, without script dependence',()=>{
  const html=interactionExamples(section);
  assert.match(html,/<section class="interaction-examples" aria-labelledby="interactions-heading">/);
  assert.match(html,/<h2 id="interactions-heading">Example interactions<\/h2>/);
  assert.match(html,/<ul class="interaction-list" role="list">/);
  assert.equal((html.match(/aria-hidden="true" focusable="false"/g)??[]).length,7);
  assert.equal((html.match(/<h3>/g)??[]).length,7);
});
test('optional project-scoped examples do not leak into another imported board',()=>{
  assert.equal(interactionExamples(undefined),'');
  assert.equal(interactionExamples(projectPresentation(presentation,'Harvest').exampleInteractions),'');
  assert.ok(interactionExamples(projectPresentation(presentation,'Tinker Badge').exampleInteractions));
});
test('example text is escaped and invalid content fails the build',()=>{
  const html=interactionExamples({heading:'<title>',context:'<context>',items:[{visual:'claim',title:'<img src=x>',description:'<script>alert(1)</script>'}]});
  assert.ok(html.includes('&lt;title&gt;'));
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.doesNotMatch(html,/<script|<img/);
  for(const invalid of [{}, {...section,items:[]}, {...section,items:[{visual:'other',title:'Title',description:'Text'}]}, {...section,items:[{visual:'claim',title:'',description:'Text'}]}])assert.throws(()=>interactionExamples(invalid));
});
test('the overview places examples below the model and before the technical README',async()=>{
  const source=await fs.readFile('scripts/build.mjs','utf8');
  const overview=source.slice(source.indexOf('async function overview('),source.indexOf('function drawingArea('));
  assert.ok(overview.indexOf('${nativeDownload(route)}')<overview.indexOf('${interactionExamples(presentation.exampleInteractions)}'));
  assert.ok(overview.indexOf('${interactionExamples(presentation.exampleInteractions)}')<overview.indexOf('id="readme"'));
});

test('example labels meet normal-text contrast and narrow viewports have no body width floor',async()=>{
  const css=await fs.readFile('src/style.css','utf8');
  const foreground=css.match(/\.interaction-heading p\{[^}]*color:(#[0-9a-f]{6})/)[1];
  const background=css.match(/--paper:(#[0-9a-f]{6})/)[1];
  const luminance=hex=>hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  const values=[luminance(foreground),luminance(background)].sort((a,b)=>a-b);
  assert.ok((values[1]+.05)/(values[0]+.05)>=4.5);
  assert.match(css,/body\{min-width:0\}/);
});
