import {mirroredViewBox} from './drawing-geometry.js';
import {componentName,componentLabel,componentSearchText,componentSecondaryLabel} from './component-labels.js';
const NS='http://www.w3.org/2000/svg';
export function svgElement(name, attrs={}) { const el=document.createElementNS(NS,name); for(const[k,v]of Object.entries(attrs))el.setAttribute(k,String(v));return el; }
export function createPanZoom(svg, bounds, zoomLabel) {
  let box=[...bounds]; let drag=null; const points=new Map();let pinch=null;
  function commit(){svg.setAttribute('viewBox',box.join(' '));if(zoomLabel)zoomLabel.textContent=`${Math.round(bounds[2]/box[2]*100)}%`;}
  function reset(){box=[...bounds];commit();}
  function point(event){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
  function zoom(factor,at){const ratio=box[2]/bounds[2];const next=Math.min(4,Math.max(.025,ratio*factor));factor=next/ratio;at??={x:box[0]+box[2]/2,y:box[1]+box[3]/2};box=[at.x+(box[0]-at.x)*factor,at.y+(box[1]-at.y)*factor,box[2]*factor,box[3]*factor];commit();}
  function focus(x,y,width){const aspect=bounds[3]/bounds[2];box=[x-width/2,y-width*aspect/2,width,width*aspect];commit();svg.focus({preventScroll:true});}
  svg.addEventListener('wheel',event=>{event.preventDefault();zoom(Math.exp(Math.max(-100,Math.min(100,event.deltaY))*.004),point(event));},{passive:false});
  svg.addEventListener('pointerdown',event=>{if(event.button!==0)return;svg.focus({preventScroll:true});svg.setPointerCapture(event.pointerId);points.set(event.pointerId,{x:event.clientX,y:event.clientY});drag={x:event.clientX,y:event.clientY,box:[...box]};if(points.size===2){const[a,b]=[...points.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
  svg.addEventListener('pointermove',event=>{
    if(!points.has(event.pointerId))return;points.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(points.size===2){const[a,b]=[...points.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch&&d)zoom(pinch/d);pinch=d;drag=null;return;}
    if(!drag)return;
    const rect=svg.getBoundingClientRect(),scale=Math.max(box[2]/rect.width,box[3]/rect.height);
    box[0]=drag.box[0]-(event.clientX-drag.x)*scale;box[1]=drag.box[1]-(event.clientY-drag.y)*scale;commit();
  });
  const end=event=>{points.delete(event.pointerId);drag=null;pinch=null;};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);
  svg.addEventListener('keydown',event=>{if(!['+','=','-','0','Home','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();if(event.key==='+'||event.key==='=')zoom(.8);else if(event.key==='-')zoom(1.25);else if(event.key==='0'||event.key==='Home')reset();else{const step=box[2]*.08;if(event.key==='ArrowLeft')box[0]-=step;if(event.key==='ArrowRight')box[0]+=step;if(event.key==='ArrowUp')box[1]-=step;if(event.key==='ArrowDown')box[1]+=step;commit();}});
  document.querySelector('#zoom-in').addEventListener('click',()=>zoom(.8));document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1.25));document.querySelector('#fit-view').addEventListener('click',reset);
  reset();return {reset,zoom,focus,mirrorX(axis){box=mirroredViewBox(box,axis);commit();},getBox:()=>[...box]};
}
export function loadImage(url) {
  return new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.onload=null;img.onerror=null;reject(new Error('Drawing request timed out'));},20000);img.onload=()=>{clearTimeout(timer);resolve(url);};img.onerror=()=>{clearTimeout(timer);reject(new Error('Drawing could not be loaded'));};img.src=url;});
}
export function setupSearch(components,select) {
  const field=document.querySelector('#reference-search'),list=document.querySelector('#component-list');
  function render(){
    const q=field.value.trim().toLowerCase(),matches=components.filter(c=>componentSearchText(c).includes(q));
    list.replaceChildren();
    for(const c of matches){
      const button=document.createElement('button'),reference=document.createElement('span'),body=document.createElement('span'),title=document.createElement('strong');
      reference.className='component-result-reference';reference.textContent=c.displayReference??c.reference;
      body.className='component-result-text';title.textContent=componentLabel(c);body.append(title);
      const secondary=componentSecondaryLabel(c);if(secondary){const detail=document.createElement('small');detail.textContent=secondary;body.append(detail);}
      button.append(reference,body);button.type='button';button.dataset.reference=c.reference;
      button.addEventListener('click',()=>{list.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');select(c);});list.append(button);
    }
    if(!matches.length){const p=document.createElement('p');p.textContent='No matching components.';list.append(p);}
  }
  field.addEventListener('input',render);field.addEventListener('keydown',e=>{if(e.key==='Enter')list.querySelector('button')?.click();});const requested=new URL(location.href).searchParams.get('ref');if(requested&&components.some(c=>c.reference===requested))field.value=requested;render();if(requested){const target=[...list.querySelectorAll('button')].find(b=>b.dataset.reference===requested);target?.click();}return render;
}
export function showProperties(component) {
  const box=document.querySelector('#properties');box.replaceChildren();
  if(componentName(component)){const heading=document.createElement('h3');heading.className='component-name';heading.textContent=componentName(component);box.append(heading);}
  const data={Reference:component.reference,Value:component.value,...(component.unit&&component.unit!=='1'?{Unit:component.unit}:{}),...(component.footprint?{Footprint:component.footprint}:{}),...(component.layer?{Side:component.layer}:{}),...(component.nets?.length?{Nets:component.nets.join(', ')}:{}),...component.properties};
  const dl=document.createElement('dl');dl.className='component-properties';for(const[k,v]of Object.entries(data)){if(!v)continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;dl.append(dt,dd);}box.append(dl);
}
export function setupStatus(retry) {
  const overlay=document.querySelector('#drawing-loading'),message=document.querySelector('#drawing-message'),button=document.querySelector('#retry-drawing');button.addEventListener('click',retry);
  return {loading(text){overlay.hidden=false;button.hidden=true;message.textContent=text;},done(){overlay.hidden=true;},error(){overlay.hidden=false;button.hidden=false;message.textContent='The drawing could not load. Retry, or download the native files and exports above.';}};
}
