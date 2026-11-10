import {pageConfig} from './shared.js';
import {svgElement,createPanZoom,loadImage,setupSearch,showProperties,setupStatus} from './drawing.js';
const config=pageConfig(),svg=document.querySelector('#drawing-svg'),bounds=config.pcb.viewBox;
const group=svgElement('g');svg.append(group);const highlight=svgElement('circle',{class:'highlight',r:2.3,visibility:'hidden'});
const pan=createPanZoom(svg,bounds,document.querySelector('#zoom-level'));
const loaded=new Map(),pending=new Map(),images=new Map();let generation=0,back=false;
for(const layer of config.pcb.layers){const[x,y,w,h]=bounds;const image=svgElement('image',{x,y,width:w,height:h,visibility:'hidden'});images.set(layer.id,image);group.append(image);}group.append(highlight);
const status=setupStatus(refresh);
async function refresh(){const token=++generation;const selected=[...document.querySelectorAll('[data-layer]:checked')].map(x=>x.dataset.layer);status.loading('Loading the selected KiCad layers…');
  try{await Promise.all(selected.map(async id=>{if(loaded.has(id))return;if(!pending.has(id)){const layer=config.pcb.layers.find(l=>l.id===id);pending.set(id,loadImage(layer.url).then(()=>{loaded.set(id,true);images.get(id).setAttribute('href',layer.url);}).finally(()=>pending.delete(id)));}await pending.get(id);}));
    if(token!==generation)return;for(const[id,image]of images)image.setAttribute('visibility',selected.includes(id)?'visible':'hidden');status.done();document.querySelector('#layer-count').textContent=`${selected.length} layers visible`;
  }catch(error){if(token===generation){status.error();console.warn(error.message);}}
}
document.querySelectorAll('[data-layer]').forEach(input=>input.addEventListener('change',refresh));
document.querySelectorAll('[data-side]').forEach(button=>button.addEventListener('click',()=>{const nextBack=button.dataset.side==='back';if(nextBack!==back)pan.mirrorX(bounds[0]+bounds[2]/2);back=nextBack;group.setAttribute('transform',back?`translate(${2*bounds[0]+bounds[2]}, 0) scale(-1, 1)`:'');document.querySelectorAll('[data-side]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('#drawing-detail').textContent=back?'Back view · mirrored left to right · layers unchanged':'Front view · unmirrored · layers unchanged';}));
document.querySelector('#front-preset').addEventListener('click',()=>preset(['F.Cu','F.SilkS','Edge.Cuts']));
document.querySelector('#back-preset').addEventListener('click',()=>preset(['B.Cu','B.SilkS','Edge.Cuts']));
function preset(ids){document.querySelectorAll('[data-layer]').forEach(i=>i.checked=ids.includes(i.dataset.layer));refresh();}
setupSearch(config.pcb.components,c=>{showProperties(c);highlight.setAttribute('cx',c.x);highlight.setAttribute('cy',c.y);highlight.setAttribute('visibility','visible');const x=back?2*bounds[0]+bounds[2]-c.x:c.x;pan.focus(x,c.y,Math.min(22,bounds[2]));});
refresh();
