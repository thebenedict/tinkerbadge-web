import test from 'node:test';
import assert from 'node:assert/strict';
import {Marked} from 'marked';
import {markdownRenderer,localHref} from '../scripts/content.mjs';
function render(md){return new Marked({renderer:markdownRenderer({sourceRel:'README.md',pageRoute:'B/pcb/index.html',sourceFiles:new Set(['README.md','docs/review.md','board.kicad_pcb']),sourceBase:'data/source/',nativeArchive:'data/native.zip'})}).parse(md);}
test('build-time Markdown escapes raw HTML',()=>{const html=render('<script>alert(1)</script>');assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);});
test('unsafe link protocols cannot become executable links',()=>{assert.ok(!render('[bad](javascript:alert%281%29)').includes('href="javascript:'));assert.ok(!render('[bad](data:text/html,hello)').includes('href="data:'));});
test('external image requests are not generated',()=>{assert.ok(!render('![remote](https://example.com/tracker.png)').includes('<img'));});
test('Markdown documents route through rendered local pages',()=>{assert.match(render('[review](docs/review.md)'),/href="\.\.\/\.\.\/docs\/docs\/review.html"/);});
test('unbundled local references are deliberately non-links',()=>{assert.match(render('[not included](private.txt)'),/not-bundled/);assert.ok(!render('[not included](private.txt)').includes('href='));});
test('paths work below a static host subpath',()=>{assert.equal(localHref('B/pcb/index.html','assets/pcb.js'),'../../assets/pcb.js');assert.equal(localHref('index.html','B/pcb/index.html'),'B/pcb/index.html');});
test('source-file links point to exact bundled inputs',()=>{assert.match(render('[PCB](board.kicad_pcb)'),/\.\.\/\.\.\/data\/source\/board.kicad_pcb/);});
