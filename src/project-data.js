export function availableViews(variant) {
  return ['overview', ...(variant.schematic?.sheets?.length ? ['schematic'] : []), ...(variant.pcb?.layers?.length ? ['pcb'] : [])];
}
export function schematicCount(variant) {
  return new Set((variant.schematic?.sheets??[]).flatMap(sheet=>sheet.symbols.map(s=>s.reference))).size;
}
export function projectFacts(variant) {
  const facts=[],pcb=variant.pcb;
  if(pcb&&Number.isFinite(pcb.widthMm)&&Number.isFinite(pcb.heightMm))facts.push({label:'Board footprint',value:`${Number(pcb.widthMm.toFixed(2))} × ${Number(pcb.heightMm.toFixed(2))}`,unit:'mm'});
  if(pcb)facts.push({label:'Copper layers',value:pcb.copperLayers.length,unit:`${pcb.thicknessMm} mm PCB`});
  if(variant.schematic)facts.push({label:'Schematic sheets',value:variant.schematic.sheets.length,unit:`${schematicCount(variant)} components`});
  if(pcb)facts.push({label:'Placed footprints',value:pcb.components.length+(pcb.accessories?.length??0),unit:variant.model?`${variant.model.modeledFootprints} modeled`:''});
  return [...facts,...(variant.facts??[])];
}

export function sourceMatchLabel(component) {
  if(component.sourceDifferences?.length)return 'PCB and schematic differ';
  return {'board-only':'Board-only footprint','pcb-only':'No schematic match',conflict:'Conflicting schematic match',unverified:'Unverified source match'}[component.identityStatus]??'';
}

export function schematicSheetUrl(currentUrl,sheetId) {
  const url=new URL(currentUrl);url.searchParams.set('sheet',sheetId);url.searchParams.delete('ref');url.searchParams.delete('unit');return url;
}
export function boardDimensions(pcb) {
  return pcb&&Number.isFinite(pcb.widthMm)&&Number.isFinite(pcb.heightMm)?`${Number(pcb.widthMm.toFixed(2))} × ${Number(pcb.heightMm.toFixed(2))}`:null;
}
