// Names are exported from reviewed source descriptions. Never infer a circuit
// role in the browser from a reference prefix or a shared part number.
const clean=value=>typeof value==='string'?value.trim():'';
export function componentName(component) { return clean(component.displayName); }
export function componentLabel(component) {
  return componentName(component)||clean(component.value)||component.reference;
}
export function componentOptionLabel(component) {
  const parts=[component.reference,componentName(component),clean(component.value)];
  return [...new Set(parts.filter(Boolean))].join(' · ');
}
export function componentSearchText(component) {
  return [component.reference,component.value,componentName(component),component.bom?.partNumber,
    component.properties?.MPN,component.properties?.ManufacturerPartNumber,
    ...(component.nets??[]),component.sourceSheetName].filter(Boolean).join(' ').toLowerCase();
}
export function componentSecondaryLabel(component) {
  return [componentName(component)&&component.value!==componentName(component)?component.value:'',component.sourceSheetName].filter(Boolean).join(' · ');
}
