#!/usr/bin/env python3
"""Render the exact case mesh with a private copy of the frozen KiCad board.
Requires trimesh. Never changes the snapshot or native hardware.
"""
import json, hashlib, subprocess
from pathlib import Path
import trimesh
from render_feature_views import prepare_inputs,CLI
root=Path(__file__).resolve().parents[1];public=root/'public'
manifest=json.loads((public/'data/manifest.json').read_text());variant=manifest['variants'][0];case=variant['enclosure'];snapshot=public/'data/snapshots'/manifest['snapshot']['id']
work=root/'.work/enclosure-render';work.mkdir(parents=True,exist_ok=True);prepare_inputs(snapshot,work)
parts={p['id']:p for p in case['parts']};meshfile=public/case['modelUrl'];scene=trimesh.load(meshfile,force='scene',process=False)
wrl=['#VRML V2.0 utf8']
for name in scene.graph.nodes_geometry:
 pose,key=scene.graph[name];mesh=scene.geometry[key];vertices=trimesh.transform_points(mesh.vertices,pose)*1000/2.54
 part=parts[name];color=[.12,.16,.16];transparency=0
 if part['group']=='front' or name=='rear':color=[.75,.88,.87];transparency=.84
 elif part['group']=='diffusers':color=[.45,.8,.7]
 elif part['group']=='hardware':color=[.7,.72,.72]
 wrl.append('Shape { appearance Appearance { material Material { diffuseColor '+' '.join(map(str,color))+' transparency '+str(transparency)+' } } geometry IndexedFaceSet { coord Coordinate { point [ '+', '.join(' '.join(f'{x:.6f}' for x in v) for v in vertices)+' ] } coordIndex [ '+', '.join(' '.join(map(str,[*f,-1])) for f in mesh.faces)+' ] solid TRUE } }')
model=work/'enclosure.wrl';model.write_text('\n'.join(wrl));board=work/'front.kicad_pcb';text=board.read_text();at=text.rfind(')');text=text[:at]+'\n(footprint "Enclosure_render" (layer "F.Cu") (at 155 140) (attr smd) (model '+json.dumps(str(model))+' (offset (xyz 0 0 0)) (scale (xyz 1 1 1)) (rotate (xyz 0 0 0))))\n'+text[at:];board.write_text(text)
out=public/'data/enclosure/poster.png';out.parent.mkdir(parents=True,exist_ok=True)
args=[CLI,'pcb','render','--output',str(out),'--width','1200','--height','900','--side','top','--background','opaque','--quality','basic','--use-board-stackup-colors','--zoom','0.85','--rotate','15,0,-12',str(board)]
result=subprocess.run(args,capture_output=True,text=True);(work/'render.log').write_text(result.stdout+'\n'+result.stderr)
if result.returncode:raise RuntimeError(result.stderr)
source_hashes={case['modelUrl']:hashlib.sha256(meshfile.read_bytes()).hexdigest(),manifest['sourceBase']+'/tinkerbadge.kicad_pcb':hashlib.sha256((snapshot/'source/tinkerbadge.kicad_pcb').read_bytes()).hexdigest()}
(out.parent/'poster.json').write_text(json.dumps({'snapshotId':manifest['snapshot']['id'],'sources':source_hashes,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'renderer':'kicad-cli','scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},indent=2)+'\n');print(out)
