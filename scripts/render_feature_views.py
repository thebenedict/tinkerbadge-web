#!/usr/bin/env python3
"""Native orthographic overview renders calibrated against frozen NPTH holes.

Reads a completed immutable viewer snapshot, never the live hardware project.
Only private render copies change: named review bodies are made visible and the
panel and battery are omitted only in the component view. PNG transforms use six native
mounting holes, not estimated from KiCad camera settings or image margins.
"""
from __future__ import annotations
import argparse, hashlib, json, math, re, shutil, struct, subprocess, sys, tempfile, zlib
from collections import deque
from pathlib import Path
from kicad_source import child, children, prop, sexpr, sha, outline_bounds
from export_assets import immediate_sexpr_spans, make_poster_input
ROOT=Path(__file__).resolve().parents[1]
CLI='/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli'
BOARD_SHA='dafa93e938c3cc8b44d3bd1bc96028d27d44f320e9012c124e3212df88432e70'
# Checked native outline: left-open shoulder at y106.75, extending to x154.5.
# These asymmetric probes are clear of source components and mounting drills.
ORIENTATION_PROBES=[{'pcbMm':[102,103],'material':False},{'pcbMm':[110,103],'material':False},{'pcbMm':[200,103],'material':True}]


def png_channel(path, channel=3):
    """Decode a selected PNG channel, with all five PNG row filters (no extra packages)."""
    data=Path(path).read_bytes()
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise RuntimeError('Expected a PNG image')
    offset=8;compressed=[];header=None
    while offset<len(data):
        length=struct.unpack('>I',data[offset:offset+4])[0];kind=data[offset+4:offset+8];payload=data[offset+8:offset+8+length]
        stored_crc=struct.unpack('>I',data[offset+8+length:offset+12+length])[0]
        if zlib.crc32(kind+payload)&0xffffffff!=stored_crc:raise RuntimeError('PNG chunk integrity check failed')
        if kind==b'IHDR':header=struct.unpack('>IIBBBBB',payload)
        elif kind==b'IDAT':compressed.append(payload)
        elif kind==b'IEND':break
        offset+=length+12
    if not header:raise RuntimeError('Missing PNG header')
    width,height,depth,color,compression,filter_method,interlace=header
    if (depth,color,compression,filter_method,interlace)!=(8,6,0,0,0):raise RuntimeError('Calibration requires non-interlaced 8-bit RGBA PNG')
    raw=zlib.decompress(b''.join(compressed));stride=width*4+1
    if len(raw)!=stride*height:raise RuntimeError('Invalid PNG scanline size')
    result=bytearray(width*height);previous=bytearray(width)
    for y in range(height):
        start=y*stride;filter_type=raw[start];line=bytearray(raw[start+1+channel:start+stride:4])
        if filter_type not in range(5):raise RuntimeError('Unknown PNG filter')
        if filter_type:
            left=upper_left=0
            for x in range(width):
                up=previous[x]
                if filter_type==1:prediction=left
                elif filter_type==2:prediction=up
                elif filter_type==3:prediction=(left+up)//2
                else:
                    predictor=left+up-upper_left;distances=(abs(predictor-left),abs(predictor-up),abs(predictor-upper_left))
                    prediction=(left,up,upper_left)[distances.index(min(distances))]
                line[x]=(line[x]+prediction)&255;left=line[x];upper_left=up
        result[y*width:(y+1)*width]=line;previous=line
    return width,height,result


def enclosed_holes(width,height,intensity,threshold=5,min_area=120):
    """Find dark connected regions that do not touch the canvas edge."""
    visited=bytearray(width*height);found=[]
    for start,a in enumerate(intensity):
        if a>threshold or visited[start]:continue
        visited[start]=1;queue=deque([start]);count=sx=sy=0;xmin=width;ymin=height;xmax=ymax=0;edge=False
        while queue:
            i=queue.popleft();y,x=divmod(i,width);count+=1;sx+=x+.5;sy+=y+.5
            xmin=min(xmin,x);xmax=max(xmax,x);ymin=min(ymin,y);ymax=max(ymax,y)
            if x==0 or x==width-1 or y==0 or y==height-1:edge=True
            for neighbor in (i-1 if x else -1,i+1 if x+1<width else -1,i-width if y else -1,i+width if y+1<height else -1):
                if neighbor>=0 and not visited[neighbor] and intensity[neighbor]<=threshold:
                    visited[neighbor]=1;queue.append(neighbor)
        if not edge and count>=min_area:
            w=xmax-xmin+1;h=ymax-ymin+1
            if .8<=w/h<=1.25:
                found.append({'center':[sx/count,sy/count],'area':count,'bounds':[xmin,ymin,w,h]})
    return found


