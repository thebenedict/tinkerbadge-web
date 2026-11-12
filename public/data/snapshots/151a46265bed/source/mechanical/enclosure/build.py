#!/usr/bin/env python3
"""Parametric stepped sandwich enclosure. Coordinates: mm, PCB front at z=0.

Exports real OpenCascade solids as STEP, printable STL, plate DXF, and a
matching indexed GLB for the web viewer. No hardware design is modified.
"""
from __future__ import annotations
import hashlib
import importlib.metadata
import json
import math
import subprocess
import sys
from pathlib import Path
import zipfile
import numpy as np
import trimesh
from build123d import (Align, Axis, Box, Circle, Color, Compound, Cylinder,
                       ExportDXF, Face, Polygon, Pos, RectangleRounded,
                       Rot, extrude, export_step, export_stl, import_step, offset)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / 'exports'
P = json.loads((HERE/'parameters.json').read_text())
I = json.loads((HERE/'interfaces.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
if (ROOT/I['board']).exists() and sha(ROOT/I['board']) != I['board_sha256']:
    raise SystemExit('Board changed: rerun extract_interfaces.py and review the new datums.')

def xy(ref): return I['references'][ref]['xy_mm']
def box(x,y,z,w,h,d):
    return Pos(x,y,z)*Box(w,h,d,align=(Align.CENTER,Align.CENTER,Align.MIN))
def cyl(x,y,z,r,h):
    return Pos(x,y,z)*Cylinder(r,h,align=(Align.CENTER,Align.CENTER,Align.MIN))
def slab(profile,z,t): return Pos(0,0,z)*extrude(profile,amount=t)
def rounded(x,y,w,h,r): return Pos(x,y)*RectangleRounded(w,h,r)
def cut_holes(part,refs,r,z,h):
    for ref in refs:
        part = part-cyl(*xy(ref),z,r,h)
    return part

outer=Polygon(*(tuple(p) for p in P['outer_outline_mm']),align=None)
inner=offset(outer,amount=-P['wall_mm'])
front_z=P['front_z_mm']; thick=P['panel_thickness_mm']; rear_z=P['rear_z_mm']
rear_inner=rear_z+thick
mounts=['H1','H2','H3','H4']; cords=['H5','H6']
hole_r=P['fastener_clearance_mm']/2
parts=[]
def add(key,label,shape,group,color,explode,description,process='Printed prototype'):
    if not hasattr(shape,'is_valid'):shape=Compound(children=list(shape))
    shape.label=label;shape.color=Color(*color)
    parts.append({'id':key,'label':label,'shape':shape,'group':group,'color':color,
                  'explode_mm':explode,'description':description,'process':process})

# Clear plates share the same outline. Cord holes align with PCB holes; spacers
# are separate from the frame so the PCB can drop onto the rear supports.
front=slab(outer,front_z,thick)
rear=slab(outer,rear_z,thick)
for refs,r in [(mounts,hole_r),(cords,2.1)]:
    front=cut_holes(front,refs,r,-15,30)
    rear=cut_holes(rear,refs,r,-15,30)

# Front socket plus key and mating clearance. Separate receiver/emitter windows
# break the clear cover's optical path rather than sharing one sheet.
sx,sy=xy('J502')
sao=rounded(sx,sy,14.1,7.4,.5)+rounded(sx,sy+3.5,5.1,2.4,.3)
passive=rounded(-15,-29.7,13,9,.7)
emitter=rounded(-5,-28.6,5.8,6.2,.6)
for aperture in [sao,passive,emitter]: front=front-slab(aperture,front_z-.2,thick+.4)

# Dock opening is a recessed pin access well, not a complete dock design.
dock=rounded(-31,-35.5,17,9,1)
rear=rear-slab(dock,rear_z-.2,thick+.4)

# Full-height perimeter; the local component port holes are cut before export.
frame=slab(outer-inner,rear_inner,front_z-rear_inner)
# The antenna projects above the lowered PCB shoulder: reserve its actual body
# through the frame rather than treating the PCB outline as the assembly edge.
frame=frame-box(-25,36.5,-.05,20,10,4.25)
for ref,w,h,z in [('J101',14,6,-.3),('J501',10,5,-.3)]:
    x,y=xy(ref); frame=frame-box(57,y,z,12,w,h)
# Two direct finger-access recesses, with a separate narrow reset pinhole.
for ref in ['SW401','SW402']:
    x,y=xy(ref); frame=frame-box(-57,y,-.1,12,7,3.8)
x,y=xy('SW403')
frame=frame-(Pos(-63,y,.65)*Rot(0,90,0)*Cylinder(.9,12,align=(Align.CENTER,Align.CENTER,Align.MIN)))
# Leave room around flex's outer loop; this is an internal relief, not a port.
frame=frame-box(53.8,2.55,.1,3.5,14,5.7)

for ref in mounts:
    x,y=xy(ref)
    boss=cyl(x,y,rear_inner,2.25,-1.6-rear_inner)
    bridge=box(math.copysign(54.25,x),y,rear_inner,6.5,4.5,-1.6-rear_inner)
    frame=frame.fuse(boss,bridge)
frame=cut_holes(frame,mounts,hole_r,rear_z-1,30)

# Removable front posts incorporate small display-support shelves. Compliant
# pads and permitted panel support areas must be checked against the real panel.
for n,ref in enumerate(mounts):
    x,y=xy(ref);post=cyl(x,y,0,2.25,front_z)
    px=(-44.8 if x<0 else 46.8);py=(y if y>0 else -23.7)
    arm=box((x+px)/2,(y+py)/2,3.4,abs(px-x)+2,abs(py-y)+2, .7)
    post=post+arm
    post=post-cyl(x,y,-.1,hole_r,front_z+.2)
    add('support-'+ref,'Display support '+ref,post,'supports',[.18,.21,.22,1],[0,0,15],
        'Removable post and provisional support shelf; 0.4 mm compliant pad beneath the inactive glass border.')

# Open windows expose the RGB LEDs directly. The upper opening is split
# around the socket; no separate inserts or light guides are fitted.
light_profiles=[]
for n,ref in enumerate(['D404','D405','D406','D407','D408']):
    x,y=xy(ref);light_profiles.append((f'affinity-{n+1}',f'Affinity LED window {n+1}',rounded(x,y,11,3.6,1.4)))
light_profiles += [('role-left','Role LED window, long',rounded(15.25,37,23.5,3.6,1.4)),
                   ('role-right','Role LED window, short',rounded(47.65,37,6.3,3.6,1.4))]
for key,label,profile in light_profiles:
    front=front-slab(offset(profile,amount=.15),front_z-.2,thick+.4)

# Optical liner bonds to cover underside; no full-height wall over unknown
# component bodies. The one reviewed divider corridor extends toward the PCB.
liner_profile=rounded(-10,-30.4,24,11.8,.8)-passive-emitter
for _,_,profile in light_profiles:liner_profile=liner_profile-offset(profile,amount=.7)
liner=slab(liner_profile,5.6,.8)
liner=liner+box(-8.15,-30.5,.25,.5,10.5,6.15)
add('optical-baffle','Sensor light barrier',liner,'optics',[.10,.12,.13,1],[0,0,22],
    'Separate open apertures for the passive sensors and transmitter; black divider in the reviewed corridor. Optical angle and light leakage need measurement.')

add('frame','Stepped perimeter frame',frame,'frame',[.16,.20,.21,1],[0,0,0],
    'Printed frame with rear PCB supports, left button access, recessed reset, right-side ports and flex relief.')
add('front','Clear front plate',front,'front',[.76,.89,.91,.22],[0,0,35],
    '1.5 mm clear plate with open RGB LED windows and separate sensor apertures; stepped outline follows the board shoulder.','Cut clear sheet')
add('rear','Clear rear plate',rear,'rear',[.76,.89,.91,.25],[0,0,-28],
    '1.5 mm clear plate with aligned cord holes and recessed dock-pad access.','Cut clear sheet')

# Battery guide rails sit on the removable back, leaving the connector side
# and cell thickness free. Retention tape is specified as a prototype operation.
bx,by=xy('MECH_BATTERY')
cradle=box(bx-18.9,by,rear_inner,1.2,56,1.5)+box(bx,by-28.9,rear_inner,39,1.2,1.5)
add('battery-guide','Battery locating rails',cradle,'rear',[.16,.20,.21,1],[0,0,-28],
    'Two removable locating rails; the cell is retained with removable tape. Exact pack, swelling allowance, cable route and thermal coupling remain to qualify.')

# Simplified fastener envelopes show assembly and reserve the screw passages.
for ref in mounts:
    x,y=xy(ref)
    screw=cyl(x,y,rear_z-1,1,front_z+thick-rear_z+1)+cyl(x,y,front_z+thick,2,1.2)
    add('screw-'+ref,'M2 fastener '+ref,screw,'fasteners',[.15,.17,.18,1],[0,0,42],
        'M2 clearance envelope. Final length, nut and material selection follow the fit prototype.','Fastener envelope')

def check_shape(shape):
    return bool(shape.is_valid),len(shape.solids()),float(shape.volume)

def build():
    OUT.mkdir(exist_ok=True)
    previous=json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else {}
    checks=[];scene=trimesh.Scene();records=[]
    for p in parts:
        s=p['shape']; valid,nsol,vol=check_shape(s)
        if not valid or nsol<1 or vol<=0: raise RuntimeError('Invalid solid: '+p['id'])
        step=OUT/(p['id']+'.step');stl=OUT/(p['id']+'.stl')
        export_step(s,str(step));export_stl(s,str(stl),tolerance=P['mesh_tolerance_mm'],angular_tolerance=.15)
        roundtrip=import_step(str(step))
        if not roundtrip.is_valid or abs(roundtrip.volume-vol)>max(1e-4,vol*1e-7):
            raise RuntimeError('STEP roundtrip mismatch: '+p['id'])
        vertices,faces=s.tessellate(P['mesh_tolerance_mm'],.15)
        mesh=trimesh.Trimesh(vertices=np.array([[v.X,v.Y,v.Z] for v in vertices]),faces=np.array(faces),process=True)
        # STL is independently reloaded: require every printable shell closed.
        stl_mesh=trimesh.load(str(stl),force='mesh')
        if not stl_mesh.is_watertight or not stl_mesh.is_winding_consistent:
            raise RuntimeError('STL mesh is not a closed consistently oriented shell: '+p['id'])
        rgba=np.array(p['color'])*255
        mesh.visual.material=trimesh.visual.material.PBRMaterial(name=p['id'],baseColorFactor=rgba.astype(np.uint8),metallicFactor=0,roughnessFactor=.45,alphaMode='BLEND' if p['color'][3]<1 else 'OPAQUE',doubleSided=False)
        # GLB uses metres, CAD assembly frame with +Z toward the front. Web
        # exporter records a calibrated transform into the KiCad scene.
        mesh.vertices*=.001
        mesh.metadata={'enclosurePartId':p['id'],'enclosureGroup':p['group']}
        scene.add_geometry(mesh,node_name=p['id'],geom_name=p['id'])
        b=s.bounding_box()
        records.append({k:v for k,v in p.items() if k!='shape'}|{'bounds_mm':[[b.min.X,b.min.Y,b.min.Z],[b.max.X,b.max.Y,b.max.Z]],'volume_mm3':round(vol,5),'solids':nsol,'step':step.name,'stl':stl.name})
        checks.append({'part':p['id'],'brep_valid':valid,'step_roundtrip':True,'stl_watertight':True,'stl_winding_consistent':True})
    assembly=Compound(label=P['name'],children=[p['shape'] for p in parts])
    export_step(assembly,str(OUT/'enclosure.step'))
    (OUT/'enclosure.glb').write_bytes(scene.export(file_type='glb'))
    for key,s,z in [('front',front,front_z),('rear',rear,rear_z)]:
        bottom=min(s.faces().filter_by(Axis.Z),key=lambda f:f.center().Z)
        drawing=ExportDXF();drawing.add_shape(Pos(0,0,-z)*bottom);drawing.write(str(OUT/(key+'.dxf')))
    # Basic numerical design checks, not a substitute for full component fit.
    glass_top=P['glass_underside_mm']+P['glass_mm'][2]
    checks += [{'check':'glass_to_cover_nominal_mm','value':round(front_z-glass_top,3),'passed':front_z>glass_top},
               {'check':'battery_rear_clearance_nominal_mm','value':round(P['battery_top_z_mm']-P['battery_mm'][2]-rear_inner,3),'passed':P['battery_top_z_mm']-P['battery_mm'][2]>rear_inner}]
    # Pairwise volumes catch unintended part intersections. Screws intentionally
    # pass through all layers; supports touch, but must not intersect them.
    collisions=[]
    for j,a in enumerate(parts):
        for b in parts[j+1:]:
            if a['group']=='fasteners' or b['group']=='fasteners':continue
            common=a['shape'].intersect(b['shape'])
            volume=common.volume if common else 0
            if volume>1e-4:collisions.append({'parts':[a['id'],b['id']],'volume_mm3':round(volume,5)})
    report={'checks':checks,'part_intersections':collisions,'pending':['Exact glass support and adhesive zones','Battery model selection, swelling and thermal coupling','Full native component solid interference and tolerances','USB/Qwiic cable and SAO insertion sweeps','RGB LED visibility, sensor field of view and IR/visible isolation','RF/NFC through assembled case','Dock pin stroke, guide and polarity design','Human visual review and physical fit prototype']}
    (OUT/'checks.json').write_text(json.dumps(report,indent=2)+'\n')
    if collisions: raise RuntimeError('Enclosure parts intersect; see exports/checks.json')
    if (ROOT/I['board']).exists():
        native=json.loads(subprocess.check_output([sys.executable,str(HERE/'check_native_fit.py')],text=True))
        (OUT/'native-fit.json').write_text(json.dumps(native,indent=2)+'\n')
    # Remove only superseded part exports owned by the preceding manifest.
    active={p['id'] for p in parts}
    for old in previous.get('parts',[]):
        if old['id'] not in active:
            for suffix in ['.step','.stl']:
                filename=old['id']+suffix
                if Path(filename).name!=filename:raise RuntimeError('Unsafe old part filename')
                (OUT/filename).unlink(missing_ok=True)
    manifest={'schema_version':1,'revision':P['revision'],'name':P['name'],'status':'Fit prototype',
              'board_sha256':I['board_sha256'],'datum':I['datum'],
              'size_mm':[116,86,round(front_z+thick-rear_z,3)],
              'parts':records,'parameters':P,'checks':'checks.json',
              'tools':{n:importlib.metadata.version(n) for n in ['build123d','cadquery-ocp','trimesh']},
              'source_hashes':{p.name:sha(p) for p in [HERE/'build.py',HERE/'parameters.json',HERE/'interfaces.json',HERE/'extract_interfaces.py',HERE/'check_native_fit.py',HERE/'README.md',HERE/'review.md']}}
    manifest['output_hashes']={p.name:sha(p) for p in sorted(OUT.iterdir()) if p.suffix in ['.step','.stl','.glb','.dxf'] or p.name in ['checks.json','native-fit.json']}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    with zipfile.ZipFile(OUT/'enclosure-cad.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(OUT.iterdir()):
            if p.name!='enclosure-cad.zip':z.write(p,'exports/'+p.name)
        for p in [HERE/'build.py',HERE/'extract_interfaces.py',HERE/'check_native_fit.py',HERE/'parameters.json',HERE/'interfaces.json',HERE/'requirements.txt',HERE/'README.md',HERE/'review.md']:
            z.write(p,p.name)
    print(json.dumps({'parts':len(parts),'checks':len(checks),'collisions':len(collisions),'board_sha256':I['board_sha256']}))

if __name__=='__main__':build()
