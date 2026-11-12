import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SHA256=/^[a-f0-9]{64}$/;
const SNAPSHOT=/^[a-f0-9]{12}$/;

export function validatePublication(manifest,info,expectedSnapshot) {
  const errors=[];
  if(!SNAPSHOT.test(expectedSnapshot??''))errors.push('Supply the exact reviewed 12-character snapshot ID with --snapshot.');
  if(manifest.schemaVersion!==2)errors.push('Unsupported manifest schema.');
  if(manifest.project?.name!=='Tinker Badge')errors.push('The publication bundle must be Tinker Badge, not a sample project.');
  if(manifest.defaultVariant!=='badge'||manifest.variants?.length!==1||manifest.variants[0]?.id!=='badge')errors.push('The publication bundle must contain the badge variant only.');
  if(manifest.snapshot?.id!==expectedSnapshot)errors.push('The active snapshot differs from the reviewed snapshot.');
  if(info.snapshot!==manifest.snapshot?.id||info.project!==manifest.project?.name)errors.push('Build metadata does not match the active manifest.');
  for(const field of ['sourceHashes','outputHashes','pipelineHashes']) {
    const hashes=manifest.snapshot?.[field];
    if(!hashes||!Object.keys(hashes).length||Object.values(hashes).some(hash=>!SHA256.test(hash)))errors.push(`Missing or invalid ${field}.`);
  }
  if(!manifest.snapshot?.toolVersions?.kicad)errors.push('The KiCad export version is missing.');
  if(!/^[a-f0-9]{40}$/.test(manifest.snapshot?.sourceCommit??''))errors.push('A verified hardware source commit is required.');
  const boardHash=manifest.snapshot?.sourceHashes?.['tinkerbadge.kicad_pcb'];
  const variant=manifest.variants?.[0];
  if(!SHA256.test(boardHash??'')||variant?.enclosure?.board_sha256!==boardHash||variant?.verification?.boardSha256!==boardHash)errors.push('PCB, enclosure and verification revisions must match.');
  return errors;
}

export function validatePublishPath(relative) {
  return !relative.split('/').some(part=>part.startsWith('.')) && !/^(node_modules|\.work|config|tests|scripts)(\/|$)/.test(relative);
}

async function main() {
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--snapshot')throw new Error('Usage: node scripts/check-publish.mjs --snapshot <reviewed-snapshot-id>');
  const dist=path.join(ROOT,'dist');
  const manifest=JSON.parse(await fs.readFile(path.join(dist,'data/manifest.json'),'utf8'));
  const info=JSON.parse(await fs.readFile(path.join(dist,'build-info.json'),'utf8'));
  const errors=validatePublication(manifest,info,args[1]);
  if(errors.length)throw new Error(errors.join('\n'));
  // npm run check verifies every exported artifact hash and local link first.
  let bytes=0,files=0;
  async function visit(directory) {
    for(const name of await fs.readdir(directory)) {
      const full=path.join(directory,name),relative=path.relative(dist,full).split(path.sep).join('/');
      const stat=await fs.lstat(full);
      if(stat.isSymbolicLink()||!validatePublishPath(relative))throw new Error(`Do not publish unexpected path: ${relative}`);
      if(stat.isDirectory())await visit(full);
      else if(stat.isFile()){bytes+=stat.size;files++;}
      else throw new Error(`Unsupported artifact type: ${relative}`);
    }
  }
  await visit(dist);
  if(bytes>=1_000_000_000)throw new Error('The static bundle exceeds the 1 GB GitHub Pages budget.');
  const webCommit=process.env.GITHUB_SHA??null;
  if(webCommit&&!/^[a-f0-9]{40}$/.test(webCommit))throw new Error('Invalid GITHUB_SHA.');
  const provenance={schemaVersion:1,project:manifest.project.name,snapshot:manifest.snapshot.id,
    webCommit,hardwareCommit:manifest.snapshot.sourceCommit??null,
    manifestSha256:crypto.createHash('sha256').update(await fs.readFile(path.join(dist,'data/manifest.json'))).digest('hex'),
    sourceHashes:manifest.snapshot.sourceHashes,exportToolVersions:manifest.snapshot.toolVersions,
    exportPipelineHashes:manifest.snapshot.pipelineHashes,node:process.versions.node,
    bundleFiles:files,bundleBytes:bytes};
  await fs.writeFile(path.join(dist,'release.json'),JSON.stringify(provenance,null,2)+'\n');
  console.log(`Publication checks passed for ${manifest.project.name}, snapshot ${manifest.snapshot.id}: ${files} files, ${bytes} bytes.`);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
