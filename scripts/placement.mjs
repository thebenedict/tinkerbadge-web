import {escapeHtml} from './content.mjs';

const countValue=(value,name)=>{
  if(!Number.isSafeInteger(value)||value<0)throw new Error(`Invalid PCB ${name} count.`);
  return value;
};
export function placementNote(variant,schematicHref) {
  if(!variant.pcb)return '';
  const routing=variant.pcb.routing;
  const unplaced=variant.schematic?.population?.unplacedReferences;
  const unconnected=routing?countValue(routing.unconnectedItems,'unconnected item'):0;
  const missing=routing?countValue(routing.missingFootprints,'missing footprint'):0;
  if(routing&&Array.isArray(unplaced)&&missing!==unplaced.length)throw new Error('PCB missing-footprint report does not match schematic population.');
  const count=unplaced?.length??missing;
  if(!count&&!unconnected)return '';
  const sentences=[];
  if(unconnected)sentences.push(`KiCad reports ${unconnected} unconnected item${unconnected===1?'':'s'}.`);
  if(count){
    sentences.push(`${count} schematic component${count===1?' is':'s are'} not yet placed on this PCB.`);
    if(variant.schematic&&schematicHref)sentences.push(`${count===1?'Its symbol remains':'Their symbols remain'} available in the <a href="${escapeHtml(schematicHref)}">schematic viewer</a>.`);
  }
  return `<p class="view-note placement-note" role="note">${sentences.join(' ')}</p>`;
}
