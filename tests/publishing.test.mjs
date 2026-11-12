import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublication,validatePublishPath} from '../scripts/check-publish.mjs';
const snapshot='123456abcdef';
function bundle(){return {schemaVersion:2,project:{name:'Tinker Badge'},defaultVariant:'badge',variants:[{id:'badge',enclosure:{board_sha256:'d'.repeat(64)},verification:{boardSha256:'d'.repeat(64)}}],snapshot:{id:snapshot,sourceCommit:'e'.repeat(40),sourceHashes:{'tinkerbadge.kicad_pcb':'d'.repeat(64),'README.md':'a'.repeat(64)},outputHashes:{'source/README.md':'b'.repeat(64)},pipelineHashes:{'scripts/export_assets.py':'c'.repeat(64)},toolVersions:{kicad:'10.0.8'}}};}
function info(){return {snapshot,project:'Tinker Badge'};}
test('publication accepts a reviewed badge snapshot',()=>assert.deepEqual(validatePublication(bundle(),info(),snapshot),[]));
test('publication rejects a sample project',()=>{const m=bundle();m.project.name='HARVEST';assert.match(validatePublication(m,info(),snapshot).join(),/sample project/);});
test('publication rejects wrong, missing, or malformed snapshot IDs',()=>{for(const id of ['',null,'123','fedcba654321','$(echo unsafe)'])assert.ok(validatePublication(bundle(),info(),id).length);});
test('publication rejects mixed variants and stale builds',()=>{const m=bundle();m.variants.push({id:'A'});assert.match(validatePublication(m,{snapshot:'000000000000',project:'other'},snapshot).join(),/badge variant only/);assert.match(validatePublication(m,{snapshot:'000000000000',project:'other'},snapshot).join(),/metadata/);});
test('publication requires source, output, and pipeline hashes',()=>{for(const key of ['sourceHashes','outputHashes','pipelineHashes']){const m=bundle();m.snapshot[key]={bad:'unknown'};assert.match(validatePublication(m,info(),snapshot).join(),new RegExp(key));}});
test('publication excludes hidden and development paths',()=>{for(const name of ['.git/config','data/.env','node_modules/a.js','.work/build','scripts/build.mjs'])assert.equal(validatePublishPath(name),false,name);for(const name of ['index.html','assets/site.js','data/snapshots/a/source/README.md'])assert.equal(validatePublishPath(name),true,name);});

test('publication rejects missing commits and mismatched enclosure revisions',()=>{const m=bundle();m.snapshot.sourceCommit=null;assert.match(validatePublication(m,info(),snapshot).join(),/source commit/);m.variants[0].enclosure.board_sha256='f'.repeat(64);assert.match(validatePublication(m,info(),snapshot).join(),/revisions must match/);});
