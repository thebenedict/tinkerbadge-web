import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {localHref} from './content.mjs';

export const brandingFiles=['wordmark.svg','favicon.svg','favicon-16.png','favicon-32.png','favicon-48.png','favicon-dark-16.png','favicon-dark-32.png','favicon-dark-48.png','apple-touch-icon.png'];

export async function loadBranding({root,out,projectName}) {
  if(projectName!=='Tinker Badge')return null;
  const files={},hashes={};
  for(const file of brandingFiles) {
    const bytes=await fs.readFile(path.join(root,'public/branding',file));
    const hash=crypto.createHash('sha256').update(bytes).digest('hex');
    const extension=path.extname(file);
    const target=`assets/${file.slice(0,-extension.length)}-${hash.slice(0,10)}${extension}`;
    await fs.writeFile(path.join(out,target),bytes);
    files[file]=target;hashes[target]=hash;
  }
  return {files,hashes};
}

export function faviconLinks(route,branding) {
  if(!branding)return `<link rel="icon" href="${localHref(route,'assets/favicon.svg')}" type="image/svg+xml">`;
  return ['', 'dark-'].flatMap(theme=>[16,32,48].map(size=>`<link rel="icon" href="${localHref(route,branding.files[`favicon-${theme}${size}.png`])}" type="image/png" sizes="${size}x${size}"${theme?' media="(prefers-color-scheme: dark)"':''}>`)).join('')+
    `<link rel="icon" href="${localHref(route,branding.files['favicon.svg'])}" type="image/svg+xml" sizes="any">`+
    `<link rel="apple-touch-icon" href="${localHref(route,branding.files['apple-touch-icon.png'])}" sizes="180x180">`;
}
