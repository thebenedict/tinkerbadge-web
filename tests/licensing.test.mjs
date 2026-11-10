import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const canonical={
  'CERN-OHL-P-2.0':'eeecc593866fa1c3b80189c7e3dc0ceb77740557fa92f81771f891cc54c579cb',
  'Apache-2.0':'074e6e32c86a4c0ef8b3ed25b721ca23aca83df277cd88106ef7177c354615ff',
  'CC-BY-4.0':'d557539df68e771cc1eedcc91d13f70fca930e508d11eedcafa4b15db49e3744',
  'CC-BY-SA-4.0':'cde7883b9050a1104f4ac19a1572aafd6e5d7323b68351aaf51fbf4beba54966',
};
test('project licenses retain the complete pinned SPDX texts',async()=>{
  for(const [id,expected] of Object.entries(canonical))assert.equal(sha(await fs.readFile(`LICENSES/${id}.txt`)),expected,id);
  assert.equal(sha(await fs.readFile('LICENSE')),canonical['Apache-2.0']);
});
test('package and lock metadata agree on the software SPDX identifier',async()=>{
  const pkg=JSON.parse(await fs.readFile('package.json','utf8')),lock=JSON.parse(await fs.readFile('package-lock.json','utf8'));
  assert.equal(pkg.license,'Apache-2.0');assert.equal(lock.packages[''].license,pkg.license);
});
test('native badge bundles allowlist project licenses and third-party notices',async()=>{
  const {snapshot}=JSON.parse(await fs.readFile('config/badge.json','utf8'));
  assert.ok(snapshot.documents.includes('LICENSE.md'));
  assert.ok(snapshot.documents.includes('docs/THIRD_PARTY_NOTICES.md'));
  assert.ok(snapshot.directories.includes('LICENSES'));
  assert.ok(snapshot.files.includes('LICENSE'));
});
test('dependency notices preserve the installed package notices verbatim',async()=>{
  for(const [source,copy] of [
    ['three/LICENSE','three.txt'],['@gltf-transform/core/LICENSE.md','gltf-transform-core.txt'],
    ['esbuild/LICENSE.md','esbuild.txt'],['marked/LICENSE.md','marked.txt'],['property-graph/LICENSE','property-graph.txt'],
  ])assert.deepEqual(await fs.readFile(`LICENSES/third-party/${copy}`),await fs.readFile(`node_modules/${source}`),source);
});
test('built site includes a licensing page and complete distributions',async()=>{
  const source=await fs.readFile('scripts/build.mjs','utf8');
  assert.match(source,/licensing\/index\.html/);
  assert.ok(source.includes("path.join(ROOT,'LICENSES'),path.join(licenseDir,'LICENSES')"));
  assert.ok(source.includes("for(const file of ['LICENSE','LICENSE.md'])"));
  assert.ok(source.includes("path.join(licenseDir,'docs/THIRD_PARTY_NOTICES.md')"));
});