def source_holes(board):
    parsed=sexpr(Path(board).read_text());result=[]
    for fp in children(parsed,'footprint'):
        ref=prop(fp).get('Reference','')
        if ref not in ['H1','H2','H3','H4','H5','H6']:continue
        pads=[p for p in children(fp,'pad') if p[2:4]==['np_thru_hole','circle']]
        if len(pads)!=1:raise RuntimeError(f'{ref}: mounting hole is not one native circular NPTH')
        pad=pads[0];at=child(fp,'at');pad_at=child(pad,'at');drill=child(pad,'drill')
        if [float(n) for n in pad_at[1:3]]!=[0,0] or len(drill)!=2:raise RuntimeError(f'{ref}: unsupported mounting-hole offset or drill')
        result.append({'reference':ref,'uuid':next(p[1] for p in children(fp,'uuid')),'pcbMm':[float(at[1]),float(at[2])],'drillMm':float(drill[1])})
    if len(result)!=6:raise RuntimeError('The pinned board must contain all six calibration mounting holes')
    return sorted(result,key=lambda p:p['reference'])


def linear_fit(xs,ys):
    mx=sum(xs)/len(xs);my=sum(ys)/len(ys);den=sum((x-mx)**2 for x in xs)
    if den<1e-12:raise RuntimeError('Degenerate calibration anchors')
    scale=sum((x-mx)*(y-my) for x,y in zip(xs,ys))/den
    return scale,my-scale*mx


def calibrate(holes,regions,view):
    """Find the exact mounting pattern, then fit independent orthographic axes."""
    h1=next(h for h in holes if h['reference']=='H1');h2=next(h for h in holes if h['reference']=='H2')
    if view not in ['front','back']:raise RuntimeError('Calibration requires the physical board side')
    matches=[];xsign=1 if view=='front' else -1
    for left in regions:
        for right in regions:
            if left is right or abs(left['center'][1]-right['center'][1])>.8:continue
            scale=(right['center'][0]-left['center'][0])/(h2['pcbMm'][0]-h1['pcbMm'][0])
            if scale*xsign<=0:continue
            offset=left['center'][0]-scale*h1['pcbMm'][0]
            for ysign in [1,-1]:
                yscale=abs(scale)*ysign;yoffset=left['center'][1]-yscale*h1['pcbMm'][1];paired=[]
                for hole in holes:
                    target=[scale*hole['pcbMm'][0]+offset,yscale*hole['pcbMm'][1]+yoffset]
                    candidate=min(regions,key=lambda r:math.dist(r['center'],target))
                    if math.dist(candidate['center'],target)>1.2:break
                    if abs(candidate['bounds'][2]/abs(scale)-hole['drillMm'])>.4:break
                    paired.append((hole,candidate))
                if len(paired)!=6 or len({id(r) for _,r in paired})!=6:continue
                a,c=linear_fit([h['pcbMm'][0] for h,r in paired],[r['center'][0] for h,r in paired])
                e,f=linear_fit([h['pcbMm'][1] for h,r in paired],[r['center'][1] for h,r in paired])
                residuals=[math.dist([a*h['pcbMm'][0]+c,e*h['pcbMm'][1]+f],r['center']) for h,r in paired]
                if max(residuals)>.6 or abs(abs(a)-abs(e))>.005 or e<=0:continue
                matches.append({'pcbToImage':[a,0,c,0,e,f],'maxResidualPx':max(residuals),
                    'rmsResidualPx':math.sqrt(sum(r*r for r in residuals)/len(residuals)),
                    'anchors':[{**h,'imagePx':r['center'],'regionAreaPx':r['area'],'regionBoundsPx':r['bounds'],'residualPx':res} for (h,r),res in zip(paired,residuals)]})
    if len(matches)!=1:raise RuntimeError(f'{view}: expected one verified six-hole calibration, found {len(matches)} among {len(regions)} image holes')
    return matches[0]


