import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {featureAnchors} from '../src/feature-geometry.js';
import {escapeHtml as esc} from './content.mjs';

export async function loadFeatures({root,publicDir,manifest,variant}) {
  const configPath=path.join(root,'config/features',`${variant.id}.json`);
  let config;try{config=JSON.parse(await fs.readFile(configPath,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}
  if(config.schemaVersion!==1||config.variantId!==variant.id)throw new Error('Invalid feature configuration.');
  if(!variant.pcb)return null;
  const directory=path.dirname(config.renders),renderPath=path.resolve(publicDir,config.renders);
  if(!renderPath.startsWith(publicDir+path.sep))throw new Error('Feature render path must be inside public/.');
  let renders;try{renders=JSON.parse(await fs.readFile(renderPath,'utf8'));}catch(error){if(error.code==='ENOENT')throw new Error('Generate the feature renders before building this project.');throw error;}
  const nativeSource=variant.pcb.nativeUrl.slice(manifest.sourceBase.length);
  if(renders.schemaVersion!==1||renders.snapshotId!==manifest.snapshot.id||renders.boardSha256!==manifest.snapshot.sourceHashes[nativeSource])throw new Error('Feature renders do not match the current source snapshot. Regenerate them before building.');
  const ids=new Set(),files=[config.renders];
  const views=[],viewIds=new Set();
  for(const view of config.views){
    const render=renders.views.find(item=>item.id===view.id);
    if(!render||!/^[a-z][a-z0-9-]*$/.test(view.id)||viewIds.has(view.id)||!['front','back'].includes(view.side)||render.side!==view.side||!(render.width>0&&render.height>0)||path.basename(render.image)!==render.image)throw new Error('Invalid feature render or viewing side.');
    viewIds.add(view.id);
    const imageUrl=`${directory}/${render.image}`,bytes=await fs.readFile(path.join(publicDir,imageUrl));
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==render.sha256)throw new Error(`Feature image changed: ${imageUrl}`);
    if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==render.width||bytes.readUInt32BE(20)!==render.height)throw new Error(`Feature image dimensions do not match calibration: ${imageUrl}`);
    files.push(imageUrl);
    const features=view.features.map(feature=>{
      if(!/^[a-z][a-z0-9-]*$/.test(feature.id)||ids.has(feature.id)||!['left','right'].includes(feature.column))throw new Error('Invalid or duplicate feature label.');
      ids.add(feature.id);
      if(feature.sourceDocument&&!Object.hasOwn(manifest.snapshot.sourceHashes,feature.sourceDocument))throw new Error(`Feature source document is not in this snapshot: ${feature.id}`);
      const anchors=featureAnchors(feature,variant.pcb.components,view.side,render.pcbToImage,variant.pcb.accessories??[]);
      if(anchors.some(anchor=>anchor.pixel.some((value,index)=>value<0||value>[render.width,render.height][index])))throw new Error(`Feature anchor is outside the image: ${feature.id}`);
      return {...feature,anchors};
    });
    views.push({...view,...render,imageUrl,features});
  }
  return {...config,views,files};
}

export function featurePreview(features,href){
  const label=(feature,active)=>`<button class="feature-label${active?' is-active':''}" type="button" data-feature="${esc(feature.id)}" data-column="${feature.column}" aria-pressed="${active}"><strong>${esc(feature.title)}</strong><span>${esc(feature.description)}</span></button>`;
  return `<section class="feature-preview" id="model-poster" aria-labelledby="features-title"><div class="feature-heading"><div><h2 id="features-title">${esc(features.heading)}</h2></div><fieldset class="feature-views"><legend class="visually-hidden">Rendered board view</legend>${features.views.map((view,index)=>`<input class="visually-hidden" type="radio" id="feature-view-${view.id}" name="feature-view" value="${view.id}"${index?'':' checked'}><label for="feature-view-${view.id}">${esc(view.label)}</label>`).join('')}</fieldset></div>${features.views.map((view,index)=>`<figure class="feature-diagram" data-feature-view="${view.id}"${index?' hidden':''}><figcaption class="visually-hidden">${esc(view.description)}</figcaption><div class="feature-image"><img loading="${index?'lazy':'eager'}" src="${href(view.imageUrl)}?v=${view.sha256.slice(0,16)}" width="${view.width}" height="${view.height}" alt="${esc(view.description)} in the native KiCad render"><svg class="feature-dots" viewBox="0 0 ${view.width} ${view.height}" aria-hidden="true">${view.features.map((feature,index)=>`<g data-dots="${feature.id}"${index?'':' class="is-active"'}>${feature.anchors.map(anchor=>`<circle cx="${anchor.pixel[0]}" cy="${anchor.pixel[1]}" r="5"/>`).join('')}</g>`).join('')}</svg></div><svg class="feature-leaders" aria-hidden="true"></svg>${['left','right'].map(column=>`<div class="feature-labels feature-${column}">${view.features.filter(f=>f.column===column).map(feature=>label(feature,feature===view.features[0])).join('')}</div>`).join('')}<script type="application/json" class="feature-anchors">${JSON.stringify({width:view.width,height:view.height,features:view.features.map(f=>({id:f.id,anchors:f.anchors.map(a=>a.pixel)}))}).replace(/</g,'\\u003c')}</script></figure>`).join('')}<noscript><style>@layer base{.feature-diagram[hidden]{display:grid!important}}.feature-views{display:none}.feature-label{cursor:default}</style></noscript></section>`;
}
