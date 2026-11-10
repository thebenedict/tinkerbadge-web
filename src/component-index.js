// Shared by the exporter checks and the browser. Identity never depends on a
// mesh's display name, material, or proximity to a footprint.
export function meshOwnership(gltf) {
  const owners=new Map(),visited=new Set();
  function visit(i,owner,branch) {
    const node=gltf.nodes?.[i];if(!node||branch.has(i))throw new Error('Invalid or cyclic model hierarchy.');
    if(visited.has(i))throw new Error('A model node has multiple parents.');visited.add(i);
    const own=node.extras?.viewerComponentId;if(own&&owner)throw new Error('Nested component identities.');
    const next=own??owner;if(Number.isInteger(node.mesh))owners.set(i,next??null);
    for(const child of node.children??[])visit(child,next,new Set(branch).add(i));
  }
  if(gltf.scenes?.length!==1)throw new Error('Expected one model scene.');
  for(const root of gltf.scenes[0].nodes??[])visit(root,null,new Set());
  if(visited.size!==gltf.nodes.length)throw new Error('Unreachable model nodes.');
  return owners;
}
export function validateComponentIndex(gltf, index) {
  if(index?.schemaVersion !== 1 || !Array.isArray(index.components)) throw new Error('Unsupported component index.');
  if(!index.bindingId || gltf.asset?.extras?.viewerComponentIndex !== index.bindingId) throw new Error('The component index belongs to a different model.');
  const ids=new Set(), references=new Set(), mappedNodes=new Set(),ownership=meshOwnership(gltf);
  const equal=(a,b)=>Array.isArray(a)&&JSON.stringify([...a].sort((x,y)=>x-y))===JSON.stringify([...b].sort((x,y)=>x-y));
  for(const component of index.components) {
    if(!component.id || ids.has(component.id) || !component.reference || references.has(component.reference)) throw new Error('Component identities must be unique.');
    ids.add(component.id); references.add(component.reference);
    if(!Array.isArray(component.modelNodes) || component.hasModel !== (component.modelNodes.length > 0)) throw new Error(`Invalid model coverage for ${component.reference}.`);
    for(const nodeIndex of component.modelNodes) {
      const node=gltf.nodes?.[nodeIndex];
      if(!Number.isInteger(nodeIndex) || mappedNodes.has(nodeIndex) || !node || node.name!==component.reference || Number.isInteger(node.mesh) || node.extras?.viewerComponentId !== component.id || node.extras?.viewerComponentReference !== component.reference) throw new Error(`Invalid model binding for ${component.reference}.`);
      mappedNodes.add(nodeIndex);
    }
    const actual=[...ownership].filter(([,owner])=>owner===component.id).map(([i])=>i);
    if(!equal(component.meshNodes,actual)||component.hasModel!==Boolean(actual.length))throw new Error(`Invalid mesh ownership for ${component.reference}.`);
  }
  for(const [nodeIndex,node] of (gltf.nodes??[]).entries()) if(node.extras?.viewerComponentId && !mappedNodes.has(nodeIndex)) throw new Error('The model contains an unindexed component.');
  if(!equal(index.boardMeshNodes,[...ownership].filter(([,owner])=>owner===null).map(([i])=>i)))throw new Error('Board mesh ownership changed.');
  const accessoryIds=new Set(),accessoryNodes=new Set();
  for(const accessory of index.accessories??[]) {
    if(!accessory.id||ids.has(accessory.id)||accessoryIds.has(accessory.id))throw new Error('Accessory identities must be unique.');
    accessoryIds.add(accessory.id);
    for(const nodeIndex of accessory.modelNodes??[]) {
      const node=gltf.nodes?.[nodeIndex];
      if(!node||mappedNodes.has(nodeIndex)||accessoryNodes.has(nodeIndex)||node.extras?.viewerAccessoryId!==accessory.id||node.name!==accessory.reference)throw new Error('Invalid accessory model binding.');
      accessoryNodes.add(nodeIndex);
    }
    const meshes=[];
    function visitAccessory(nodeIndex){const node=gltf.nodes[nodeIndex];if(node.extras?.viewerComponentId||node.extras?.viewerAccessoryId&&node.extras.viewerAccessoryId!==accessory.id)throw new Error('Accessory and component subtrees overlap.');if(Number.isInteger(node.mesh))meshes.push(nodeIndex);for(const child of node.children??[])visitAccessory(child);}
    for(const node of accessory.modelNodes??[])visitAccessory(node);
    if(!equal(accessory.meshNodes??[],meshes))throw new Error('Accessory mesh ownership changed.');
    if(accessory.hasModel&&!(accessory.modelNodes??[]).length)throw new Error('Accessory model has no native node.');
    if(accessory.hasModel&&accessory.boxes?.length)throw new Error('Accessory geometry would be duplicated.');
    for(const box of accessory.boxes??[]) {
      if(!['center','size'].every(key=>Array.isArray(box[key])&&box[key].length===3&&box[key].every(Number.isFinite))||box.size.some(x=>x<=0||x>10))throw new Error('Invalid accessory envelope dimensions.');
      if(box.opacity!==undefined&&(!Number.isFinite(box.opacity)||box.opacity<0||box.opacity>1))throw new Error('Invalid accessory envelope opacity.');
      if(box.color&&(!Array.isArray(box.color)||box.color.length!==3||box.color.some(x=>!Number.isFinite(x)||x<0||x>1)))throw new Error('Invalid accessory envelope color.');
    }
  }
  for(const [nodeIndex,node] of gltf.nodes.entries())if(node.extras?.viewerAccessoryId&&!accessoryNodes.has(nodeIndex))throw new Error('The model contains an unindexed accessory.');
  return index;
}

export function componentIdFromObject(object) {
  for(let node=object;node;node=node.parent) if(node.userData?.viewerComponentId) return node.userData.viewerComponentId;
  return null;
}

export function isSelectionGesture(gesture, event) {
  return Boolean(gesture && !gesture.cancelled && gesture.pointerId===event.pointerId && gesture.button===0 && gesture.maxDistance<=6);
}

export function safeDatasheetUrl(value) {
  try {const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;} catch{return null;}
}

export function isEffectivelyVisible(object) {
  for(let node=object;node;node=node.parent)if(node.visible===false)return false;
  return true;
}
export function componentFromIntersections(hits) {
  const hit=hits.find(hit=>hit.object.isMesh&&isEffectivelyVisible(hit.object));
  return hit?componentIdFromObject(hit.object):null;
}
