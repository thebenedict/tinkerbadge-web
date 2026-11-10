import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {brandingPalette,contrastRatio} from '../scripts/branding-palette.mjs';
import {brandingFiles,loadBranding,faviconLinks} from '../scripts/branding.mjs';

test('approved branding images retain their expected dimensions and transparency',async()=>{
  for(const file of brandingFiles.filter(file=>file.endsWith('.png'))) {
    const bytes=await fs.readFile(`public/branding/${file}`);
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
    const dimensions=file==='apple-touch-icon.png'?[180,180]:Array(2).fill(Number(file.match(/\d+/)[0]));
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
    assert.equal(Object.keys(branding.hashes).length,9);
    for(const file of brandingFiles) {
      const source=await fs.readFile(`public/branding/${file}`),target=branding.files[file];
      assert.deepEqual(await fs.readFile(path.join(out,target)),source);
      assert.equal(branding.hashes[target],crypto.createHash('sha256').update(source).digest('hex'));
      assert.match(target,/assets\/[^/]+-[a-f0-9]{10}\.(png|svg)$/);
    }
    for(const [route,prefix] of [['index.html','assets/'],['badge/pcb/index.html','../../assets/'],['docs/docs/spec.html','../../assets/']]) {
      const links=faviconLinks(route,branding);
      assert.equal((links.match(/<link /g)??[]).length,8);
      assert.ok(links.includes(`href="${prefix}`));
      for(const size of [16,32,48,180])assert.ok(links.includes(`sizes="${size}x${size}"`));
      assert.ok(links.includes('type="image/svg+xml" sizes="any"'));
      assert.equal((links.match(/prefers-color-scheme: dark/g)??[]).length,3);
    }
  } finally {await fs.rm(out,{recursive:true,force:true});}
});
test('another project keeps its own generic identity',async()=>{
  assert.equal(await loadBranding({root:'.',out:'.',projectName:'Harvest'}),null);
  assert.match(faviconLinks('harvest/pcb/index.html',null),/\.\.\/\.\.\/assets\/favicon\.svg/);
});

test('green wordmark preserves the original artwork and uses an sRGB color-only transform',async()=>{
  const svg=await fs.readFile('public/branding/wordmark.svg','utf8');
  const original=await fs.readFile('public/branding/wordmark.png');
  assert.match(svg,/viewBox="0 0 720 151"/);
  assert.match(svg,/color-interpolation-filters="sRGB"/);
  assert.deepEqual(Buffer.from(svg.match(/base64,([^"]+)/)[1],'base64'),original);
});
test('green palette has strong contrast on the site and inside the badge',()=>{
  assert.ok(contrastRatio(brandingPalette.green,brandingPalette.paper)>7);
  assert.ok(contrastRatio(brandingPalette.green,brandingPalette.white)>8);
  assert.ok(contrastRatio(brandingPalette.keyline,brandingPalette.darkTab)>11);
});
test('vector favicon retains three lights, a shorter screen, and a dark-tab keyline',async()=>{
  const svg=await fs.readFile('public/branding/favicon.svg','utf8');
  assert.equal((svg.match(/<circle /g)??[]).length,3);
  assert.match(svg,/<rect x="4" y="17" width="24" height="5"/);
  assert.match(svg,/@media\(prefers-color-scheme:dark\)/);
  assert.match(svg,/stroke-width:2/);
});
function pngPixels(bytes) {
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),chunks=[];
  for(let offset=8;offset<bytes.length;) {
    const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
    if(type==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));
    offset+=length+12;
  }
  const raw=zlib.inflateSync(Buffer.concat(chunks)),stride=width*4,pixels=Buffer.alloc(height*stride);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++) {
    const filter=raw[y*(stride+1)];
    for(let x=0;x<stride;x++) {
      const a=x>=4?pixels[y*stride+x-4]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=4?pixels[(y-1)*stride+x-4]:0;
      const prediction=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];
      pixels[y*stride+x]=(raw[y*(stride+1)+1+x]+prediction)&255;
    }
  }
  return (x,y)=>Array.from(pixels.subarray((y*width+x)*4,(y*width+x+1)*4));
}
test('16 px and 32 px PNGs keep a solid green lower bezel and visible lights',async()=>{
  for(const size of [16,32])for(const theme of ['', 'dark-']) {
    const pixel=pngPixels(await fs.readFile(`public/branding/favicon-${theme}${size}.png`));
    const scale=size/32;
    assert.deepEqual(pixel(Math.floor(16*scale),Math.floor(23*scale)),[32,86,61,255]);
    assert.deepEqual(pixel(Math.floor(16*scale),Math.floor(24*scale)),[32,86,61,255]);
    for(const x of [9,16,23])assert.ok(pixel(Math.floor(x*scale),Math.floor(11.5*scale))[0]>210);
    if(theme)assert.ok(pixel(0,Math.floor(17*scale))[3]>0,'light keyline reaches the dark-tab edge');
  }
});
