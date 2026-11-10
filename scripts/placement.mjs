import {escapeHtml} from './content.mjs';

export function placementNote(variant,schematicHref) {
  const count=variant.pcb?variant.schematic?.population?.unplacedReferences?.length??0:0;
  if(!count)return '';
  return `<p class="view-note placement-note" role="note">${count} schematic component${count===1?' is':'s are'} not yet placed on this PCB. ${count===1?'Its symbol remains':'Their symbols remain'} available in the <a href="${escapeHtml(schematicHref)}">schematic viewer</a>.</p>`;
}
