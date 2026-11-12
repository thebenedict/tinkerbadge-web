import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Marked} from 'marked';
import {markdownRenderer,escapeHtml,localHref} from './content.mjs';
import {availableViews,projectFacts,boardDimensions} from '../src/project-data.js';
import {loadFeatures,featurePreview} from './features.mjs';
import {placementNote} from './placement.mjs';
import {landingReadme,projectPresentation} from './presentation.mjs';
import {interactionExamples} from './interactions.mjs';
import {loadBranding,faviconLinks} from './branding.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PUBLIC=path.resolve(ROOT,process.env.VIEWER_PUBLIC??'public'),FINAL=path.resolve(ROOT,process.env.VIEWER_DIST??'dist');
if(!PUBLIC.startsWith(ROOT+path.sep)||!FINAL.startsWith(ROOT+path.sep)||FINAL===PUBLIC||PUBLIC.startsWith(FINAL+path.sep))throw new Error('Viewer input and output directories must be separate directories inside this project.');
await fs.mkdir(path.join(ROOT,'.work'),{recursive:true});
const OUT=await fs.mkdtemp(path.join(ROOT,'.work','site-build-'));
const manifest=JSON.parse(await fs.readFile(path.join(PUBLIC,'data/manifest.json'),'utf8'));
if(manifest.schemaVersion!==2)throw new Error('Export a project with the current metadata schema before building.');
const project=manifest.project;
const presentation=projectPresentation(JSON.parse(await fs.readFile(path.join(ROOT,'config/presentation.json'),'utf8')),project.name);
const featureSets=new Map(),featureHashes={};
for(const variant of manifest.variants){const features=await loadFeatures({root:ROOT,publicDir:PUBLIC,manifest,variant});if(features){featureSets.set(variant.id,features);for(const file of features.files){await fs.mkdir(path.dirname(path.join(OUT,file)),{recursive:true});await fs.copyFile(path.join(PUBLIC,file),path.join(OUT,file));featureHashes[file]=crypto.createHash('sha256').update(await fs.readFile(path.join(PUBLIC,file))).digest('hex');}}}
await fs.mkdir(path.join(OUT,'assets'),{recursive:true});
const branding=await loadBranding({root:ROOT,out:OUT,projectName:project.name});
const snapshotDir=`data/snapshots/${manifest.snapshot.id}`;
await fs.cp(path.join(PUBLIC,snapshotDir),path.join(OUT,snapshotDir),{recursive:true});
await fs.copyFile(path.join(PUBLIC,'data/manifest.json'),path.join(OUT,'data/manifest.json'));
await fs.copyFile(path.join(ROOT,'node_modules/three/LICENSE'),path.join(OUT,'assets/three-LICENSE.txt'));
// Keep the viewer's own licenses and dependency notices in every built distribution.
const licenseDir=path.join(OUT,'licensing');
await fs.mkdir(path.join(licenseDir,'docs'),{recursive:true});
for(const file of ['LICENSE','LICENSE.md'])await fs.copyFile(path.join(ROOT,file),path.join(licenseDir,file));
await fs.cp(path.join(ROOT,'LICENSES'),path.join(licenseDir,'LICENSES'),{recursive:true});
await fs.copyFile(path.join(ROOT,'docs/THIRD_PARTY_NOTICES.md'),path.join(licenseDir,'docs/THIRD_PARTY_NOTICES.md'));
const result=await build({entryPoints:['src/overview.js','src/schematic.js','src/pcb.js'],absWorkingDir:ROOT,outdir:path.join(OUT,'assets'),bundle:true,format:'esm',splitting:true,minify:true,sourcemap:false,target:'es2020',entryNames:'[name]-[hash]',chunkNames:'chunk-[hash]',metafile:true});
const enclosurePoster='data/enclosure/poster.png';
if(manifest.variants.some(v=>v.enclosure)){
  const metadata=JSON.parse(await fs.readFile(path.join(PUBLIC,'data/enclosure/poster.json'),'utf8'));
  if(metadata.snapshotId!==manifest.snapshot.id)throw new Error('Enclosure poster uses a different snapshot.');
  const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
  if(hash(await fs.readFile(path.join(PUBLIC,enclosurePoster)))!==metadata.sha256)throw new Error('Enclosure poster hash differs.');
  for(const[file,sha]of Object.entries(metadata.sources))if(hash(await fs.readFile(path.join(PUBLIC,file)))!==sha)throw new Error('Enclosure poster source differs: '+file);
  await fs.mkdir(path.join(OUT,'data/enclosure'),{recursive:true});
  for(const file of [enclosurePoster,'data/enclosure/poster.json']){await fs.copyFile(path.join(PUBLIC,file),path.join(OUT,file));featureHashes[file]=hash(await fs.readFile(path.join(PUBLIC,file)));}
}
const entries={};
for(const[file,output] of Object.entries(result.metafile.outputs))if(output.entryPoint)entries[path.basename(output.entryPoint,'.js')]=path.relative(OUT,path.resolve(ROOT,file)).replaceAll(path.sep,'/');
const css=await fs.readFile(path.join(ROOT,'src/style.css'),'utf8');
const cssName=`assets/style-${crypto.createHash('sha256').update(css).digest('hex').slice(0,10)}.css`;
await fs.writeFile(path.join(OUT,cssName),css);
const sourceFiles=new Set(Object.keys(manifest.snapshot.sourceHashes));
const allDocs=[...sourceFiles].filter(file=>file.endsWith('.md'));
const noticeDocs=allDocs.filter(file=>/(?:^|\/)THIRD_PARTY_NOTICES\.md$/i.test(file));
const routes=[],esc=escapeHtml;
const url=(route,target)=>localHref(route,target);
const navRoute=(variant,view)=>`${variant.id}/${view==='overview'?'':view+'/'}index.html`;
const icon=()=>'<span aria-hidden="true">↗</span>';

