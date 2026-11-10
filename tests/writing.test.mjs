import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
test('the project includes the requested writing guide and numbering rule',async()=>{const guide=await fs.readFile('docs/style_guide/writing.md','utf8');assert.match(guide,/Use straightforward, descriptive copy/);assert.match(guide,/Use numbering sparingly/);assert.match(guide,/Omit numbers when the visual layout/);});
test('viewer headings and navigation use descriptive labels',async()=>{const builder=await fs.readFile('scripts/build.mjs','utf8');for(const phrase of ['A little energy','A lot to explore','Every layer tells a story','tab-number','01 /','02 /','03 /'])assert.ok(!builder.includes(phrase),phrase);});

test('overview omits the requested duplicate header and introduction',async()=>{const builder=await fs.readFile('scripts/build.mjs','utf8'),features=await fs.readFile('scripts/features.mjs','utf8');assert.ok(!builder.includes('HARDWARE PROJECT'));assert.ok(!builder.includes('<em>hardware viewer</em>'));assert.ok(!builder.includes('Read the README'));assert.ok(!builder.includes('class="hero-actions"'));assert.ok(!builder.includes('class="hero-note"'));assert.ok(!features.includes('Select a label to highlight its location.'));assert.ok(!features.includes('esc(features.note)'));});

test('the source archive link uses the requested KiCad label',async()=>{const builder=await fs.readFile('scripts/build.mjs','utf8');assert.match(builder,/download>Download KiCad project/);assert.ok(!builder.includes('download>Native files'));});

test('overview renders approved presentation copy with a project fallback',async()=>{const builder=await fs.readFile('scripts/build.mjs','utf8');assert.match(builder,/presentation.tagline\?\?project.tagline/);assert.match(builder,/esc\(tagline\)/);});

test('feature preview omits the removed raised-display caption',async()=>{for(const file of ['scripts/features.mjs','src/features.js']){const source=await fs.readFile(file,'utf8');assert.ok(!source.includes('Display and accessory shapes are provisional.'));assert.ok(!source.includes('data-feature-view-note'));}});

test('header uses a compact wordmark and tabs, with the native download below the viewer',async()=>{
  const builder=await fs.readFile('scripts/build.mjs','utf8');
  const header=builder.slice(builder.indexOf('function header('),builder.indexOf('function nativeDownload('));
  assert.match(header,/project.name.replace/);assert.match(header,/toLowerCase/);assert.match(header,/nav\(route,variant,view\)/);
  assert.ok(!header.includes('Download KiCad project'));assert.ok(!header.includes('KICAD PROJECT VIEWER'));
  assert.match(builder,/modelCard\(route,variant\)\}\$\{nativeDownload\(route\)/);
  assert.match(builder,/id="project-title" class="visually-hidden"/);
});

test('landing product line matches the latest approved copy exactly',async()=>{const config=JSON.parse(await fs.readFile('config/presentation.json','utf8'));assert.equal(config.tagline,'Open hardware designed with agents, built for professional networking and ready to extend');});
