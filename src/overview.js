import {pageConfig, formatBytes} from './shared.js';
import {setupFeatures} from './features.js';
import {readAccessoryChoice,saveAccessoryChoice} from './accessory-preference.js';
import {enclosureControls} from './enclosure-controls.js';
setupFeatures();
const config = pageConfig();
if(config.model) setupViewer();
function setupViewer() {
const button = document.querySelector('#load-model');
const status = document.querySelector('#model-status');
const poster = document.querySelector('#model-poster');
const host = document.querySelector('#model-host');
const controls = document.querySelectorAll('[data-camera]');
const accessoryToggle=document.querySelector('#show-accessories'),accessoryNote=document.querySelector('#accessory-note');
const accessoryNoteText=accessoryNote?.textContent??'';
function resetAccessories(){if(accessoryToggle)accessoryToggle.disabled=true;if(accessoryNote)accessoryNote.textContent=accessoryNoteText;}
const accessoryPreferenceKey=`viewer:accessories:${new URL(config.model.url,location.href).pathname}`;
if(accessoryToggle)accessoryToggle.checked=readAccessoryChoice(accessoryPreferenceKey);
accessoryToggle?.addEventListener('change',()=>{saveAccessoryChoice(accessoryPreferenceKey,accessoryToggle.checked);viewer?.setAccessoriesVisible(accessoryToggle.checked);});
let viewer = null, inspector = null, pending = null, loading = false, generation = 0;
const caseControls=enclosureControls(config,()=>viewer);
if(caseControls&&accessoryToggle)accessoryToggle.checked=caseControls.mode!=='board';
async function load() {
  if (loading || viewer) return;
  const token = ++generation; const loadAbort=new AbortController(); pending=loadAbort; loading = true; button.disabled = true;
  resetAccessories();caseControls?.reset();status.classList.remove('error'); status.textContent = `Loading the badge model (${formatBytes(config.model.bytes+(config.enclosure?.bytes??0))})…`;
  button.textContent = 'Loading 3D…';
  try {
    const [{createViewer},{createInspector}] = await Promise.all([import('./model.js'),import('./model-inspector.js')]);
    if(token!==generation)return;
    const instance = await createViewer(host, config.model.url, () => {
      if (token !== generation) return;
      generation++; loading=false; pending?.abort(); pending=null; inspector?.dispose(); inspector=null; viewer?.dispose(); viewer = null; poster.hidden = false; button.hidden = false; button.disabled = false;
      status.classList.add('error'); status.textContent = 'Graphics rendering stopped. Retry 3D or open the PCB drawing.'; button.textContent = 'Retry 3D';
      controls.forEach(b => b.disabled = true);if(accessoryToggle)accessoryToggle.disabled=true;
      caseControls?.reset();
    }, id => inspector?.showSelection(id), loadAbort.signal, {accessoriesVisible:accessoryToggle?.checked??false,
      enclosure:config.enclosure,assemblyMode:caseControls?.mode,onPartSelection:id=>caseControls?.select(id),onModeChange:mode=>caseControls?.update(mode)});
    if (token !== generation) { instance.dispose(); return; }
    viewer = instance; poster.hidden = true; button.hidden = true;
    caseControls?.ready(instance.enclosureError);
    if(instance.enclosureError){button.hidden=false;button.textContent='Retry case';}
    status.textContent = config.enclosure?'Switch views, click a part, or drag to orbit.':config.model.modeledFootprints?'Click a component for details. Drag to orbit.':'PCB model. Drag to orbit.';
    inspector=createInspector({viewer,url:config.model.componentsUrl,pcbUrl:config.pcbUrl,schematicUrl:config.schematicUrl,onIndexLoaded(index){if(accessoryToggle){const items=viewer.getAccessories(),missing=(index.accessories??[]).filter(a=>!items.some(item=>item.id===a.id));accessoryToggle.disabled=!items.length;viewer.setAccessoriesVisible(accessoryToggle.checked);if(accessoryNote)accessoryNote.textContent=items.length?accessoryNoteText+(missing.length?' Unavailable: '+missing.map(a=>a.label).join(', ')+'.':''):'Accessory geometry is unavailable in this interactive preview.';}}});
    controls.forEach(b => { b.disabled = false; b.setAttribute('aria-pressed', String(b.dataset.camera === 'reset')); });
  } catch (error) {
    if (token !== generation) return;
    host.replaceChildren(); poster.hidden = false; button.hidden = false; button.textContent = 'Retry 3D';
    status.classList.add('error'); status.textContent = 'The 3D model could not load. Retry, or open the PCB drawing.';
    console.warn('3D viewer unavailable:', error.message);
  } finally { if (token === generation) { loading = false; pending=null; button.disabled = false; } }
}
button.addEventListener('click',()=>{if(viewer?.enclosureError){inspector?.dispose();inspector=null;viewer.dispose();viewer=null;}load();});
controls.forEach(button => button.addEventListener('click', () => {
  viewer?.setCamera(button.dataset.camera);
  controls.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
window.addEventListener('pagehide', () => { generation++; pending?.abort(); pending=null; loading=false; inspector?.dispose(); inspector=null; viewer?.dispose(); viewer = null; });
window.addEventListener('pageshow', event => {
  if (event.persisted) { resetAccessories();caseControls?.reset();loading = false; poster.hidden = false; button.hidden = false; button.disabled = false; button.textContent = 'Explore in 3D'; status.classList.remove('error'); status.textContent='Load the model to rotate and inspect components.'; controls.forEach(b => {b.disabled=true;b.setAttribute('aria-pressed',String(b.dataset.camera==='reset'));}); }
});

}