def verify_orientation(path, fit):
    """Resolve the mirror ambiguity of the symmetric mounting-hole pattern."""
    width,height,alpha=png_channel(path);a,b,c,d,e,f=fit['pcbToImage'];results=[]
    for probe in ORIENTATION_PROBES:
        x,y=probe['pcbMm'];px,py=a*x+b*y+c,d*x+e*y+f;ix,iy=math.floor(px),math.floor(py)
        if not (2<=ix<width-2 and 2<=iy<height-2):raise RuntimeError('Outline orientation probe is outside the image')
        samples=[alpha[j*width+i] for j in range(iy-2,iy+3) for i in range(ix-2,ix+3)]
        if (min(samples)<250 if probe['material'] else max(samples)>0):
            raise RuntimeError('Native outline orientation does not match the calibrated board side')
        results.append({**probe,'imagePx':[px,py],'alphaRange':[min(samples),max(samples)]})
    return {'method':'asymmetric native left-open shoulder material/transparency probes','sourceBoardSha256':BOARD_SHA,'probes':results}


def prepare_inputs(snapshot,work):
    source=snapshot/'source';board=source/'tinkerbadge.kicad_pcb';index=json.loads((snapshot/'badge/components.json').read_text())
    if sha(board)!=BOARD_SHA:raise RuntimeError('Frozen board does not match the checked source')
    models={}
    for component in index['components']+index.get('accessories',[]):
        for model in component['modelSources']:
            if not model.get('sourcePath'):continue
            path=source/model['sourcePath']
            if not path.resolve().is_relative_to(source.resolve()) or sha(path)!=model['sourceSha256']:raise RuntimeError('Frozen model hash or path mismatch')
            if model['path'] in models and models[model['path']]!=path:raise RuntimeError('Ambiguous model path')
            models[model['path']]=path
    def replace(match):
        raw=json.loads(match[1])
        if raw not in models:raise RuntimeError('Unverified render model: '+raw)
        return '(model '+json.dumps(str(models[raw].resolve()))
    text=re.sub(r'\(model\s+("(?:\\.|[^"\\])*")',replace,board.read_text())
    (work/'original.kicad_pcb').write_text(text)
    adjusted=make_poster_input(work/'original.kicad_pcb',work/'front.kicad_pcb',['MECH_PANEL','MECH_BATTERY','RES_J502'])
    text=(work/'front.kicad_pcb').read_text()
    (work/'back.kicad_pcb').write_text(text)
    omitted=['MECH_PANEL','MECH_BATTERY'];changes=[];removed=[]
    for start,end in immediate_sexpr_spans(text):
        chunk=text[start:end];node=sexpr(chunk);reference=prop(node).get('Reference') if node[0]=='footprint' else None
        if reference in omitted:
            spans=[(a,b) for a,b in immediate_sexpr_spans(chunk) if sexpr(chunk[a:b])[0]=='model']
            if len(spans)!=1:raise RuntimeError(f'{reference}: expected exactly one source model')
            for a,b in reversed(spans):chunk=chunk[:a]+chunk[b:]
            changes.append((start,end,chunk));removed.append(reference)
    if set(removed)!=set(omitted):raise RuntimeError('An accessory model requested for omission was not found')
    for a,b,chunk in reversed(changes):text=text[:a]+chunk+text[b:]
    (work/'components.kicad_pcb').write_text(text)
    return {view:{'visible':[r for r in adjusted if r not in missing],'omitted':missing}
            for view,missing in [('front',[]),('components',omitted),('back',[])]}


def load_snapshot(snapshot_id=None):
    manifest=json.loads((ROOT/'public/data/manifest.json').read_text())
    snapshot_id=snapshot_id or manifest['snapshot']['id']
    if snapshot_id!=manifest['snapshot']['id']:raise RuntimeError('Feature renders must use the active reviewed snapshot')
    if manifest['snapshot']['sourceHashes'].get('tinkerbadge.kicad_pcb')!=BOARD_SHA:raise RuntimeError('Active source board is not the pinned reviewed revision')
    for relative,expected in manifest['snapshot']['outputHashes'].items():
        path=ROOT/'public'/relative
        if not path.resolve().is_relative_to((ROOT/'public/data/snapshots'/snapshot_id).resolve()) or sha(path)!=expected:
            raise RuntimeError('Snapshot artifact hash or path mismatch')
    return snapshot_id,ROOT/'public/data/snapshots'/snapshot_id


