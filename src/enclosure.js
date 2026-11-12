import * as THREE from 'three';
import {partOffset,assemblyMode,explosionFraction} from './enclosure-state.js';

// The CAD mesh is exported in metres, x/y in the PCB plane, +z to the front.
// Register it to the exporter-verified KiCad frame before the common camera transform.
export function attachEnclosure(model,gltf,metadata) {
  if(!Number.isFinite(metadata.frontSurfaceM))throw new Error('Missing PCB surface calibration.');
  const root=gltf.scene;root.name='Enclosure';
  root.rotation.x=-Math.PI/2;root.position.set(.155,metadata.frontSurfaceM,.140);
  const objects=new Map(),base=new Map(),hidden=new Set();
  root.traverse(object=>{
    const part=metadata.parts.find(p=>p.id===object.name);
    if(!part||!object.isMesh)return;
    if(objects.has(part.id))throw new Error('Duplicate enclosure part identity.');
    object.userData.enclosurePartId=part.id;objects.set(part.id,object);base.set(part.id,object.position.clone());
    if(part.group==='front'||part.id==='rear'){
      object.material.dispose();
      object.material=new THREE.MeshPhysicalMaterial({color:0xd3e9e8,roughness:.2,metalness:0,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
      object.renderOrder=2;
    } else if(part.group==='diffusers') {
      object.material.dispose();
      const colors=[0x72c9d2,0x9cc781,0xe5bf72,0xd78b93,0xaf91cd];
      const color=part.id.startsWith('affinity-')?colors[Number(part.id.split('-')[1])-1]:0x7dcbb6;
      object.material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.22,roughness:.65,transparent:false});
    }
  });
  if(objects.size!==metadata.parts.length)throw new Error('Enclosure mesh does not match its parts list.');
  model.add(root);
  let mode='assembled',fraction=1;
  function apply(){
    root.visible=mode!=='board';
    for(const part of metadata.parts){const o=objects.get(part.id);o.visible=!hidden.has(part.id);o.position.copy(base.get(part.id)).add(new THREE.Vector3(...partOffset(part,mode,fraction)));}
  }
  return {root,objects,setMode(value){mode=assemblyMode(value);apply();},setExplosion(value){fraction=explosionFraction(value);apply();},setVisible(id,value){if(value)hidden.delete(id);else hidden.add(id);apply();}};
}