function nav(route,variant,view) {
  const labels={overview:'Overview',enclosure:'Enclosure',schematic:'Schematic',pcb:'PCB'};
  const tabs=availableViews(variant).map(key=>`<a href="${url(route,navRoute(variant,key))}" ${view===key?'aria-current="page"':''}>${labels[key]}</a>`).join('');
  const variants=manifest.variants.length>1?`<nav class="variants" aria-label="Board variant"><span class="label">Variant</span>${manifest.variants.map(option=>`<a href="${url(route,navRoute(option,availableViews(option).includes(view)?view:'overview'))}" ${option.id===variant.id?'aria-current="true"':''}>${esc(option.label)}</a>`).join('')}</nav>`:'';
  return `<div class="navigation"><nav class="tabs" aria-label="Project views">${tabs}</nav>${variants}</div>`;
}
function header(route,variant,view) {
  const logo=project.name.replace(/\s+/g,'').toLowerCase();
  return `<a class="skip" href="#main">Skip to content</a><header class="site-header"><a href="${url(route,'index.html')}" class="brand" aria-label="${esc(project.name)} home">${branding?`<img class="brand-logo" src="${url(route,branding.files['wordmark.svg'])}" width="720" height="151" alt="Tinkerbadge">`:`<span class="brand-mark" aria-hidden="true">✳</span><span>${esc(logo)}</span>`}</a>${variant?nav(route,variant,view):''}</header>`;
}
function nativeDownload(route) {
  return `<div class="viewer-native-download"><a class="native-link" href="${url(route,manifest.nativeArchiveUrl)}" download>Download KiCad project ${icon()}</a></div>`;
}
function footer(route) {
  return `<footer class="footer"><span>${esc(project.name)}${project.revision?` · ${esc(project.revision)}`:''} · Snapshot <span class="mono">${manifest.snapshot.id}</span></span><span>KiCad ${esc(manifest.snapshot.toolVersions.kicad)} · <a href="${url(route,'data/manifest.json')}">Provenance ↗</a> · <a href="${url(route,'licensing/index.html')}">Licensing</a> · <a href="${url(route,'assets/three-LICENSE.txt')}">Three.js license</a>${noticeDocs.map(file=>` · <a href="${url(route,`docs/${file.replace(/\.md$/,'.html')}`)}">Third-party notices</a>`).join('')}</span></footer>`;
}
function downloads(route,variant) {
  return (variant.downloads??[]).map(item=>`<a class="download" href="${url(route,item.url)}" download><span>${esc(item.label)}</span>${icon()}</a>`).join('');
}
async function markdown(text,sourceRel,route) {
  return new Marked({renderer:markdownRenderer({sourceRel,pageRoute:route,sourceFiles,sourceBase:manifest.sourceBase,nativeArchive:manifest.nativeArchiveUrl})}).parse(text);
}
function shell({route,variant,view='overview',content,config,title}) {
  const data=config?`<script id="page-config" type="application/json">${JSON.stringify(config).replace(/</g,'\\u003c')}</script><script type="module" src="${url(route,entries[view==='enclosure'?'overview':view])}"></script>`:'';
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(project.description??'Explore native KiCad project files and exports.')} "><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${esc(title)} · ${esc(project.name)}</title>${faviconLinks(route,branding)}<link rel="stylesheet" href="${url(route,cssName)}"></head><body>${header(route,variant,view)}<div class="shell">${content}${footer(route)}</div>${data}</body></html>`;
}
function modelInspector() {
  return `<section id="model-inspector" class="model-inspector" aria-labelledby="component-heading" hidden><div class="inspector-heading"><h2 id="component-heading">Component details</h2><span id="component-count"></span></div><label class="visually-hidden" for="model-component">Component name or reference</label><div class="component-picker"><select id="model-component" disabled><option>Loading components…</option></select><button id="focus-component" type="button" disabled>Focus</button><button id="clear-component" type="button" disabled>Clear</button></div><div id="model-component-details"></div><button id="retry-components" type="button" hidden>Retry details</button><p id="component-status" class="visually-hidden" role="status"></p></section>`;
}
function accessoryControls(variant){return variant.accessories?.length?`<div class="accessory-controls"><label><input id="show-accessories" type="checkbox" disabled> ${esc(variant.assembly?.toggleLabel??'Show accessories')}</label><p id="accessory-note">${esc(variant.assembly?.note??'')}</p></div>`:'';}
function enclosureConfig(route,variant){
  const e=variant.enclosure;if(!e)return null;
  const linkKeys=['modelUrl','stepUrl','archiveUrl','manifestUrl','frontDxfUrl','rearDxfUrl','sourceUrl'];
  return {...e,...Object.fromEntries(linkKeys.map(k=>[k,url(route,e[k])])),parts:e.parts.map(p=>({...p,stepUrl:url(route,p.stepUrl),stlUrl:url(route,p.stlUrl)}))};
}
function assemblyControls(route,variant){
  const e=variant.enclosure;if(!e)return '';
  return `<section id="assembly-controls" class="assembly-controls" aria-label="Badge assembly"><div class="assembly-modes" aria-label="Assembly view">${[['assembled','Assembled'],['board','Board'],['exploded','Exploded']].map(([id,label])=>`<button data-assembly="${id}" aria-pressed="${id==='assembled'}" type="button" disabled>${label}</button>`).join('')}</div><div id="explode-control" class="explode-control" hidden><label for="explode-distance">Separation</label><input id="explode-distance" type="range" min="0" max="100" value="100" disabled><output id="explode-value" for="explode-distance">100%</output></div><p id="case-status" class="case-status">Load 3D to explore the assembly and individual parts.</p><details class="case-parts"><summary>Inspect enclosure parts</summary><div class="part-picker"><label class="visually-hidden" for="enclosure-part">Enclosure part</label><select id="enclosure-part" disabled><option value="">Choose a case part</option>${e.parts.map(p=>`<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')}</select><button id="focus-part" type="button" disabled>Focus part</button></div><p id="part-description">Click a case part or choose one to inspect it.</p><a id="part-download" href="${url(route,e.parts[0].stlUrl)}" hidden download>Download selected part STL ↓</a><fieldset class="part-visibility"><legend>Visible parts</legend>${e.parts.map(p=>`<label><input type="checkbox" data-part-visibility="${esc(p.id)}" checked disabled> ${esc(p.label)}</label>`).join('')}</fieldset></details></section>`;
}
function enclosurePage(route,variant){
  const e=variant.enclosure;
  const content=`<main id="main" class="enclosure-page"><div class="viewer-heading"><div><p class="eyebrow">Enclosure</p><h1>Layered clear case</h1><p>Clear plates, a stepped printed frame, and removable display supports.</p></div><div class="viewer-downloads"><a class="button" href="${url(route,e.stepUrl)}" download>Assembly STEP ↓</a><a class="button" href="${url(route,e.archiveUrl)}" download>All CAD files ↓</a></div></div><div class="enclosure-layout"><div>${modelCard(route,variant)}</div><aside class="enclosure-notes"><section class="sidebar-card"><h2>Construction</h2><dl class="model-properties"><dt>Housing</dt><dd>${e.size_mm.join(' × ')} mm</dd><dt>Clear plates</dt><dd>1.5 mm front and rear</dd><dt>Board</dt><dd>110 × 80 mm</dd><dt>Fasteners</dt><dd>Four M2 passages</dd><dt>Revision</dt><dd>${esc(e.revision)} · fit prototype</dd></dl><p>The frame supports the board from behind. Four removable posts support the display and make assembly possible without flexing the glass.</p></section><section class="sidebar-card"><h2>Assembly order</h2><ol><li>Fit the diffuser inserts and light barrier below the front plate.</li><li>Fit the rear plate, frame and battery.</li><li>Lower the PCB onto the rear supports and connect the battery.</li><li>Fit the front posts, compliant pads and display.</li><li>Fit the clear cover and fasteners.</li></ol></section><section class="sidebar-card"><h2>Next fit check</h2><p>Confirm the glass support regions, exact battery, cable clearance and button travel on a physical prototype. The dock opening leaves the pads accessible for a separately designed charging dock.</p><a href="${url(route,'docs/mechanical/enclosure/README.html')}">Mechanical notes →</a></section></aside></div><section class="parts-downloads"><h2>CAD and print files</h2><p>STEP files preserve solid geometry. STL files are individual print or fit-test parts. DXF files contain the flat clear-panel outlines.</p><div class="viewer-downloads"><a class="button" href="${url(route,e.frontDxfUrl)}" download>Front panel DXF ↓</a><a class="button" href="${url(route,e.rearDxfUrl)}" download>Rear panel DXF ↓</a><a class="button" href="${url(route,e.sourceUrl)}" download>Parametric source ↓</a></div><div class="table-scroll"><table><thead><tr><th>Part</th><th>Construction</th><th>Download</th></tr></thead><tbody>${e.parts.map(p=>`<tr><td>${esc(p.label)}</td><td>${esc(p.process)}</td><td><a href="${url(route,p.stepUrl)}" download>STEP</a> · <a href="${url(route,p.stlUrl)}" download>STL</a></td></tr>`).join('')}</tbody></table></div></section></main>`;
  const model={...variant.model,url:url(route,variant.model.url),componentsUrl:url(route,variant.model.componentsUrl)};
  return shell({route,variant,view:'enclosure',title:'Enclosure',content,config:{model,enclosure:enclosureConfig(route,variant),defaultAssembly:'exploded',pcbUrl:url(route,navRoute(variant,'pcb')),schematicUrl:url(route,navRoute(variant,'schematic'))}});
}
function modelCard(route,variant) {
  const model=variant.model,features=variant.enclosure?null:featureSets.get(variant.id);
  if(!model) {
    const sheet=variant.schematic?.sheets[0],layer=variant.pcb?.layers.find(layer=>layer.id==='F.Cu')??variant.pcb?.layers[0];
    const preview=sheet?{url:sheet.url,label:`${sheet.name} schematic`,view:'schematic'}:layer?{url:layer.url,label:`${variant.label} PCB layer`,view:'pcb'}:null;
    return `<div class="hero-card"><div class="hero-topline"><span class="mono">${esc(variant.label)}</span><span class="small-tag">${sheet?'Schematic preview':layer?'PCB preview':'Project files'}</span></div>${preview?`<div class="hero-stage schematic-preview"><a href="${url(route,navRoute(variant,preview.view))}"><img class="hero-fallback-drawing" src="${url(route,preview.url)}" alt="${esc(preview.label)}"></a></div>`:'<div class="hero-stage empty-preview"><p>Design files will appear here as they are added.</p></div>'}<p class="hero-status">${variant.pcb?'A 3D export is not available in this snapshot.':'A PCB model will be available after board geometry is added.'}</p></div>`;
  }
  const dimensions=boardDimensions(variant.pcb)?`${boardDimensions(variant.pcb)} mm`:'';
  return `<div class="hero-card"><div class="hero-topline"><span class="mono">${esc(variant.label)}${dimensions?` / ${esc(dimensions)}`:''}</span><span class="small-tag">${variant.enclosure?'Enclosure fit prototype':variant.pcb?.components.length?'PCB assembly':'Board outline'}</span></div><div class="hero-stage${features?' feature-stage':''}">${features?featurePreview(features,target=>url(route,target)):model.posterUrl?`<img class="hero-poster" id="model-poster" src="${url(route,variant.enclosure?enclosurePoster:model.posterUrl)}" width="960" height="720" alt="${variant.enclosure?'CAD render of the assembled badge and clear enclosure':'Native KiCad render of '+esc(variant.label)}">`:'<div class="hero-poster" id="model-poster"></div>'}<div id="model-host" class="canvas-host"></div><button id="load-model" class="hero-start" type="button">Explore in 3D ${icon()}</button></div><div class="hero-controls"><div class="control-group" aria-label="3D camera views"><button type="button" data-camera="reset" disabled aria-pressed="true">↺ Reset</button><button type="button" data-camera="front" disabled aria-pressed="false">Front</button><button type="button" data-camera="back" disabled aria-pressed="false">Back</button></div><span class="control-help">Drag to orbit · Focus + scroll to zoom</span></div><p id="model-status" class="hero-status" role="status">Load the model to rotate and zoom.</p>${assemblyControls(route,variant)}${accessoryControls(variant)}${modelInspector()}<noscript><style>#load-model{display:none}</style><p class="no-js">Enable JavaScript to explore in 3D. Drawings and downloads remain available below.</p></noscript></div><div class="hero-caption"><span>${variant.enclosure?'CAD ASSEMBLY':'KICAD EXPORT'}</span><span>${(model.bytes/1e6).toFixed(1)} MB GLB</span></div>`;
}
function exportNotes(variant) {
  const warnings=[...new Set([...(variant.warnings??[]),...(manifest.warnings??[])])];
  const model=variant.model;
  return `<section class="sidebar-card"><span class="eyebrow muted">Export details</span><p>Generated with KiCad ${esc(manifest.snapshot.toolVersions.kicad)}.</p>${model?`<details class="audit"><summary>Model contents</summary><p>${model.modeledFootprints} footprints have component bodies.</p>${model.withoutModel?.length?`<p>Footprints without 3D bodies: ${esc(model.withoutModel.join(', '))}.</p>`:''}${model.missingModels?.length?`<p>${model.missingModels.length} model entries were unavailable or unsupported by native GLB export.</p>`:''}</details>`:''}${warnings.length?`<details class="audit"><summary>Export notes</summary><ul>${warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details>`:''}</section>`;
}
async function overview(route,variant) {
  const readme=manifest.readme,tagline=presentation.tagline??project.tagline;
  const rendered=readme?await markdown(landingReadme(await fs.readFile(path.join(PUBLIC,readme.url),'utf8'),presentation.readmeOmitSections),readme.sourcePath,route):'';
  const facts=projectFacts(variant);
  const readmeContent=readme?`<div class="section-label"><span>Project README</span><a href="${url(route,readme.url)}" download>${esc(readme.sourcePath)} ↗</a></div><article class="readme">${rendered}</article>`:`<div class="section-label"><span>Source documents</span></div><article class="readme"><ul>${allDocs.map(file=>`<li><a href="${url(route,`docs/${file.replace(/\.md$/,'.html')}`)}">${esc(file)}</a></li>`).join('')}</ul></article>`;
  const content=`<main id="main"><section class="hero${featureSets.has(variant.id)?' hero-features':''}" aria-labelledby="project-title"><div class="hero-copy"><h1 id="project-title" class="visually-hidden">${esc(project.name)}</h1>${tagline?`<p class="intro">${esc(tagline)}</p>`:""}</div><div>${modelCard(route,variant)}${nativeDownload(route)}</div></section>${variant.enclosure&&featureSets.has(variant.id)?`<details class="board-features"><summary>Explore the board features</summary>${featurePreview(featureSets.get(variant.id),target=>url(route,target)).replace('id="model-poster"','id="board-feature-poster"')}</details>`:''}${interactionExamples(presentation.exampleInteractions)}${facts.length?`<div class="spec-strip" aria-label="Project facts">${facts.map(fact=>`<div class="spec-item"><span>${esc(fact.label)}</span><strong>${esc(fact.value)}${fact.unit?`<small>${esc(fact.unit)}</small>`:''}</strong></div>`).join('')}</div>`:''}<section class="content-grid" id="readme"><div>${readmeContent}</div><aside><section class="sidebar-card"><span class="eyebrow muted">Downloads</span><h2>${esc(variant.label)} files</h2><p>Native files and exports from snapshot <span class="mono">${manifest.snapshot.id}</span>.</p>${downloads(route,variant)}<a class="download" href="${url(route,manifest.nativeArchiveUrl)}" download><span>Complete native bundle</span>${icon()}</a></section>${exportNotes(variant)}</aside></section></main>`;
  const model=variant.model?{...variant.model,url:url(route,variant.model.url),componentsUrl:url(route,variant.model.componentsUrl)}:null;
  return shell({route,variant,content,config:{model,enclosure:enclosureConfig(route,variant),pcbUrl:variant.pcb?url(route,navRoute(variant,'pcb')):null,schematicUrl:variant.schematic?url(route,navRoute(variant,'schematic')):null},title:'Overview'});
}
function drawingArea(kind,title,detail) {
  return `<section class="drawing-panel" aria-label="${kind==='pcb'?'PCB':'Schematic'} viewer"><div class="drawing-toolbar"><span class="title" id="drawing-title">${esc(title)}</span><div class="control-group"><button type="button" id="zoom-out" aria-label="Zoom out">−</button><button type="button" id="zoom-in" aria-label="Zoom in">+</button><button type="button" id="fit-view">Fit</button></div></div><div class="drawing ${kind==='pcb'?'pcb':''}"><svg id="drawing-svg" role="img" aria-label="${esc(title)}. Drag to pan. Scroll or pinch to zoom. Arrow keys pan, plus and minus zoom, Home fits." tabindex="0" xmlns="http://www.w3.org/2000/svg"></svg><div class="drawing-loading" id="drawing-loading" role="status"><p id="drawing-message">Loading drawing…</p><button type="button" id="retry-drawing" hidden>Retry drawing</button></div></div><div class="drawing-footer"><span id="drawing-detail">${esc(detail)}</span><span class="nowrap"><span id="zoom-level">100%</span> <span id="layer-count"></span></span></div></section>`;
}
function searchPanel() {
  return `<section class="panel-section"><h2>Find a component</h2><label class="visually-hidden" for="reference-search">Search name, reference, value, or net</label><input id="reference-search" type="search" placeholder="Name, reference, value, net…" autocomplete="off"><div id="component-list" class="component-list" aria-live="polite"></div></section><section class="panel-section"><h2>Selection</h2><div id="properties"><p>Select a component to inspect its source properties and focus the drawing.</p></div></section>`;
}
function noscript(route,variant,view) {
  const asset=view==='schematic'?variant.schematic.sheets[0].url:variant.pcb.layers.find(layer=>layer.id===(variant.pcb.components.length?'F.Cu':'Edge.Cuts'))?.url??variant.pcb.layers[0].url;
  return `<noscript><style>.workbench{display:none}</style><div class="no-js">Interactive pan, zoom, search, and layers require JavaScript. Open the native drawing below.</div><div class="static-fallback"><a href="${url(route,asset)}">Open the exported SVG drawing ↗</a><img src="${url(route,asset)}" alt="Exported ${view} drawing"></div></noscript>`;
}
function schematic(route,variant) {
  const schematic=variant.schematic,sheets=schematic.sheets;
  const content=`<main id="main"><div class="viewer-heading"><div><p class="eyebrow">Schematic</p><h1>Schematic viewer</h1><p>${esc(variant.label)} · ${sheets.length} sheet${sheets.length===1?'':'s'} · Search references and inspect source properties.</p></div><div class="viewer-downloads">${schematic.pdfUrl?`<a class="button" href="${url(route,schematic.pdfUrl)}" download>PDF ↓</a>`:''}<a class="button" href="${url(route,schematic.nativeUrl)}" download>KiCad ↓</a></div></div>${noscript(route,variant,'schematic')}<div class="workbench"><aside class="workbench-side"><section class="panel-section"><h2>Sheets <span class="small-count">${sheets.length}</span></h2><label class="visually-hidden" for="sheet-select">Schematic sheet</label><select id="sheet-select">${sheets.map(sheet=>`<option value="${esc(sheet.id)}">${esc(sheet.name)}</option>`).join('')}</select><p class="sheet-path" id="sheet-path">${esc(sheets[0].hierarchy)}</p><a class="text-link" id="sheet-download" href="${url(route,sheets[0].url)}" download>Download this sheet SVG ↓</a></section>${searchPanel()}</aside>${drawingArea('schematic',sheets[0].name,sheets[0].hierarchy)}</div><p class="view-note">Drag to pan. Scroll or pinch to zoom. Keyboard: arrow keys move, + / − zoom, Home fits the sheet. Reference markers show symbol origins.</p></main>`;
  return shell({route,variant,view:'schematic',content,config:{schematic:{...schematic,sheets:sheets.map(sheet=>({...sheet,url:url(route,sheet.url)}))}},title:`${variant.label} schematic`});
}
function pcb(route,variant) {
  const pcb=variant.pcb;
  const content=`<main id="main"><div class="viewer-heading"><div><p class="eyebrow">PCB</p><h1>PCB viewer</h1><p>${esc(variant.label)}${boardDimensions(pcb)?` · ${boardDimensions(pcb)} mm`:''} · ${pcb.copperLayers.length} copper layers · ${pcb.thicknessMm} mm PCB</p>${variant.status?`<p class="design-status">${esc(variant.status)}</p>`:""}</div><div class="viewer-downloads"><a class="button" href="${url(route,pcb.nativeUrl)}" download>Native PCB ↓</a><a class="button" href="${url(route,manifest.nativeArchiveUrl)}" download>Full bundle ↓</a></div></div>${placementNote(variant,url(route,navRoute(variant,'schematic')))}${noscript(route,variant,'pcb')}<div class="workbench"><aside class="workbench-side"><section class="panel-section"><h2>Viewing direction</h2><div class="direction-buttons"><button data-side="front" aria-pressed="true" type="button">Front</button><button data-side="back" aria-pressed="false" type="button">Back</button></div><p>Back mirrors the view. Layer visibility stays unchanged.</p></section><section class="panel-section"><h2>Layer visibility</h2><div class="direction-buttons"><button id="front-preset" type="button">Front set</button><button id="back-preset" type="button">Back set</button></div>${pcb.layers.map(layer=>`<label class="layer-item"><input type="checkbox" data-layer="${esc(layer.id)}" ${layer.defaultVisible?'checked':''}><span class="swatch" style="background:${esc(layer.color)}"></span><span class="layer-label">${esc(layer.name)}</span><a href="${url(route,layer.url)}" download aria-label="Download ${esc(layer.name)} SVG">↓</a></label>`).join('')}<p class="layer-summary">${pcb.copperLayers.length} copper layers in this source.</p></section>${searchPanel()}</aside>${drawingArea('pcb',`${variant.label} · PCB layers`,'Front view · unmirrored')}</div><p class="view-note">Layers use registered KiCad SVG exports. Search includes component names, references, values, and net names. Selection marks footprint origins. Use the native files for dimensional checks.</p></main>`;
  return shell({route,variant,view:'pcb',content,config:{pcb:{...pcb,layers:pcb.layers.map(layer=>({...layer,url:url(route,layer.url)}))}},title:`${variant.label} PCB`});
}
async function write(route,html) {
  await fs.mkdir(path.dirname(path.join(OUT,route)),{recursive:true});await fs.writeFile(path.join(OUT,route),html);routes.push(route);
}
for(const variant of manifest.variants)for(const view of availableViews(variant)) {
  const route=navRoute(variant,view);
  await write(route,view==='overview'?await overview(route,variant):view==='enclosure'?enclosurePage(route,variant):view==='schematic'?schematic(route,variant):pcb(route,variant));
}
const defaultVariant=manifest.variants.find(variant=>variant.id===manifest.defaultVariant);
if(!defaultVariant)throw new Error('The default variant is not in the project manifest.');
await write('index.html',await overview('index.html',defaultVariant));
for(const sourceRel of allDocs) {
  const route=`docs/${sourceRel.replace(/\.md$/,'.html')}`;
  const html=await markdown(await fs.readFile(path.join(PUBLIC,manifest.sourceBase,sourceRel),'utf8'),sourceRel,route);
  await write(route,shell({route,title:sourceRel,content:`<main id="main" class="docs-shell"><a class="text-link" href="${url(route,'index.html')}">← Back to the viewer</a><div class="section-label source-document"><span>Source document</span><a href="${url(route,manifest.sourceBase+sourceRel)}" download>${esc(sourceRel)} ↓</a></div><article class="readme">${html}</article><p class="view-note">Dotted text marks source references outside this snapshot.</p></main>`}));
}
const licensingRoute='licensing/index.html';
const hardwareLicenseLink=sourceFiles.has('LICENSE.md')?` <a href="${url(licensingRoute,'docs/LICENSE.html')}">Hardware licensing map</a>.`:'';
await write(licensingRoute,shell({route:licensingRoute,title:'Licensing',content:`<main id="main" class="docs-shell"><a class="text-link" href="${url(licensingRoute,'index.html')}">← Back to the viewer</a><article class="readme"><h1>Licensing</h1><p>Original viewer software is licensed under Apache-2.0. Original viewer documentation and artwork use CC-BY-4.0. Hardware exports and incorporated third-party material retain their source licenses.${hardwareLicenseLink}</p><ul><li><a href="LICENSE.md">Viewer licensing map</a></li><li><a href="LICENSE">Apache License 2.0</a></li><li><a href="LICENSES/CC-BY-4.0.txt">Creative Commons Attribution 4.0</a></li><li><a href="LICENSES/CERN-OHL-P-2.0.txt">CERN Open Hardware Licence 2, Permissive</a></li><li><a href="LICENSES/CC-BY-SA-4.0.txt">Creative Commons Attribution-ShareAlike 4.0</a></li><li><a href="docs/THIRD_PARTY_NOTICES.md">Viewer third-party notices</a></li></ul><p>License selection does not establish that a hardware design is ready for manufacture. Refer to the source project's review and release status.</p></article></main>`}));
if(!branding)await fs.writeFile(path.join(OUT,'assets/favicon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#183b32"/><g stroke="#d9ec9c" stroke-width="5" stroke-linecap="round"><path d="M32 12v40M12 32h40M18 18l28 28M18 46l28-28"/></g></svg>');
await fs.writeFile(path.join(OUT,'build-info.json'),JSON.stringify({snapshot:manifest.snapshot.id,project:project.name,routes,entryPoints:entries,stylesheet:cssName,featureHashes,brandingHashes:branding?.hashes??{}},null,2));
await fs.mkdir(path.dirname(FINAL),{recursive:true});
const previous=FINAL+'.previous';
await fs.rm(previous,{recursive:true,force:true});
try{await fs.rename(FINAL,previous);}catch(error){if(error.code!=='ENOENT')throw error;}
try{await fs.rename(OUT,FINAL);}catch(error){try{await fs.rename(previous,FINAL);}catch{}throw error;}
await fs.rm(previous,{recursive:true,force:true});
console.log(`Built ${routes.length} static pages for ${project.name}, snapshot ${manifest.snapshot.id}.`);
