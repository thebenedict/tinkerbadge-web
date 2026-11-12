import {assemblyMode,assemblyUrl} from './enclosure-state.js';

export function enclosureControls(config,getViewer){
  const root=document.querySelector('#assembly-controls');if(!root)return null;
  const buttons=[...root.querySelectorAll('[data-assembly]')],slider=root.querySelector('#explode-distance');
  const explode=root.querySelector('#explode-control'),picker=root.querySelector('#enclosure-part');
  const description=root.querySelector('#part-description'),focus=root.querySelector('#focus-part');
  const download=root.querySelector('#part-download'),note=root.querySelector('#case-status');
  let mode=assemblyMode(new URL(location.href).searchParams.get('assembly'),config.defaultAssembly??'assembled');
  function update(next,save=false){
    mode=assemblyMode(next);buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.assembly===mode)));
    explode.hidden=mode!=='exploded';
    const accessories=document.querySelector('#show-accessories');if(accessories)accessories.checked=mode!=='board';
    if(save)history.replaceState(null,'',assemblyUrl(location.href,mode));
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{update(button.dataset.assembly,true);getViewer()?.setAssemblyMode(mode);}));
  slider.addEventListener('input',()=>{getViewer()?.setExplosion(slider.value/100);root.querySelector('#explode-value').value=slider.value+'%';});
  picker.addEventListener('change',()=>getViewer()?.selectPart(picker.value||null));
  focus.addEventListener('click',()=>getViewer()?.focusComponent());
  root.querySelectorAll('[data-part-visibility]').forEach(input=>input.addEventListener('change',()=>getViewer()?.setPartVisible(input.dataset.partVisibility,input.checked)));
  function select(id){
    const part=config.enclosure.parts.find(p=>p.id===id);picker.value=part?.id??'';
    description.textContent=part?part.description:'Click a case part or choose one to inspect it.';
    focus.disabled=!part;download.hidden=!part;if(part)download.href=part.stlUrl;
  }
  update(mode);
  return {get mode(){return mode;},update:next=>update(next,true),select,
    ready(error){root.querySelectorAll('[data-part-visibility]').forEach(input=>input.checked=true);slider.value=100;root.querySelector('#explode-value').value='100%';root.querySelectorAll('button,select,input').forEach(el=>el.disabled=Boolean(error));focus.disabled=true;
      note.textContent=error?'The enclosure could not load. The board is available; retry 3D to load the case.':'Clear plates, printed frame and removable supports. Fit prototype.';
      if(error)update('board');},
    reset(){root.querySelectorAll('button,select,input').forEach(el=>el.disabled=true);select(null);}};
}