def generate(args):
    snapshot_id,snapshot=load_snapshot(args.snapshot)
    files={p.relative_to(snapshot).as_posix():sha(p) for p in snapshot.rglob('*') if p.is_file()}
    work=ROOT/'.work/feature-renders'/snapshot_id;work.mkdir(parents=True,exist_ok=True)
    visibility=prepare_inputs(snapshot,work);native_board=snapshot/'source/tinkerbadge.kicad_pcb';holes=source_holes(native_board)
    bounds=outline_bounds(sexpr(native_board.read_text()))
    if not bounds:raise RuntimeError('A verified source board outline is required')
    bounds=[round(v,6) for v in bounds];x,y,w,h=bounds
    frame=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]
    views=[];version=subprocess.check_output([args.kicad_cli,'version'],text=True).strip()
    for view,physical_side,side in [('front','front','top'),('components','front','top'),('back','back','bottom')]:
        output=work/(view+'.png');board=work/(view+'.kicad_pcb')
        options=['pcb','render','--output',str(output),'--width','1600','--height','1600','--side',side,'--background','transparent','--quality','basic','--use-board-stackup-colors','--zoom','0.90','--rotate','0,0,0',str(board)]
        result=subprocess.run([args.kicad_cli,*options],capture_output=True,text=True,timeout=300)
        (work/(view+'-render.log')).write_text(result.stdout+'\n'+result.stderr)
        if result.returncode:raise RuntimeError(f'{view} native render failed: '+result.stderr)
        width,height,red=png_channel(output,0);_,_,green=png_channel(output,1);_,_,blue=png_channel(output,2)
        intensity=bytearray(max(r,g,b) for r,g,b in zip(red,green,blue))
        regions=enclosed_holes(width,height,intensity);fit=calibrate(holes,regions,physical_side)
        orientation=verify_orientation(output,fit)
        # Recompute framing from this snapshot's actual source outline.
        a,b,c,d,e,f=fit['pcbToImage']
        projected=[[a*x+b*y+c,d*x+e*y+f] for x,y in frame]
        if any(not (2<x<width-2 and 2<y<height-2) for x,y in projected):raise RuntimeError('Source board frame is cropped')
        views.append({'id':view,'side':physical_side,'image':view+'.png','width':width,'height':height,'sha256':sha(output),
            **fit,'orientationVerification':orientation,'boardFrameMm':{'outline':bounds,'checkedFrame':bounds},
            'calibration':{'method':'six native circular NPTH mounting-hole dark-region centroids','maxRgbThreshold':5,
                'pixelConvention':'Continuous pixels; pixel centers are integer index + 0.5','maxAllowedResidualPx':.6,'measuredRegions':len(regions)},
            'render':{'tool':'kicad-cli','version':version,'projection':'orthographic','side':side,
                'args':['pcb','render','--output',view+'.png',*options[4:-1],view+'.kicad_pcb'],
                'privateCopySha256':sha(board),'sourceModelsVisible':visibility[view]['visible'],
                'sourceModelsOmitted':visibility[view]['omitted']}})
        print(f'{view}: {width}x{height}, affine {fit["pcbToImage"]}, max residual {fit["maxResidualPx"]:.4f}px',flush=True)
    if files!={p.relative_to(snapshot).as_posix():sha(p) for p in snapshot.rglob('*') if p.is_file()}:raise RuntimeError('Frozen snapshot changed during rendering')
    metadata={'schemaVersion':1,'snapshotId':snapshot_id,'boardSha256':BOARD_SHA,'views':views,
        'provenance':{'source':'Existing frozen native KiCad snapshot; no live hardware reads','snapshotSource':'data/snapshots/'+snapshot_id+'/source/tinkerbadge.kicad_pcb',
            'generator':'scripts/render_feature_views.py','generatorSha256':sha(__file__),
            'snapshotUnchanged':True,'calibrationDescription':'Native mounting-hole UUIDs and dimensions matched to measured PNG dark circular drill regions; six measured anchors constrain each transform, and asymmetric native-shoulder transparency independently verifies mirroring.'}}
    args.output.mkdir(parents=True,exist_ok=True)
    for view in views:shutil.copyfile(work/view['image'],args.output/view['image'])
    temporary=args.output/'.renders.tmp';temporary.write_text(json.dumps(metadata,indent=2)+'\n');temporary.replace(args.output/'renders.json')
    return metadata


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot',help='Require this active snapshot ID; otherwise use the current manifest.');parser.add_argument('--output',type=Path,default=ROOT/'public/features/badge')
    parser.add_argument('--kicad-cli',default=CLI)
    generate(parser.parse_args())

if __name__=='__main__':main()
