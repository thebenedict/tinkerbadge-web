import {escapeHtml} from './shared.js';
import {sourceMatchLabel} from './project-data.js';
import {safeDatasheetUrl} from './component-index.js';
import {componentLabel,componentOptionLabel} from './component-labels.js';

export function createInspector({viewer,url,pcbUrl,schematicUrl,onIndexLoaded=()=>{}}) {
  const panel=document.querySelector('#model-inspector'),select=document.querySelector('#model-component');
  const details=document.querySelector('#model-component-details'),status=document.querySelector('#component-status');
  const retry=document.querySelector('#retry-components'),focus=document.querySelector('#focus-component'),clear=document.querySelector('#clear-component');
  const lifetime=new AbortController();let request=null,index=null,disposed=false,generation=0;
  panel.hidden=false;
  select.addEventListener('change',()=>viewer.selectComponent(select.value||null),{signal:lifetime.signal});
  retry.addEventListener('click',load,{signal:lifetime.signal});
  focus.addEventListener('click',()=>viewer.focusComponent(),{signal:lifetime.signal});
  clear.addEventListener('click',()=>viewer.selectComponent(null),{signal:lifetime.signal});
  function showSelection(id) {
    if(disposed||!index)return;
    const component=index.components.find(c=>c.id===id);select.value=component?.id??'';
    focus.disabled=!component?.hasModel;clear.disabled=!component;
    if(!component){details.innerHTML=`<p class="component-prompt">${index.components.some(c=>c.hasModel)?'Click a component on the model, or choose one from the list.':'Choose a component to inspect its source details.'}</p>`;status.textContent='No component selected.';return;}
    const c=component,b=c.bom??{};
    const fields=[...(sourceMatchLabel(c)?[['Source match',sourceMatchLabel(c)]]:[]),['Value',c.value],['Part number',b.partNumber],['Manufacturer',b.manufacturer],['Footprint',c.footprint],[b.supplier?`${b.supplier} part`:'Supplier part',b.supplierPartNumber],['Side',c.layer==='F.Cu'?'Front':c.layer==='B.Cu'?'Back':c.layer],['Assembly',!b.included?'Excluded from BOM':b.dnp?'Do not populate':'Included in BOM'],['Quantity on board',b.quantity?String(b.quantity):''],['Nets',(c.nets??[]).join(', ')]];
    const pcb=pcbUrl?new URL(pcbUrl,location.href):null;pcb?.searchParams.set('ref',c.reference);
    const schematic=schematicUrl&&c.schematicSheetId?new URL(schematicUrl,location.href):null;schematic?.searchParams.set('ref',c.reference);if(schematic)schematic.searchParams.set('sheet',c.schematicSheetId);
    const datasheet=safeDatasheetUrl(b.datasheet);
    details.innerHTML=`<h3>${escapeHtml(c.reference)} <span>${escapeHtml(componentLabel(c))}</span></h3><dl class="model-properties">${fields.filter(([,v])=>v).map(([k,v])=>`<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>${c.hasModel?'':'<p class="component-prompt">This footprint has no separate 3D body.</p>'}<div class="component-links">${pcb?`<a href="${escapeHtml(pcb.href)}">View in PCB →</a>`:''}${schematic?`<a href="${escapeHtml(schematic.href)}">View in schematic →</a>`:''}${datasheet?`<a href="${escapeHtml(datasheet)}" target="_blank" rel="noopener noreferrer">Datasheet ↗</a>`:''}</div>`;
    status.textContent=`Selected ${componentOptionLabel(c)}.`;
  }
  async function load() {
    const token=++generation;request?.abort();request=new AbortController();const timer=setTimeout(()=>request?.abort(),30000);
    select.disabled=true;focus.disabled=true;clear.disabled=true;retry.hidden=true;
    details.innerHTML='<p class="component-prompt">Loading component details…</p>';status.textContent='Loading component details.';
    try {
      const response=await fetch(url,{signal:request.signal});if(!response.ok)throw new Error(`Component request returned ${response.status}`);
      const data=await response.json();if(disposed||token!==generation)return;
      viewer.setComponentIndex(data);index=data;onIndexLoaded(index);if(!index.components.length){panel.hidden=true;return;}
      select.replaceChildren(new Option('Choose a component',''));
      for(const c of index.components)select.add(new Option(`${componentOptionLabel(c)}${c.hasModel?'':' · no 3D body'}`,c.id));
      select.disabled=false;showSelection(null);
      document.querySelector('#component-count').textContent=`${index.components.filter(c=>c.hasModel).length} selectable models`;
    } catch(error) {
      if(disposed||token!==generation)return;
      details.innerHTML='<p class="component-prompt">Component details could not load. You can still rotate the board.</p>';retry.hidden=false;status.textContent='Component details unavailable.';console.warn('Component details unavailable:',error.message);
    } finally {clearTimeout(timer);}
  }
  load();
  return {showSelection,dispose(){disposed=true;generation++;request?.abort();lifetime.abort();panel.hidden=true;}};
}
