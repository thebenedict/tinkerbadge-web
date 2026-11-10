import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {landingReadme,projectPresentation} from '../scripts/presentation.mjs';
test('landing README omits only the requested section and its subsections',()=>{
  const source='# Badge\n\nIntro.\n\n## Repeat the electrical check\nCommands.\n### Details\nMore.\n## Licensing\nKeep.\n';
  assert.equal(landingReadme(source,['Repeat the electrical check']),'# Badge\n\nIntro.\n\n## Licensing\nKeep.\n');
});
test('code and reference definitions are preserved outside an omitted section',()=>{
  const source='# Badge\n\n```\n## Repeat the electrical check\n```\n\n[ref]: docs/source.md\n\n## Repeat the electrical check\nRemove.\n';
  assert.equal(landingReadme(source,['Repeat the electrical check']),'# Badge\n\n```\n## Repeat the electrical check\n```\n\n[ref]: docs/source.md\n\n');
});
test('unmatched omissions and empty configuration leave source content intact',()=>{
  for(const sections of [[],['Absent']])assert.equal(landingReadme('# Badge\n\nIntro.\n',sections),'# Badge\n\nIntro.\n');
});
test('engineering instructions remain in the frozen source README',async()=>{
  const manifest=JSON.parse(await fs.readFile('public/data/manifest.json','utf8'));
  if(manifest.defaultVariant!=='badge')return;
  const source=await fs.readFile(`public/${manifest.readme.url}`,'utf8');
  assert.match(source,/## Repeat the electrical check/);
  assert.ok(!landingReadme(source,['Repeat the electrical check']).includes('python3 tools/check_schematic_contracts.py'));
  assert.match(landingReadme(source,['Repeat the electrical check']),/## Licensing/);
});

test('project-specific product copy never leaks into another imported project',()=>{const config={projectName:'Tinker Badge',tagline:'Badge copy',readmeOmitSections:['Checks']};assert.deepEqual(projectPresentation(config,'Tinker Badge'),config);assert.deepEqual(projectPresentation(config,'Harvest'),{});assert.deepEqual(projectPresentation(null,'Another board'),{});});
