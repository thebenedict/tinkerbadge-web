import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {localHref} from './content.mjs';

export const brandingFiles=['wordmark.png','favicon-16.png','favicon-32.png','favicon-48.png','apple-touch-icon.png'];

export async function loadBranding({root,out,projectName}) {
  if(projectName!=='Tinker Badge')return null;
  const files={},hashes={};
  for(const file of brandingFiles) {
    const bytes=await fs.readFile(path.join(root,'public/branding',file));
    const hash=crypto.createHash('sha256').update(bytes).digest('hex');
    const target=`assets/${file.replace('.png',`-${hash.slice(0,10)}.png`)}`;
    await fs.writeFile(path.join(out,target),bytes);
    files[file]=target;hashes[target]=hash;
  }
  return {files,hashes};
}

export function faviconLinks(route,branding) {
  if(!branding)return `<link rel="icon" href="${localHref(route,'assets/favicon.svg')}" type="image/svg+xml">`;
  return [16,32,48].map(size=>`<link rel="icon" href="${localHref(route,branding.files[`favicon-${size}.png`])}" type="image/png" sizes="${size}x${size}">`).join('')+
    `<link rel="apple-touch-icon" href="${localHref(route,branding.files['apple-touch-icon.png'])}" sizes="180x180">`;
}
