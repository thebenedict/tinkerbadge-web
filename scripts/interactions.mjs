import {escapeHtml} from './content.mjs';

// Decorative sketches support the text; none is a working QR code or control.
const sketches={
  claim:'<path d="M3 12V4h8M29 4h8v8M37 28v8h-8M11 36H3v-8"/><path d="M9 10h7v7H9zM24 10h7v7h-7zM9 25h7v7H9zM24 25h3v3h4v4h-7z"/>',
  profile:'<rect x="6" y="3" width="28" height="34" rx="3"/><path d="M15 7h10M11 16h18M11 21h13M11 28h18"/>',
  role:'<rect x="3" y="8" width="34" height="24" rx="3"/><rect x="8" y="12" width="6" height="3" rx="1"/><rect x="17" y="12" width="6" height="3" rx="1"/><rect x="26" y="12" width="6" height="3" rx="1"/><path d="M10 22h20M10 26h12"/>',
  interests:'<rect x="3" y="8" width="34" height="24" rx="3"/><path d="M10 14h20M10 18h12"/><circle cx="8" cy="27" r="1"/><circle cx="14" cy="27" r="1"/><circle cx="20" cy="27" r="1"/><circle cx="26" cy="27" r="1"/><circle cx="32" cy="27" r="1"/>',
  connect:'<circle cx="10" cy="13" r="4"/><circle cx="30" cy="13" r="4"/><path d="M3 31v-5a7 7 0 0 1 14 0v5M23 31v-5a7 7 0 0 1 14 0v5M16 7h8M20 4l4 3-4 3"/>',
  make:'<rect x="3" y="6" width="22" height="28" rx="3"/><path d="M12 14l-4 5 4 5M17 14l4 5-4 5M29 18h8M33 14v8M9 30h10"/>',
  return:'<rect x="8" y="3" width="24" height="23" rx="3"/><path d="M16 8h8M20 15v20M15 30l5 5 5-5M4 31v6h32v-6"/>'
};
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
export function interactionExamples(section){
  if(section==null)return '';
  if(!nonempty(section.heading)||!nonempty(section.context)||!Array.isArray(section.items)||!section.items.length)throw new Error('Example interactions need a heading, context and items.');
  const items=section.items.map(item=>{
    if(!nonempty(item.title)||!nonempty(item.description)||!Object.hasOwn(sketches,item.visual)||(item.wide!==undefined&&typeof item.wide!=='boolean'))throw new Error('Each interaction needs text and a supported sketch.');
    return `<li class="interaction-example${item.wide?' interaction-example-wide':''}"><svg class="interaction-sketch" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">${sketches[item.visual]}</svg><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div></li>`;
  }).join('');
  return `<section class="interaction-examples" aria-labelledby="interactions-heading"><div class="interaction-heading"><h2 id="interactions-heading">${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.context)}</p></div><ul class="interaction-list" role="list">${items}</ul></section>`;
}
