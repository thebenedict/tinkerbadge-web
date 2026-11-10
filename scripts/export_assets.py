#!/usr/bin/env python3
"""Snapshot an explicitly configured KiCad project without changing its source.
No refill, ERC/DRC, source rebuild, library update, or source write is performed.
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile, time, zipfile, uuid
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kicad_source import (sha, children, child, value, sexpr, prop, board_info,
    schematic_info, schematic_hierarchy, component_records, population_info,
    ModelResolver, vrml_box_envelope, validate_config, collect_inputs, verify_inputs, source_path)

from component_names import apply_component_names

DEFAULT_CLI = '/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli'
GLB_FLAGS = ['--include-tracks','--include-pads','--include-zones','--include-inner-copper',
             '--include-silkscreen','--include-soldermask','--cut-vias-in-body','--subst-models']
COLORS = {'F.Cu':'#df6f5a','B.Cu':'#6599de','F.SilkS':'#f5e9cd','B.SilkS':'#b5d8eb',
    'Edge.Cuts':'#d4d984','F.Mask':'#a16bc8','B.Mask':'#7287b4','F.Fab':'#aebbb9','B.Fab':'#7f9795'}

def digest(value): return hashlib.sha256(json.dumps(value,sort_keys=True).encode()).hexdigest()
def write_json(path, value): Path(path).write_text(json.dumps(value,indent=2)+'\n')
def validate_source_pins(hashes, expected):
    """Reject an unreviewed source revision before any export work begins."""
    for path, digest in expected.items():
        if not isinstance(digest,str) or not re.fullmatch(r'[0-9a-f]{64}',digest):
            raise RuntimeError(f'Invalid pinned source hash: {path}')
        if hashes.get(path)!=digest:raise RuntimeError(f'Pinned source hash mismatch: {path}')

def svg_viewbox(path): return [float(x) for x in ET.parse(path).getroot().attrib['viewBox'].split()]

def match_schematic_svgs(sheets, directory):
    """Bind complete-hierarchy exports by embedded native identity and content.

    KiCad 10.0.8's single-page SVG export can draw the root while changing page
    metadata. A successful command and unique filename are not sufficient.
    """
    generated=[]
    for path in sorted(directory.glob('*.svg')):
        tree=ET.parse(path)
        text={''.join(element.itertext()) for element in tree.iter() if element.tag.rsplit('}',1)[-1] in ['text','desc']}
        generated.append((path,text))
    if len(generated)!=len(sheets):raise RuntimeError('Schematic SVG count does not match the native sheet hierarchy')
    results={};used=set()
    for sheet in sheets:
        native_path=sheet['displayPath'];filename=Path(sheet['sourcePath']).name
        matches=[(path,text) for path,text in generated if 'Sheet: '+native_path in text and 'File: '+filename in text]
        if len(matches)!=1 or matches[0][0] in used:
            raise RuntimeError(f"{sheet['name']}: cannot uniquely verify native SVG sheet path and source file")
        path,text=matches[0];expected={symbol['renderedReference'] for symbol in sheet['symbols'] if symbol.get('renderedReference')}
        missing=expected-text
        if missing:raise RuntimeError(f"{sheet['name']}: SVG is missing native visible references: {', '.join(sorted(missing))}")
        used.add(path)
        results[sheet['id']]={'path':path,'verification':{'method':'native-svg-sheet-path-file-and-visible-references',
            'sheetPath':native_path,'sourceFile':filename,'visibleReferenceCount':len(expected),'svgSha256':sha(path)}}
    return results

class FrozenModelResolver:
    def __init__(self, inputs, relative, copied):
        self.entries = {}; self.copied = copied
        for (file, raw, original), destination in inputs['modelMap'].items():
            if file == relative:
                self.entries.setdefault(raw, []).append((Path(original).suffix.lower(), copied / destination))
    def snapshot_path(self, path): return path.relative_to(self.copied).as_posix()
    def resolve(self, raw, project_dir):
        expected = Path(raw).suffix.lower()
        return next((path for extension, path in self.entries.get(raw, []) if extension == expected), None)
    def export_candidate(self, path):
        if path and path.suffix.lower() in {'.wrl', '.vrml'}:
            for entries in self.entries.values():
                if any(candidate == path for _, candidate in entries):
                    return next((candidate for extension, candidate in entries if extension not in {'.wrl', '.vrml'}), path)
        return path

def rewrite_model_paths(pcb, resolver):
    """Change only private export copies. Native downloads retain source bytes."""
    def replacement(match):
        raw = json.loads(match[1]); candidate = resolver.export_candidate(resolver.resolve(raw, pcb.parent))
        return '(model ' + json.dumps(str(candidate)) if candidate else match[0]
    pcb.write_text(re.sub(r'\(model\s+("(?:\\.|[^"\\])*")', replacement, pcb.read_text()))


def immediate_sexpr_spans(text):
    """Byte spans of direct S-expression children, respecting quoted strings."""
    depth=0;start=None
    for match in re.finditer(r'\(|\)|"(?:\\.|[^"\\])*"|[^\s()]+',text):
        token=match[0]
        if token=='(':
            depth+=1
            if depth==2:start=match.start()
        elif token==')':
            if depth==2:yield start,match.end()
            depth-=1
    if depth:raise RuntimeError('Invalid render-copy S-expression')

def make_poster_input(pcb, output, references):
    """Enable explicitly configured review bodies only on a private render copy."""
    requested=set(references);text=pcb.read_text();changes=[];adjusted=[]
    for start,end in immediate_sexpr_spans(text):
        chunk=text[start:end];node=sexpr(chunk)
        if node[0]!='footprint' or prop(node).get('Reference') not in requested:continue
        reference=prop(node)['Reference'];attrs=child(node,'attr',[])
        if 'board_only' not in attrs or 'exclude_from_bom' not in attrs:
            raise RuntimeError(f'{reference}: poster visibility override requires an excluded board-only review footprint')
        spans=[(a,b) for a,b in immediate_sexpr_spans(chunk) if sexpr(chunk[a:b])[0]=='attr']
        if len(spans)!=1:raise RuntimeError('Ambiguous poster footprint attributes')
        a,b=spans[0];replacement=chunk[:a]+'(attr smd)'+chunk[b:]
        original=sexpr(chunk);modified=sexpr(replacement)
        if [n for n in original if not isinstance(n,list) or n[0]!='attr']!=[n for n in modified if not isinstance(n,list) or n[0]!='attr']:
            raise RuntimeError('Poster copy changed source geometry')
        changes.append((start,end,replacement));adjusted.append(reference)
    for start,end,replacement in reversed(changes):text=text[:start]+replacement+text[end:]
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(text)
    return adjusted


def separate_accessories(variant_id, info, configured, copied):
    """Explicit reference classification, checked against native non-BOM footprints."""
    records=[]; references=set(); ids=set(); remaining=list(info['components'])
    for definition in configured:
        ref=definition['reference']; key=definition['id']
        if ref in references or key in ids: raise RuntimeError('Duplicate accessory identity')
        references.add(ref);ids.add(key)
        matches=[fp for fp in remaining if fp['reference']==ref]
        if len(matches)>1: raise RuntimeError(f'{ref}: ambiguous native accessory reference')
        if not matches: continue
        fp=matches[0]
        if not fp['excludeFromBom'] or not fp.get('boardOnly'):
            raise RuntimeError(f'{ref}: accessories must be native board-only, excluded-from-BOM footprints')
        identifier=str(uuid.UUID(fp['uuid']))
        envelope=None; failure=None; fallback=definition.get('fallback')
        if fallback:
            expected=fallback.get('modelSourcePath'); models=fp['modelSources']
            if len(models)!=1 or models[0].get('sourcePath')!=expected or fp['layer']!=fallback.get('expectedLayer'):
                failure='Native accessory model or side does not match the configured source envelope.'
            else:
                try: envelope={**vrml_box_envelope(copied/expected),'sourcePath':expected}
                except RuntimeError as error: failure=str(error)
        records.append({**{k:v for k,v in definition.items() if k!='fallback'},'id':variant_id+':accessory:'+key,'key':key,'uuid':identifier,
            'value':fp['value'],'footprint':fp['footprint'],'layer':fp['layer'],
            'positionMm':{'x':fp['x'],'y':fp['y'],'rotation':fp['rotation']},
            'modelSources':fp['modelSources'],'hasModel':False,
            'modelExpected':any(m['resolved'] and not m['hidden'] for m in fp['modelSources']),
            'sourceStatus':'Proposed accessory placement','status':'proposed','excludedFromBom':True,
            'sourceEnvelope':envelope,'fallbackStatus':failure or 'Pending native geometry and coordinate validation.'})
        remaining.remove(fp)
    return {**info,'components':remaining},records


def export(args):
    cfg=json.loads(args.config.read_text()); validate_config(cfg)
    source=(args.source or ROOT/cfg['source']).resolve(); out=args.output.resolve()
    if out==source or source in out.parents: raise RuntimeError('Output must not be inside the hardware source')
    resolver=ModelResolver(source,cfg.get('modelRoots'))
    inputs=collect_inputs(source,cfg,resolver)
    hashes={rel:sha(p) for rel,p in sorted(inputs['files'].items())}
    validate_source_pins(hashes,cfg.get('snapshot',{}).get('expectedHashes',{}))
    external_hashes={rel:sha(p) for rel,p in sorted(inputs['external'].items())}
    version=subprocess.check_output([args.kicad_cli,'version'],text=True).strip()
    pipeline_files=['scripts/export_assets.py','scripts/kicad_source.py','scripts/component_names.py','scripts/optimize_glb.mjs','scripts/bind_components.mjs','src/component-index.js']
    pipeline_hashes={rel:sha(ROOT/rel) for rel in pipeline_files}
    recipe={'schema':2,'config':cfg,'inputs':hashes,'externalInputs':external_hashes,'kicad':version,'pipeline':pipeline_hashes}
    input_id=digest(recipe)[:12]; prefix=f'data/snapshots/{input_id}'
    if args.skip_existing and (out/'manifest.json').is_file():
        prev=json.loads((out/'manifest.json').read_text())
        outputs=prev.get('snapshot',{}).get('outputHashes',{})
        if prev.get('schemaVersion')==2 and prev['snapshot'].get('inputId')==input_id and outputs and all((out.parent/k).is_file() and sha(out.parent/k)==v for k,v in outputs.items()):
            verify_inputs(inputs,hashes,external_hashes)
            print(f'Reusing verified snapshot {prev["snapshot"]["id"]}'); return prev
    (out/'.staging').mkdir(parents=True,exist_ok=True)
    target=Path(tempfile.mkdtemp(prefix='snapshot-',dir=out/'.staging'))
    work=Path(tempfile.mkdtemp(prefix=input_id+'-',dir=ROOT/'.work'))
    copied=work/'source'; public_source=target/'source'
    for rel,p in {**inputs['files'],**inputs['external']}.items():
        data=p.read_bytes(); expected=hashes.get(rel,external_hashes.get(rel))
        if hashlib.sha256(data).hexdigest()!=expected: raise RuntimeError('Source changed while snapshotting')
        for base in [copied,public_source]:
            dest=base/rel; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(data)
    verify_inputs(inputs,hashes,external_hashes)
    commands=[]; warnings=list(inputs['warnings']); variants=[]
    def run(arguments,timeout=240,required=True):
        cmd=[args.kicad_cli,*map(str,arguments)]
        print('Exporting: '+' '.join(map(str,arguments[:4])),flush=True)
        started=time.monotonic()
        try:
            proc=subprocess.run(cmd,cwd=work,text=True,capture_output=True,timeout=timeout)
        except subprocess.TimeoutExpired:
            commands.append({'args':list(map(str,arguments)),'timeout':timeout})
            if required: raise RuntimeError('KiCad export timed out')
            return False
        commands.append({'args':list(map(str,arguments)),'returnCode':proc.returncode,
            'seconds':round(time.monotonic()-started,2),'stdout':proc.stdout,'stderr':proc.stderr})
        if proc.returncode:
            if required: raise RuntimeError(f'KiCad export failed ({proc.returncode}): {proc.stdout}\n{proc.stderr}')
            return False
        return True
    try:
        for original in cfg['variants']:
            v={k:original[k] for k in ['id','label','description','status','revision','facts','accessories','assembly'] if k in original}
            v.setdefault('facts',[]); v.setdefault('accessories',[]); v.update({'pcb':None,'schematic':None,'model':None,'componentsUrl':None,'warnings':list(original.get('warnings',[])),'downloads':[]})
            vid=v['id']; directory=target/vid; directory.mkdir(); url=f'{prefix}/{vid}'
            files=original['files']; pcb=copied/files['pcb'] if files.get('pcb') else None
            sch=copied/files['schematic'] if files.get('schematic') else None
            hierarchy=schematic_hierarchy(sch,copied,original.get('instanceProject')) if sch else None
            symbols=hierarchy['symbols'] if hierarchy else []
            frozen_models=FrozenModelResolver(inputs,files.get('pcb'),copied)
            info=board_info(pcb,frozen_models) if pcb else None
            accessories=[]
            if info: info,accessories=separate_accessories(vid,info,original.get('accessories',[]),copied)
            v['accessories']=accessories
            records=component_records(vid,info,symbols) if info else []
            naming=apply_component_names(original.get('componentNames'),copied,symbols,records,info['components'] if info else [])
            if naming:v['componentNaming']=naming
            population=population_info(symbols,records)
            if pcb and population['unplacedReferences']:
                v['warnings'].append(f"{len(population['unplacedReferences'])} schematic components are not placed on this PCB snapshot.")
            unmatched=[c for c in records if c['identityStatus'] not in ['verified','board-only']]
            changed=[c for c in records if c['sourceDifferences']]
            if unmatched: v['warnings'].append(f'{len(unmatched)} PCB footprints have no verified schematic association.')
            if changed: v['warnings'].append(f'{len(changed)} matched footprints have PCB/schematic property differences; component details use PCB values.')
            if sch:
                v['warnings'].extend(hierarchy['warnings']); sheets=[]
                sch_dir=directory/'schematic'; sch_dir.mkdir()
                native_sheets=work/vid/'sheets';native_sheets.mkdir(parents=True)
                run(['sch','export','svg','--output',native_sheets,sch])
                matched=match_schematic_svgs(hierarchy['sheets'],native_sheets)
                for sheet in hierarchy['sheets']:
                    key=hashlib.sha256(sheet['id'].encode()).hexdigest()[:16]
                    exported=matched[sheet['id']]
                    destination=sch_dir/(key+'.svg');shutil.copyfile(exported['path'],destination)
                    sheets.append({**sheet,'url':f'{url}/schematic/{key}.svg','viewBox':svg_viewbox(destination),'verification':exported['verification']})
                pdf=directory/'schematic.pdf'; pdf_ok=run(['sch','export','pdf','--output',pdf,sch],required=False) and pdf.is_file()
                if not pdf_ok: v['warnings'].append('Schematic PDF export is unavailable; individual SVG sheets are included.')
                v['schematic']={'sheets':sheets,'pdfUrl':f'{url}/schematic.pdf' if pdf_ok else None,
                    'nativeUrl':f'{prefix}/source/{files["schematic"]}','population':population}
                if pdf_ok: v['downloads'].append({'label':'Schematic PDF','url':v['schematic']['pdfUrl']})
                v['downloads'].append({'label':'Native schematic','url':v['schematic']['nativeUrl']})
            if pcb:
                bounds=info['outlineBounds']; viewbox=None
                if bounds:
                    x,y,w,h=bounds; viewbox=[x-1.5,y-1.5,w+3,h+3]
                else: v['warnings'].append('No supported Edge.Cuts outline is present; PCB layers retain the native drawing viewport and 3D is unavailable.')
                layers=[]; layer_dir=directory/'layers'; layer_dir.mkdir()
                layer_names=[*info['copperLayers'],'F.SilkS','B.SilkS','F.Mask','B.Mask','F.Fab','B.Fab','Edge.Cuts']
                for name in layer_names:
                    filename=name.replace('.','_')+'.svg'; fp=layer_dir/filename
                    run(['pcb','export','svg','--output',fp,'--layers',name,'--mode-single','--page-size-mode','1','--exclude-drawing-sheet','--drill-shape-opt','2',pcb])
                    tree=ET.parse(fp); rt=tree.getroot(); native_view=[float(x) for x in rt.attrib['viewBox'].split()]
                    if viewbox is None: viewbox=native_view
                    rt.set('viewBox',' '.join(f'{x:.6f}' for x in viewbox)); rt.set('width',f'{viewbox[2]}mm'); rt.set('height',f'{viewbox[3]}mm')
                    ET.register_namespace('','http://www.w3.org/2000/svg'); tree.write(fp,encoding='unicode',xml_declaration=True)
                    layers.append({'id':name,'name':name,'url':f'{url}/layers/{filename}',
                        'color':COLORS.get(name,'#b196e0'),'defaultVisible':name in ['F.Cu','F.SilkS','Edge.Cuts']})
                v['pcb']={'layers':layers,'viewBox':viewbox,'widthMm':round(bounds[2],6) if bounds else None,'heightMm':round(bounds[3],6) if bounds else None,'copperLayers':info['copperLayers'],'thicknessMm':info['thicknessMm'],
                    'components':info['components'],'accessories':accessories,'nativeUrl':f'{prefix}/source/{files["pcb"]}',
                    'outlineBounds':bounds,'trackSegments':info['trackSegments'],'zones':info['zones'],'population':population}
                v.setdefault('revision',info['revision'])
                v['downloads'].append({'label':'Native PCB','url':v['pcb']['nativeUrl']})
                metadata={'pcb':files['pcb'],'pcbSha256':hashes[files['pcb']],
                    'schematic':files.get('schematic'),'schematicSha256':hashes.get(files.get('schematic')),
                    'schematicHashes':{s['sourcePath']:hashes[s['sourcePath']] for s in (hierarchy or {}).get('sheets',[])}}
                component_source=work/f'components-{vid}.json'
                write_json(component_source,{'variant':vid,'source':metadata,'components':records,'accessories':accessories,'allowMissingModels':True})
                v['componentsUrl']=f'{url}/components.json'
                # The standalone index remains available if no GLB is exportable.
                write_json(directory/'components.json',{'schemaVersion':1,'bindingId':None,'variant':vid,'source':metadata,
                    'components':[{**c,'modelNodes':[],'meshNodes':[]} for c in records],
                    'accessories':[{**a,'modelNodes':[],'meshNodes':[]} for a in accessories],'boardMeshNodes':[]})
                v['downloads'].append({'label':'Component data (JSON)','url':v['componentsUrl']})
                if bounds:
                    rewrite_model_paths(pcb,frozen_models)
                    native=directory/'board-native.glb'; model=directory/'board.glb'
                    ok=run(['pcb','export','glb','--output',native,'--force',*GLB_FLAGS,pcb],timeout=600,required=False)
                    if ok and native.is_file():
                        node=shutil.which('node') or 'node'
                        optimization=json.loads(subprocess.check_output([node,str(ROOT/'scripts/optimize_glb.mjs'),str(native),str(model)],text=True,cwd=ROOT))
                        bindings=json.loads(subprocess.check_output([node,str(ROOT/'scripts/bind_components.mjs'),str(model),str(component_source),str(directory/'components.json')],text=True,cwd=ROOT))
                        poster=directory/'poster.png';poster_input=pcb;poster_adjusted=[]
                        poster_references=original.get('poster',{}).get('includeBoardOnlyReferences',[])
                        if poster_references:
                            poster_input=work/vid/'poster-input.kicad_pcb'
                            poster_adjusted=make_poster_input(pcb,poster_input,poster_references)
                        poster_ok=run(['pcb','render','--output',poster,'--width','960','--height','720','--quality','high','--background','transparent','--perspective','--rotate','-32,0,25','--zoom','0.90',poster_input],timeout=300,required=False) and poster.is_file()
                        model_index=json.loads((directory/'components.json').read_text())
                        v['accessories']=model_index.get('accessories',accessories)
                        v['pcb']['accessories']=v['accessories']
                        missing_export=[c['reference'] for c in model_index['components'] if c.get('modelExpected') and not c['hasModel']]
                        missing=[*info['missingModels'],*[{'reference':ref,'path':None,'reason':'KiCad GLB did not include a verified assembly for this model.'} for ref in missing_export]]
                        if missing: v['warnings'].append(f'{len({m["reference"] for m in missing})} footprints have missing or unsupported 3D model geometry.')
                        v['model']={'url':f'{url}/board.glb','posterUrl':f'{url}/poster.png' if poster_ok else None,
                            'posterRendering':{'kind':'private-assembly-derivative' if poster_adjusted else 'native','visibleReviewReferences':poster_adjusted},
                            'bytes':model.stat().st_size,'modeledFootprints':bindings['modeledComponents'],
                            'missingModels':missing,'withoutModel':info['withoutModel'],
                            'description':'PCB and available component models.' if records else 'PCB outline; component placement is not included in this snapshot.',
                            'nativeUrl':f'{url}/board-native.glb','optimization':optimization,
                            'componentsUrl':v['componentsUrl'],'componentBinding':bindings}
                        if model.stat().st_size>5_000_000: v['warnings'].append('The 3D model exceeds the initial 5 MB loading target.')
                        v['downloads'].extend([{'label':'3D model (GLB)','url':v['model']['url']},{'label':'Native GLB export','url':v['model']['nativeUrl']}])
                        print(f'Indexed {vid}: {bindings["modeledComponents"]} clickable components',flush=True)
                    else: v['warnings'].append('KiCad could not export a 3D model from this PCB snapshot. The schematic and PCB layers remain available.')
            variants.append(v)
        archive=target/'native-design.zip'
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for p in sorted(public_source.rglob('*')):
                if p.is_file():
                    rel=p.relative_to(public_source).as_posix(); zi=zipfile.ZipInfo(rel,date_time=(2026,1,1,0,0,0)); zi.compress_type=zipfile.ZIP_DEFLATED; z.writestr(zi,p.read_bytes())
        warnings.extend(['ERC and DRC were not rerun for this export. See the source review documents for hardware validation.',
                         'Review third-party component-model licenses before public redistribution.'])
        verify_inputs(inputs,hashes,external_hashes)
        # Also catch newly introduced inputs (for example a newly referenced sheet)
        # rather than checking only paths present in the original collection.
        final_inputs=collect_inputs(source,cfg,resolver)
        if set(final_inputs['files'])!=set(inputs['files']) or set(final_inputs['external'])!=set(inputs['external']):
            raise RuntimeError('Source dependency set changed during export')
        if pipeline_hashes!={rel:sha(ROOT/rel) for rel in pipeline_files}: raise RuntimeError('Export pipeline changed during export')
        relative_outputs={p.relative_to(target).as_posix():sha(p) for p in sorted(target.rglob('*')) if p.is_file()}
        sid=digest({'inputId':input_id,'outputs':relative_outputs})[:12]
        final_target=out/'snapshots'/sid; final_target.parent.mkdir(exist_ok=True)
        if final_target.exists():
            if any(not (final_target/rel).is_file() or sha(final_target/rel)!=h for rel,h in relative_outputs.items()): raise RuntimeError('Snapshot collision or corrupt existing snapshot')
            shutil.rmtree(target)
        else: target.rename(final_target)
        old_prefix=prefix; prefix=f'data/snapshots/{sid}'
        variants=json.loads(json.dumps(variants).replace(old_prefix+'/',prefix+'/'))
        outputs={p.relative_to(out.parent).as_posix():sha(p) for p in sorted(final_target.rglob('*')) if p.is_file()}
        readme=cfg['project'].get('readme')
        manifest={'schemaVersion':2,'project':{k:v for k,v in cfg['project'].items() if k!='readme'},
            'defaultVariant':cfg['defaultVariant'],'snapshot':{'id':sid,'inputId':input_id,
                'createdAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'sourceCommit':None,
                'sourceHashes':hashes,'dependencyHashes':external_hashes,'outputHashes':outputs,
                'toolVersions':{'kicad':version,'python':sys.version.split()[0],'gltfTransformCore':'4.2.1'},
                'pipelineHashes':pipeline_hashes,'exporterSha256':sha(__file__)},
            'variants':variants,'readme':{'url':f'{prefix}/source/{readme}','sourcePath':readme} if readme else None,
            'sourceBase':f'{prefix}/source/','nativeArchiveUrl':f'{prefix}/native-design.zip','warnings':warnings}
        manifest['exportSettings']={'glb':[f.removeprefix('--') for f in GLB_FLAGS],
            'pcbSvg':{'pageSizeMode':1,'crop':'Shared Edge.Cuts bounds with 1.5 mm margin, or native drawing viewport when absent','drillShape':2},
            'schematicSvg':'Full hierarchy export matched by native SVG sheet path, source file, and visible references','zoneRefill':False}
        temporary=out/'.manifest.tmp'; write_json(temporary,manifest); temporary.replace(out/'manifest.json')
        print(f'Exported coherent snapshot {sid}: {len(variants)} variants, {len(outputs)} artifacts. Source hashes unchanged.',flush=True)
        return manifest
    finally:
        write_json(work/'export-log.json',commands)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,help='Override the configured source root.')
    parser.add_argument('--output',type=Path,default=ROOT/'public/data')
    parser.add_argument('--config',type=Path,default=ROOT/'config/badge.json')
    parser.add_argument('--kicad-cli',default=os.environ.get('KICAD_CLI',DEFAULT_CLI))
    parser.add_argument('--skip-existing',action='store_true',help='Reuse an existing matching, hash-verified snapshot.')
    args=parser.parse_args(); (ROOT/'.work').mkdir(exist_ok=True); export(args)

if __name__=='__main__': main()
