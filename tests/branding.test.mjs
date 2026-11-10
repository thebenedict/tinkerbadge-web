import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {brandingFiles,loadBranding,faviconLinks} from '../scripts/branding.mjs';

test('approved branding images retain their expected dimensions and transparency',async()=>{
  for(const file of brandingFiles) {
    const bytes=await fs.readFile(`public/branding/${file}`);
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
    const dimensions=file==='wordmark.png'?[720,151]:file==='apple-touch-icon.png'?[180,180]:Array(2).fill(Number(file.match(/\d+/)[0]));
    assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],dimensions);
    assert.equal(bytes[25],6,'RGBA image');
  }
});
test('branding is fingerprinted, copied exactly, and linked relative to nested pages',async()=>{
  await fs.mkdir('.work',{recursive:true});
  const out=await fs.mkdtemp('.work/branding-test-');
  try {
    await fs.mkdir(path.join(out,'assets'));
    const branding=await loadBranding({root:process.cwd(),out,projectName:'Tinker Badge'});
    assert.equal(Object.keys(branding.hashes).length,5);
    for(const file of brandingFiles) {
      const source=await fs.readFile(`public/branding/${file}`),target=branding.files[file];
      assert.deepEqual(await fs.readFile(path.join(out,target)),source);
      assert.equal(branding.hashes[target],crypto.createHash('sha256').update(source).digest('hex'));
      assert.match(target,/assets\/[^/]+-[a-f0-9]{10}\.png$/);
    }
    for(const [route,prefix] of [['index.html','assets/'],['badge/pcb/index.html','../../assets/'],['docs/docs/spec.html','../../assets/']]) {
      const links=faviconLinks(route,branding);
      assert.equal((links.match(/<link /g)??[]).length,4);
      assert.ok(links.includes(`href="${prefix}`));
      for(const size of [16,32,48,180])assert.ok(links.includes(`sizes="${size}x${size}"`));
      assert.ok(!links.includes('favicon.svg'));
    }
  } finally {await fs.rm(out,{recursive:true,force:true});}
});
test('another project keeps its own generic identity',async()=>{
  assert.equal(await loadBranding({root:'.',out:'.',projectName:'Harvest'}),null);
  assert.match(faviconLinks('harvest/pcb/index.html',null),/\.\.\/\.\.\/assets\/favicon\.svg/);
});
