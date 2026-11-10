import {pageConfig} from './shared.js';
import {schematicSheetUrl} from './project-data.js';
import {svgElement,createPanZoom,loadImage,setupSearch,showProperties,setupStatus} from './drawing.js';
const config=pageConfig(), svg=document.querySelector('#drawing-svg'), selector=document.querySelector('#sheet-select');
let generation=0,current=0,pan=null,highlight=null;
const status=setupStatus(()=>openSheet(current));
async function openSheet(index){
  current=index;const token=++generation;const sheet=config.schematic.sheets[index];status.loading('Loading the KiCad schematic…');
  try{await loadImage(sheet.url);if(token!==generation)return;
    svg.replaceChildren();const[x,y,w,h]=sheet.viewBox;svg.append(svgElement('image',{href:sheet.url,x,y,width:w,height:h}));
    highlight=svgElement('rect',{class:'highlight',width:20,height:16,rx:1,visibility:'hidden'});svg.append(highlight);
    pan=createPanZoom(svg,sheet.viewBox,document.querySelector('#zoom-level'));
    document.querySelector('#drawing-title').textContent=sheet.name;document.querySelector('#sheet-path').textContent=sheet.hierarchy;document.querySelector('#sheet-download').href=sheet.url;document.querySelector('#drawing-detail').textContent=`${sheet.hierarchy} · Sheet ${index+1} of ${config.schematic.sheets.length}`;
    const ordered=[sheet,...config.schematic.sheets.filter(s=>s.id!==sheet.id)];
    const symbols=ordered.flatMap(s=>s.symbols.map(c=>({...c,sourceSheetId:s.id,sourceSheetName:s.name})));
    const counts=new Map();for(const symbol of symbols)counts.set(symbol.reference,(counts.get(symbol.reference)??0)+1);
    for(const symbol of symbols)if(counts.get(symbol.reference)>1)symbol.displayReference=`${symbol.reference} · unit ${symbol.unit??1}`;
    setupSearch(symbols,c=>{if(c.sourceSheetId!==sheet.id){const u=new URL(location.href);u.searchParams.set('sheet',c.sourceSheetId);u.searchParams.set('ref',c.reference);location.assign(u);return;}showProperties(c);highlight.setAttribute('x',c.x-10);highlight.setAttribute('y',c.y-8);highlight.setAttribute('visibility','visible');pan.focus(c.x,c.y,100);});
    status.done();
  }catch(error){if(token===generation){status.error();console.warn(error.message);}}
}
// Generated routes isolate sheets without preserving stale canvas state.
selector.addEventListener('change',()=>location.assign(schematicSheetUrl(location.href,selector.value)));
const query=new URL(location.href).searchParams,requested=query.get('sheet'),reference=query.get('ref');const found=config.schematic.sheets.findIndex(s=>s.id===requested);const inferred=reference?config.schematic.sheets.findIndex(s=>s.symbols.some(c=>c.reference===reference)):-1;const initial=Math.max(0,found>=0?found:inferred);selector.value=config.schematic.sheets[initial].id;openSheet(initial);
