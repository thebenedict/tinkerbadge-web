import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {attachAccessories,setNativeAccessoriesVisible} from './accessories.js';
import {componentOptionLabel} from './component-labels.js';
import {validateComponentIndex,componentIdFromObject,isSelectionGesture,componentFromIntersections} from './component-index.js';

export async function createViewer(host, modelUrl, onContextLost, onSelection = () => {}, signal, options = {}) {
  let renderer, controls, resize, model, gltf, disposed = false, frame = 0;
  let componentIndex=null, selection=null, gesture=null, accessories=null;
  let accessoriesVisible=Boolean(options.accessoriesVisible);
  const componentRoots=new Map(), pointers=new Set(), raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
  const abort=new AbortController();
  const selectionBox=new THREE.Box3Helper(new THREE.Box3(),0xb26f23);selectionBox.visible=false;selectionBox.material.depthTest=false;selectionBox.renderOrder=100;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, .0001, 100);
  const resources = new Set();
  scene.add(selectionBox);
  function dispose() {
    if (disposed) return; disposed = true; abort.abort(); cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', visibility);
    signal?.removeEventListener('abort',dispose);
    resize?.disconnect(); controls?.dispose();
    renderer?.domElement.removeEventListener('webglcontextlost', lost);
    renderer?.domElement.removeEventListener('keydown', keyboard);
    renderer?.domElement.removeEventListener('pointerdown', startPointer);
    renderer?.domElement.removeEventListener('pointermove', movePointer);
    renderer?.domElement.removeEventListener('pointerup', endPointer, true);
    renderer?.domElement.removeEventListener('pointercancel', cancelPointer);
    renderer?.domElement.removeEventListener('lostpointercapture', cancelPointer);
    renderer?.domElement.removeEventListener('pointerleave', clearHover);
    scene.traverse(o => { if(o.geometry) resources.add(o.geometry); const materials = Array.isArray(o.material) ? o.material : [o.material]; for(const m of materials){if(!m)continue;resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);} });
    resources.forEach(r => r.dispose()); renderer?.dispose(); renderer?.domElement.remove();
  }
  function lost(event) { event.preventDefault(); dispose(); onContextLost(); }
  function render() {
    frame = 0;
    if(disposed || document.hidden) return;
    controls?.update(); renderer.render(scene, camera);
  }
  function requestRender() { if(!frame && !disposed && !document.hidden) frame = requestAnimationFrame(render); }
  function visibility() { if(document.hidden) {cancelAnimationFrame(frame);frame=0;} else requestRender(); }
  function keyboard(event) {
    if(!controls || disposed)return;
    if(event.key==='Escape'){event.preventDefault();selectComponent(null);return;}
    if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','=','-','Home'].includes(event.key)) return;
    event.preventDefault();
    if(event.key==='Home'){ setCamera('reset');return; }
    const offset=camera.position.clone().sub(controls.target);const spherical=new THREE.Spherical().setFromVector3(offset);
    if(event.key==='ArrowLeft')spherical.theta-=.15;if(event.key==='ArrowRight')spherical.theta+=.15;
    if(event.key==='ArrowUp')spherical.phi=Math.max(.03,spherical.phi-.15);if(event.key==='ArrowDown')spherical.phi=Math.min(Math.PI-.03,spherical.phi+.15);
    if(event.key==='+'||event.key==='=')spherical.radius=Math.max(controls.minDistance,spherical.radius*.85);
    if(event.key==='-')spherical.radius=Math.min(controls.maxDistance,spherical.radius*1.15);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();requestRender();
  }
  function setComponentIndex(index) {
    validateComponentIndex(gltf.parser.json,index);
    const expected=new Map(index.components.map(c=>[c.id,c]));componentRoots.clear();
    model.traverse(object=>{const id=object.userData?.viewerComponentId;if(!id)return;if(!expected.has(id))throw new Error('Unknown component in loaded model.');if(!componentRoots.has(id))componentRoots.set(id,[]);componentRoots.get(id).push(object);});
    for(const c of index.components)if((componentRoots.get(c.id)?.length??0)!==c.modelNodes.length)throw new Error(`Loaded model binding mismatch: ${c.reference}`);
    accessories?.dispose();accessories=attachAccessories(model,index,accessoriesVisible);componentIndex=index;selectComponent(null);return index;
  }
  function selectComponent(id) {
    if(id && !componentIndex?.components.some(c=>c.id===id))return;
    selection=id;selectionBox.visible=false;
    const roots=componentRoots.get(id);
    if(roots?.length){model.updateMatrixWorld(true);selectionBox.box.makeEmpty();for(const root of roots)selectionBox.box.union(new THREE.Box3().setFromObject(root));selectionBox.box.expandByScalar(size*.003);selectionBox.visible=true;}
    onSelection(id);requestRender();
  }
  function focusComponent() {
    if(!selectionBox.visible)return;
    const center=selectionBox.box.getCenter(new THREE.Vector3()),extent=selectionBox.box.getSize(new THREE.Vector3());
    const direction=camera.position.clone().sub(controls.target).normalize();
    const distance=Math.max(controls.minDistance,Math.max(extent.x,extent.y,extent.z)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*2.5);
    controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);controls.update();requestRender();
  }
  function pick(event) {
    if(!componentIndex||!model)return null;
    const rect=renderer.domElement.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return null;
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    camera.updateMatrixWorld(true);model.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
    // Include board geometry as an occluder. A component hidden behind the board
    // must not be selected through it; the highlight is outside this subtree.
    return componentFromIntersections(raycaster.intersectObject(model,true));
  }
  function clearHover(){if(!renderer)return;renderer.domElement.style.cursor='grab';renderer.domElement.removeAttribute('title');}
  function startPointer(event) {
    pointers.add(event.pointerId);
    if(pointers.size===1)gesture={pointerId:event.pointerId,button:event.button,x:event.clientX,y:event.clientY,maxDistance:0,cancelled:false};
    else if(gesture)gesture.cancelled=true;
    renderer.domElement.focus({preventScroll:true});controls.enableZoom=true;
  }
  function movePointer(event) {
    if(gesture&&pointers.has(event.pointerId))gesture.maxDistance=Math.max(gesture.maxDistance,Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y));
    if(pointers.size){renderer.domElement.style.cursor='grabbing';return;}
    if(event.pointerType==='touch')return;
    const id=pick(event),component=componentIndex?.components.find(c=>c.id===id);
    renderer.domElement.style.cursor=id?'pointer':'grab';
    if(component)renderer.domElement.title=componentOptionLabel(component);else renderer.domElement.removeAttribute('title');
  }
  function endPointer(event) {
    if(gesture)gesture.maxDistance=Math.max(gesture.maxDistance,Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y));
    if(isSelectionGesture(gesture,event))selectComponent(pick(event));
    pointers.delete(event.pointerId);gesture=null;clearHover();
  }
  function cancelPointer(event){pointers.delete(event.pointerId);gesture=null;clearHover();}
  let size = .04, homeDistance = .09;
  function setCamera(view) {
    if(!controls)return;
    const aspect=host.clientWidth/Math.max(host.clientHeight,1);
    const distance=homeDistance*Math.max(1,1/aspect);
    const direction = view==='front' ? new THREE.Vector3(0,0,1) : view==='back' ? new THREE.Vector3(0,0,-1) : new THREE.Vector3(-.42,.72,1);
    camera.up.set(0,1,0); camera.position.copy(direction.normalize().multiplyScalar(distance)); controls.target.set(0,0,0); controls.update(); requestRender();
  }
  try {
    if(signal?.aborted){dispose();throw new DOMException('Model loading cancelled.','AbortError');}
    signal?.addEventListener('abort',dispose,{once:true});
    renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');
    renderer.domElement.setAttribute('aria-label','Interactive PCB. Drag to orbit. Arrow keys rotate; plus and minus zoom; Home resets. Scroll zooms only while this view is focused. Click a component for details, or use the Component selector below. Escape clears the selection.');
    renderer.domElement.addEventListener('webglcontextlost',lost);
    renderer.domElement.addEventListener('keydown',keyboard);
    host.replaceChildren(renderer.domElement);
    const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;resources.add(environment);room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff,0x5d6755,.7));
    for (const [position,intensity] of [[[1,2,3],1.5], [[-2,-1,2],.7], [[0,0,-2],1]]) {
      const light=new THREE.DirectionalLight(0xfff8e9,intensity);light.position.set(...position);scene.add(light);
    }
    const loader=new GLTFLoader();
    // Abort a hung transfer. GLTFLoader receives the bytes only after a same-origin fetch.
    const timeout=setTimeout(()=>abort.abort(),30000);
    let buffer;
    try { const response=await fetch(modelUrl,{signal:abort.signal});if(!response.ok)throw new Error(`Model request returned ${response.status}`);buffer=await response.arrayBuffer(); }
    finally {clearTimeout(timeout);}
    if(disposed)throw new DOMException('Model loading cancelled.','AbortError');
    gltf=await loader.parseAsync(buffer, new URL('.', new URL(modelUrl,location.href)).href);
    model=gltf.scene;if(disposed){scene.add(model);disposed=false;dispose();throw new Error('Viewer closed during loading.');}
    model.traverse(object=>{if(!object.isMesh)return;for(const material of (Array.isArray(object.material)?object.material:[object.material])){if(material.transparent){material.depthWrite=false;material.side=THREE.FrontSide;}}});
    // Apply the current UI choice before the first frame or index request.
    setNativeAccessoriesVisible(model,accessoriesVisible);
    // KiCad 10 GLB: X/Z are board coordinates and +Y is the front. Rotate to Z-up for inspection.
    model.rotation.x=Math.PI/2;model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);const center=bounds.getCenter(new THREE.Vector3());const dimensions=bounds.getSize(new THREE.Vector3());
    model.position.sub(center);scene.add(model);size=Math.max(dimensions.x,dimensions.y,dimensions.z);
    homeDistance=size/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.04;
    camera.near=size/1000;camera.far=size*100;camera.updateProjectionMatrix();
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.enableZoom=false;
    controls.minDistance=size*.08;controls.maxDistance=size*8;controls.rotateSpeed=.7;
    controls.addEventListener('change',requestRender);
    renderer.domElement.style.touchAction='pan-y';
    // Intentional activation prevents ordinary document scrolling being trapped by the hero.
    renderer.domElement.addEventListener('pointerdown',startPointer);
    renderer.domElement.addEventListener('pointermove',movePointer);
    renderer.domElement.addEventListener('pointerup',endPointer,true);
    renderer.domElement.addEventListener('pointercancel',cancelPointer);
    renderer.domElement.addEventListener('lostpointercapture',cancelPointer);
    renderer.domElement.addEventListener('pointerleave',clearHover);
    renderer.domElement.addEventListener('focus',()=>controls.enableZoom=true);
    renderer.domElement.addEventListener('blur',()=>controls.enableZoom=false);
    // Single-finger movement scrolls the page; two-finger gestures zoom/orbit the model.
    controls.touches.ONE=THREE.TOUCH.PAN;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
    resize=new ResizeObserver(()=>{const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestRender();});resize.observe(host);
    document.addEventListener('visibilitychange',visibility);
    renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();setCamera('reset');requestRender();
    return {dispose,setCamera,setComponentIndex,selectComponent,focusComponent,setAccessoriesVisible(value){accessoriesVisible=Boolean(value);setNativeAccessoriesVisible(model,accessoriesVisible);accessories?.setVisible(accessoriesVisible);requestRender();},getAccessories(){return accessories?.items??[];},stats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries})};
  } catch(error) {dispose();throw error;}
}
