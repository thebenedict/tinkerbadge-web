export const assemblyModes=['assembled','board','exploded'];
export function assemblyMode(value,fallback='assembled'){return assemblyModes.includes(value)?value:fallback;}
export function explosionFraction(value){return Math.max(0,Math.min(1,Number(value)||0));}
export function partOffset(part,mode,fraction=1){return (part.explode_mm??[0,0,0]).map(n=>mode==='exploded'?n*.001*explosionFraction(fraction):0);}
export function assemblyUrl(current,mode){const url=new URL(current);url.searchParams.set('assembly',assemblyMode(mode));return url;}
