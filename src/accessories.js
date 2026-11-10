import * as THREE from 'three';

// These optional source-defined envelopes are distinct from the electrical BOM.
// Their coordinates are calibrated during export in the native GLB frame.
export function setNativeAccessoriesVisible(model,visible=false) {
  model.traverse(object=>{if(object.userData?.viewerAccessoryId)object.visible=Boolean(visible);});
}

export function attachAccessories(model,index,visible=false) {
  const groups=new Map(),generated=[];
  model.traverse(object=>{const id=object.userData?.viewerAccessoryId;if(id){if(!groups.has(id))groups.set(id,[]);groups.get(id).push(object);}});
  const boardRoot=model.children[0];
  for(const accessory of index.accessories??[]) {
    if(accessory.hasModel||!accessory.boxes?.length)continue;
    const group=new THREE.Group();group.name=accessory.label;group.userData={viewerAccessoryId:accessory.id,viewerGeneratedAccessory:true};
    for(const box of accessory.boxes) {
      const material=new THREE.MeshStandardMaterial({color:new THREE.Color(...(box.color??[.65,.65,.65])),roughness:.8,metalness:.05,transparent:box.opacity!==undefined&&box.opacity<1,opacity:box.opacity??1});
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(...box.size),material);mesh.position.set(...box.center);group.add(mesh);
    }
    boardRoot.add(group);generated.push(group);groups.set(accessory.id,[group]);
  }
  const items=(index.accessories??[]).filter(a=>groups.has(a.id));
  for(const accessory of items)for(const group of groups.get(accessory.id))group.visible=Boolean(visible);
  return {items,setVisible(value){for(const group of groups.values())for(const object of group)object.visible=value;},dispose(){for(const group of generated){group.removeFromParent();group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});}}};
}
