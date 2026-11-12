"""Read-only native KiCad metadata and allowlisted source snapshots."""
from __future__ import annotations
import hashlib, json, math, os, re, uuid
from pathlib import Path

MODEL_SUFFIXES = {'.step', '.stp', '.wrl', '.vrml', '.iges', '.igs'}
CAD_SUFFIXES = MODEL_SUFFIXES | {'.kicad_sch', '.kicad_pcb', '.kicad_pro', '.kicad_sym', '.kicad_mod', '.kicad_dru', '.kicad_wks', '.net', '.glb', '.stl', '.dxf', '.zip', '.py'}
DOCUMENT_SUFFIXES = {'.md', '.json', '.pdf', '.svg', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.webp'}
TABLES = {'fp-lib-table', 'sym-lib-table'}
LICENSE_NAMES = {'LICENSE', 'COPYING', 'NOTICE'}
DIRECTORY_SUFFIXES = (CAD_SUFFIXES - {'.py', '.zip', '.glb', '.stl', '.dxf'}) | {'.md', '.txt'}
BOM_KEYS = ['MPN', 'JLCPCB Part #', 'LCSC', 'Manufacturer', 'Datasheet']

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def children(node, key): return [x for x in node if isinstance(x, list) and x and x[0] == key]
def child(node, key, default=None): return next(iter(children(node, key)), default)
def value(node, key, default=''):
    c = child(node, key)
    return c[1] if c and len(c) > 1 else default

def sexpr(text):
    tokens = re.findall(r'\(|\)|"(?:\\.|[^"\\])*"|[^\s()]+', text)
    stack = []; root = []; current = root
    for tok in tokens:
        if tok == '(':
            new = []; current.append(new); stack.append(current); current = new
        elif tok == ')':
            if not stack: raise ValueError('Unbalanced KiCad syntax')
            current = stack.pop()
        else:
            if tok.startswith('"'): tok = json.loads(tok)
            current.append(tok)
    if stack or len(root) != 1: raise ValueError('Invalid KiCad document')
    return root[0]

def prop(node): return {p[1]: p[2] for p in children(node, 'property') if len(p) > 2}
def normalized_path(path): return '/' + '/'.join(str(path).split('/')[1:]).rstrip('/')
def inside(path, root):
    try: Path(path).resolve().relative_to(Path(root).resolve()); return True
    except ValueError: return False

def source_path(root, relative):
    p = (root / relative).resolve()
    if Path(relative).is_absolute() or not inside(p, root):
        raise RuntimeError(f'Path escapes source root: {relative}')
    return p

def instance(node, project, instance_path):
    matches = [p for group in children(child(node, 'instances', []), 'project')
               if group[1] == project for p in children(group, 'path')
               if normalized_path(p[1]) == normalized_path(instance_path)]
    if len(matches) > 1: raise RuntimeError(f'Ambiguous instance {project}:{instance_path}')
    return matches[0] if matches else None

def schematic_hierarchy(path, source_root=None, project=None):
    """Traverse sheet *instances*, including repeated child files, by native paths."""
    path = Path(path).resolve(); source_root = Path(source_root or path.parent).resolve()
    project = project or path.stem; sheets = []; warnings = []; pages = set(); identities = set()
    parsed = {}; roots = {}
    def parse(p):
        if p not in parsed:
            parsed[p] = sexpr(p.read_text()); roots[p] = value(parsed[p], 'uuid')
        return parsed[p]
    root = parse(path); root_id = value(root, 'uuid')
    if not root_id: raise RuntimeError('Root schematic has no UUID')
    root_pages = children(child(root, 'sheet_instances', []), 'path')
    root_page = next((value(p, 'page') for p in root_pages if p[1] == '/'), None)
    def visit(p, ipath, name, names, page, ancestry):
        if not inside(p, source_root): raise RuntimeError(f'Sheet escapes source root: {p.name}')
        if p in ancestry: raise RuntimeError(f'Cyclic schematic hierarchy: {p.name}')
        if ipath in identities: raise RuntimeError('Duplicate sheet instance path')
        identities.add(ipath)
        if not page or page in pages: raise RuntimeError(f'Missing or duplicate sheet page: {name}')
        pages.add(page)
        tree = parse(p); symbols = []
        for s in children(tree, 'symbol'):
            properties = prop(s); at = child(s, 'at', ['at', '0', '0'])
            record = instance(s, project, ipath)
            reference = value(record or [], 'reference', properties.get('Reference', ''))
            if not reference or reference.startswith('#'): continue
            sid = value(s, 'uuid')
            if not sid: raise RuntimeError(f'{reference}: symbol UUID is missing')
            if not record:
                warnings.append(f'{reference} on {name}: no matching {project} instance; schematic identity is unavailable.')
            reference_property=next((entry for entry in children(s,'property') if entry[1]=='Reference'),[])
            effects=child(reference_property,'effects',[])
            hidden=value(reference_property,'hide','no')=='yes' or value(effects,'hide','no')=='yes' or 'hide' in effects
            library=next((entry for entry in children(child(tree,'lib_symbols',[]),'symbol') if entry[1]==value(s,'lib_id')),[])
            units=[int(match[1]) for entry in children(library,'symbol') if (match:=re.search(r'_(\d+)_\d+$',entry[1]))]
            rendered_reference=reference if reference_property and not hidden and max(units,default=1)<=1 else None
            symbols.append({'reference': reference, 'renderedReference': rendered_reference, 'value': properties.get('Value', ''),
                'x': float(at[1]), 'y': float(at[2]), 'uuid': sid,
                'sourcePath':p.relative_to(source_root).as_posix(),'libId':value(s,'lib_id'),'libraryDescription':prop(library).get('Description',''),
                'schematicPath': ipath + '/' + sid if record else None,
                'schematicSheetId': ipath, 'schematicRootUuid': root_id, 'unit': value(record or s, 'unit', '1'),
                'identityStatus': 'verified' if record else 'unverified',
                'inBom': value(s, 'in_bom', 'yes') == 'yes',
                'onBoard': value(s, 'on_board', 'yes') == 'yes',
                'dnp': value(s, 'dnp', 'no') == 'yes',
                'properties': {k: v for k, v in properties.items() if k not in ['Reference', 'Value']}})
        sheets.append({'id': ipath, 'name': name, 'hierarchy': ' / '.join(names),
            'sourcePath': p.relative_to(source_root).as_posix(), 'instancePath': ipath,
            'displayPath': '/'+'/'.join(names[1:])+'/' if len(names)>1 else '/',
            'page': str(page), 'symbols': symbols})
        for sheet in children(tree, 'sheet'):
            props = prop(sheet); relative = props.get('Sheetfile', props.get('Sheet file'))
            label = props.get('Sheetname', props.get('Sheet name', relative))
            if not relative: raise RuntimeError('Sheet is missing its source file')
            if '${' in relative: raise RuntimeError(f'Unresolved sheet path: {relative}')
            nested = (p.parent / relative).resolve()
            entry = instance(sheet, project, ipath)
            if not entry: raise RuntimeError(f'{label}: no matching project/path sheet instance')
            sheet_uuid = value(sheet, 'uuid')
            if not sheet_uuid: raise RuntimeError(f'{label}: sheet UUID is missing')
            visit(nested, ipath + '/' + sheet_uuid, label, [*names, label], value(entry, 'page'), [*ancestry, p])
    visit(path, '/' + root_id, path.stem, [path.stem], root_page, [])
    return {'sheets': sheets, 'symbols': [s for sheet in sheets for s in sheet['symbols']],
            'warnings': warnings, 'files': sorted(parsed)}

def schematic_info(path, project=None):
    return schematic_hierarchy(path, project=project)['symbols']

def copper_layers(root):
    layers = [n[1] for n in child(root, 'layers', [])[1:] if isinstance(n, list) and len(n) > 2 and n[1].endswith('.Cu')]
    # Native layer numeric IDs are not stack order in KiCad 10.
    def order(name):
        if name == 'F.Cu': return -1
        if name == 'B.Cu': return 1000
        match = re.fullmatch(r'In(\d+)\.Cu', name)
        return int(match[1]) if match else 500
    return sorted(layers, key=order)

def outline_bounds(root):
    points = []
    for shape in root:
        if not isinstance(shape, list) or value(shape, 'layer') != 'Edge.Cuts': continue
        if shape[0] in ['gr_line', 'gr_arc', 'gr_rect']:
            xy = [(float(p[1]), float(p[2])) for key in ['start', 'mid', 'end'] if (p := child(shape, key))]
            points.extend(xy)
            if shape[0] == 'gr_arc' and len(xy) == 3:
                (ax, ay), (bx, by), (cx, cy) = xy
                det = 2 * (ax*(by-cy)+bx*(cy-ay)+cx*(ay-by))
                if abs(det) > 1e-12:
                    ux = ((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/det
                    uy = ((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/det
                    radius = math.hypot(ax-ux, ay-uy)
                    start, middle, end = [math.atan2(y-uy, x-ux) % (2*math.pi) for x,y in xy]
                    ccw = (middle-start) % (2*math.pi) <= (end-start) % (2*math.pi)
                    for angle in [0, math.pi/2, math.pi, 3*math.pi/2]:
                        on_arc = ((angle-start) % (2*math.pi) <= (end-start) % (2*math.pi)) if ccw else ((start-angle) % (2*math.pi) <= (start-end) % (2*math.pi))
                        if on_arc: points.append((ux+radius*math.cos(angle), uy+radius*math.sin(angle)))
        elif shape[0] == 'gr_circle':
            c, e = child(shape, 'center'), child(shape, 'end')
            if c and e:
                x,y = float(c[1]),float(c[2]); r = math.hypot(float(e[1])-x,float(e[2])-y)
                points.extend([(x-r,y-r),(x+r,y+r)])
        elif shape[0] == 'gr_poly':
            points.extend((float(p[1]), float(p[2])) for p in children(child(shape, 'pts', []), 'xy'))
    if not points: return None
    x0,y0 = min(x for x,y in points),min(y for x,y in points)
    return [x0,y0,max(x for x,y in points)-x0,max(y for x,y in points)-y0]

class ModelResolver:
    """Resolve only source-local models or a declared installed KiCad model root."""
    def __init__(self, source, model_roots=None):
        self.source = Path(source).resolve()
        defaults = [Path('/Applications/KiCad/KiCad.app/Contents/SharedSupport/3dmodels'), Path('/usr/share/kicad/3dmodels')]
        self.roots = [Path(p).expanduser().resolve() for p in (defaults if model_roots is None else model_roots) if Path(p).expanduser().is_dir()]
    def resolve(self, raw, project_dir):
        raw = raw.replace('\\', '/')
        match = re.match(r'^\$\{KICAD\d*_3DMODEL_DIR\}/(.*)$', raw)
        if match:
            candidates = [root / match[1] for root in self.roots]
        elif raw.startswith('${KIPRJMOD}'):
            candidates = [Path(project_dir) / raw[len('${KIPRJMOD}/'):]]
        elif '${' in raw: return None
        else: candidates = [Path(raw) if Path(raw).is_absolute() else Path(project_dir) / raw]
        for candidate in candidates:
            candidate = candidate.resolve()
            if candidate.suffix.lower() not in MODEL_SUFFIXES: continue
            if not (inside(candidate, self.source) or any(inside(candidate,r) for r in self.roots)): continue
            if candidate.is_file(): return candidate
        return None
    def export_candidate(self, path):
        if path and path.suffix.lower() in {'.wrl', '.vrml'}:
            for ext in ['.step', '.stp', '.STEP', '.STP', '.iges', '.igs']:
                candidate = path.with_suffix(ext)
                if candidate.is_file() and (inside(candidate, self.source) or any(inside(candidate,r) for r in self.roots)):
                    return candidate
        return path

def board_info(path, resolver=None):
    path = Path(path); root = sexpr(path.read_text()); resolver = resolver or ModelResolver(path.parent)
    fps = []; missing = []; no_model = []
    for fp in children(root, 'footprint'):
        properties = prop(fp); at = child(fp, 'at', ['at','0','0','0']); ref = properties.get('Reference','?')
        nets = sorted({str(n[2] if len(n)>2 else n[1]) for pad in children(fp,'pad') if (n:=child(pad,'net'))})
        models = []
        for model in children(fp, 'model'):
            raw = model[1]; path_found = resolver.resolve(raw, path.parent)
            hidden = 'hide' in model or value(model, 'hide', 'no') == 'yes'
            export_path = resolver.export_candidate(path_found)
            def xyz(key, default):
                values = child(child(model, key, []), 'xyz')
                return [float(x) for x in values[1:4]] if values else default
            models.append({'path': raw, 'resolved': bool(path_found), 'hidden': hidden, 'format': Path(raw).suffix.lower().lstrip('.'),
                'substituted': bool(export_path and path_found != export_path),
                'sourcePath': resolver.snapshot_path(path_found) if path_found and hasattr(resolver,'snapshot_path') else None,
                'sourceSha256': sha(path_found) if path_found else None,
                'exportSourcePath': resolver.snapshot_path(export_path) if export_path and hasattr(resolver,'snapshot_path') else None,
                'transform': {'offsetMm': xyz('offset',[0,0,0]), 'rotationDeg': xyz('rotate',[0,0,0]), 'scale': xyz('scale',[1,1,1])}})
            if not hidden and not path_found: missing.append({'reference': ref, 'path': raw, 'reason':'Referenced model was not found in allowed model roots.'})
        if not models: no_model.append(ref)
        fps.append({'reference':ref, 'value':properties.get('Value',''), 'footprint':fp[1],
            'x':float(at[1]), 'y':float(at[2]), 'rotation':float(at[3]) if len(at)>3 else 0,
            'layer':value(fp,'layer'), 'nets':nets, 'models':[m['path'] for m in models], 'modelSources':models,
            'uuid':value(fp,'uuid'), 'schematicPath':value(fp,'path'),
            'excludeFromBom':'exclude_from_bom' in child(fp,'attr',[]), 'dnp':'dnp' in child(fp,'attr',[]), 'boardOnly':'board_only' in child(fp,'attr',[]),
            'properties':{k:v for k,v in properties.items() if k not in ['Reference','Value']}})
    return {'copperLayers':copper_layers(root), 'thicknessMm':float(value(child(root,'general',[]),'thickness','1.6')),
        'components':fps, 'missingModels':missing, 'withoutModel':no_model,
        'modeledFootprints':sum(any(m['resolved'] and not m['hidden'] for m in f['modelSources']) for f in fps),
        'revision':value(child(root,'title_block',[]),'rev','Unspecified'), 'outlineBounds':outline_bounds(root),
        'trackSegments':len(children(root,'segment'))+len(children(root,'arc')), 'vias':len(children(root,'via')),
        'zones':len(children(root,'zone')), 'copperZones':sum(not child(zone,'keepout') for zone in children(root,'zone'))}

def component_records(variant, board, symbols):
    by_path = {s['schematicPath']:s for s in symbols if s.get('schematicPath')}
    if len(by_path) != sum(bool(s.get('schematicPath')) for s in symbols): raise RuntimeError('Duplicate schematic instance paths')
    # KiCad PCB paths may omit the known root UUID. Strip exactly that verified
    # root segment, never an arbitrary suffix or a reference-name match.
    aliases = dict(by_path)
    for symbol in symbols:
        path = symbol.get('schematicPath'); root = symbol.get('schematicRootUuid')
        if root and path and path.startswith('/'+root+'/'):
            relative = path[len(root)+1:]
            if relative in aliases and aliases[relative] is not symbol:
                raise RuntimeError('Ambiguous root-relative schematic instance path')
            aliases[relative] = symbol
    records = []; seen = set(); seen_refs = set()
    for fp in board['components']:
        identifier = str(uuid.UUID(fp['uuid']))
        if identifier in seen or fp['reference'] in seen_refs: raise RuntimeError('Duplicate footprint identity')
        seen.add(identifier); seen_refs.add(fp['reference'])
        candidate = aliases.get(fp['schematicPath']); symbol = candidate if candidate and candidate['reference']==fp['reference'] and candidate['onBoard'] else None
        status = 'verified' if symbol else 'conflict' if candidate else 'board-only' if fp.get('boardOnly') else 'pcb-only'
        differences = []
        if symbol:
            for key, a, b in [('Value',fp['value'],symbol['value']),('Footprint',fp['footprint'],symbol['properties'].get('Footprint','')),
                    *[(k,fp['properties'].get(k,''),symbol['properties'].get(k,'')) for k in BOM_KEYS],
                    ('inBom',not fp['excludeFromBom'],symbol['inBom']),('dnp',fp['dnp'],symbol['dnp'])]:
                if a != b: differences.append({'field':key, 'pcb':a, 'schematic':b})
        props = fp['properties']
        bom = {'included':not fp['excludeFromBom'], 'dnp':fp['dnp'], 'partNumber':props.get('MPN',''),
               'supplierPartNumber':props.get('JLCPCB Part #',props.get('LCSC','')),
               'supplier':'JLCPCB' if props.get('JLCPCB Part #') else 'LCSC' if props.get('LCSC') else '',
               'manufacturer':props.get('Manufacturer',''), 'datasheet':props.get('Datasheet',''), 'source':'pcb'}
        sources = fp.get('modelSources', [])
        records.append({'id':variant+':'+identifier, 'reference':fp['reference'], 'uuid':identifier,
            'schematicPath':symbol['schematicPath'] if symbol else None,
            'schematicSheetId':symbol.get('schematicSheetId') if symbol else None,
            'symbolUuid':symbol['uuid'] if symbol else None, 'pcbSchematicPath':fp['schematicPath'],
            'identityStatus':status, 'sourceDifferences':differences,
            'value':fp['value'], 'footprint':fp['footprint'], 'layer':fp['layer'],
            'positionMm':{'x':fp['x'],'y':fp['y'],'rotation':fp['rotation']}, 'nets':fp['nets'],
            'hasModel':False, 'modelExpected':any(m.get('resolved') and not m['hidden'] for m in sources),
            'modelSources':sources, 'bom':bom})
    def key(c): return (c['bom']['partNumber'],c['bom']['supplierPartNumber'],c['footprint'],c['value'])
    for c in records:
        c['bom']['quantity'] = sum(key(other)==key(c) and other['bom']['included'] and not other['bom']['dnp'] for other in records) if c['bom']['partNumber'] or c['bom']['supplierPartNumber'] else None
    return sorted(records,key=lambda c:(re.sub(r'\d','',c['reference']),int(re.search(r'\d+',c['reference'])[0]) if re.search(r'\d+',c['reference']) else 0))

def cuboid_from_faces(points, indices):
    """Accept an exact closed axis-aligned cuboid, never approximate a mesh."""
    if len(points)!=8 or len(set(map(tuple,points)))!=8:
        raise RuntimeError('Cuboid source must have eight distinct vertices')
    lows=[min(p[i] for p in points) for i in range(3)]
    highs=[max(p[i] for p in points) for i in range(3)]
    expected={(x,y,z) for x in [lows[0],highs[0]] for y in [lows[1],highs[1]] for z in [lows[2],highs[2]]}
    if len(expected)!=8 or set(map(tuple,points))!=expected:
        raise RuntimeError('Source vertices do not form an exact axis-aligned cuboid')
    faces=[];current=[]
    for index in indices:
        if index==-1: faces.append(current);current=[]
        elif index<0 or index>=len(points): raise RuntimeError('Invalid cuboid source index')
        else: current.append(index)
    if current or len(faces)!=6: raise RuntimeError('Cuboid source must have six closed faces')
    planes=set();center=[(a+b)/2 for a,b in zip(lows,highs)]
    for face in faces:
        if len(face)!=4 or len(set(face))!=4: raise RuntimeError('Cuboid face must have four distinct corners')
        corners=[points[i] for i in face]
        axes=[axis for axis in range(3) if len({p[axis] for p in corners})==1]
        if len(axes)!=1: raise RuntimeError('Cuboid face is not on one boundary plane')
        axis=axes[0];plane=(axis,corners[0][axis])
        if plane in planes: raise RuntimeError('Duplicate cuboid boundary face')
        planes.add(plane)
        if any(sum(a!=b for a,b in zip(corners[i],corners[(i+1)%4]))!=1 for i in range(4)):
            raise RuntimeError('Cuboid face has crossing or diagonal edges')
        u=[b-a for a,b in zip(corners[0],corners[1])];v=[b-a for a,b in zip(corners[1],corners[2])]
        normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
        if normal[axis]*(corners[0][axis]-center[axis])<=0: raise RuntimeError('Cuboid source face winding is not outward')
    return center,[b-a for a,b in zip(lows,highs)]

def vrml_box_envelope(path):
    """Read explicit Box shapes or exact cuboid IndexedFaceSets from native VRML."""
    text=re.sub(r'#[^\n]*','',Path(path).read_text()).strip()
    number=r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?'
    triple='('+number+r'\s+'+number+r'\s+'+number+')'
    box=r'Box\s*\{\s*size\s+'+number+r'\s+'+number+r'\s+'+number+r'\s*\}'
    mesh=r'IndexedFaceSet\s*\{\s*coord\s+Coordinate\s*\{\s*point\s*\[\s*(?:'+number+r'|[,\s])+\]\s*\}\s*coordIndex\s*\[[-\d,\s]+\]\s*solid\s+TRUE\s*\}'
    pattern=re.compile(r'Transform\s*\{\s*translation\s+'+triple+
        r'\s+children\s*\[\s*Shape\s*\{\s*appearance\s+Appearance\s*\{\s*material\s+Material\s*\{\s*diffuseColor\s+'+triple+
        r'\s+transparency\s+('+number+r')\s*\}\s*\}\s*geometry\s+('+box+'|'+mesh+r')\s*\}\s*\]\s*\}')
    matches=list(pattern.finditer(text))
    if not matches or len(matches)>32 or pattern.sub('',text).strip():
        raise RuntimeError('Source is not a supported Box-only or exact cuboid review envelope')
    boxes=[]
    for match in matches:
        translation,color,transparency,geometry=match.groups()
        translation=[float(v) for v in translation.split()]
        if geometry.startswith('Box'):
            center=[0,0,0];size=[float(v) for v in re.findall(number,geometry)]
        else:
            coordinates=re.search(r'point\s*\[([^]]+)\]',geometry)[1]
            numbers=[float(v) for v in re.findall(number,coordinates)]
            if len(numbers)!=24: raise RuntimeError('Cuboid source must contain eight 3D vertices')
            points=[numbers[i:i+3] for i in range(0,len(numbers),3)]
            indices=[int(v) for v in re.findall(r'-?\d+',re.search(r'coordIndex\s*\[([^]]+)\]',geometry)[1])]
            center,size=cuboid_from_faces(points,indices)
        center=[(a+b)*2.54 for a,b in zip(translation,center)];size=[v*2.54 for v in size]
        color=[float(v) for v in color.split()];opacity=1-float(transparency)
        if any(v<=0 for v in size) or any(v<0 or v>1 for v in color) or not 0<=opacity<=1:
            raise RuntimeError('Invalid source Box geometry or material')
        boxes.append({'centerMm':center,'sizeMm':size,'color':color,'opacity':opacity})
    return {'kind':'source-vrml-boxes','sourceSha256':sha(path),'sourceUnitsToMm':2.54,'boxesMm':boxes}

def population_info(symbols, records):
    on_board = {s['reference'] for s in symbols if s['onBoard']}
    placed = {c['reference'] for c in records if c['identityStatus']=='verified'} & on_board
    return {'symbols':len(symbols), 'onBoard':len(on_board), 'placed':len(placed),
            'unplacedReferences':sorted(on_board-placed), 'pcbOnlyReferences':[c['reference'] for c in records if c['identityStatus'] not in ['verified','board-only']]}

def validate_config(cfg):
    if cfg.get('schemaVersion') != 2: raise RuntimeError('Configuration requires schemaVersion 2')
    if not cfg.get('project',{}).get('name'): raise RuntimeError('Configuration requires project.name')
    ids = [v.get('id') for v in cfg.get('variants',[])]
    if not ids or len(ids)!=len(set(ids)) or any(not isinstance(i,str) or not re.fullmatch(r'[A-Za-z0-9_-]+',i) for i in ids): raise RuntimeError('Variant IDs must be unique safe path segments')
    if cfg.get('defaultVariant') not in ids: raise RuntimeError('defaultVariant must name a configured variant')
    for variant in cfg['variants']:
        if not any(variant.get('files',{}).get(k) for k in ['pcb','schematic']): raise RuntimeError('Each variant needs a PCB or schematic file')

def collect_inputs(source, cfg, resolver):
    """No recursive project-root copy: explicit documents, hierarchy and local CAD libraries."""
    source = Path(source).resolve(); allowed = {}; external = {}; model_map = {}; warnings = []
    def add(p, optional=False):
        p = Path(p).resolve()
        if not inside(p,source): raise RuntimeError(f'Input escapes source root: {p.name}')
        if not p.is_file():
            if optional: warnings.append(f'Optional source file is absent: {p.relative_to(source)}'); return
            raise RuntimeError(f'Missing source file: {p.relative_to(source)}')
        if p.suffix.lower() not in CAD_SUFFIXES | DOCUMENT_SUFFIXES and p.name not in TABLES | LICENSE_NAMES:
            raise RuntimeError(f'Input type is not allowlisted: {p.name}')
        rel = p.relative_to(source).as_posix()
        if any(part.startswith('.') for part in Path(rel).parts): raise RuntimeError(f'Hidden input is not allowlisted: {rel}')
        allowed[rel] = p
    snapshot = cfg.get('snapshot',{})
    for rel in snapshot.get('documents',[]): add(source_path(source,rel), optional=True)
    if cfg['project'].get('readme'): add(source_path(source,cfg['project']['readme']))
    for rel in snapshot.get('files',[]): add(source_path(source,rel))
    for rel in snapshot.get('directories',[]):
        directory = source_path(source,rel)
        for p in sorted(directory.rglob('*')):
            if p.is_file() and (p.suffix.lower() in DIRECTORY_SUFFIXES or p.name in LICENSE_NAMES) and not any(part.startswith('.') for part in p.relative_to(source).parts): add(p)
    for variant in cfg['variants']:
        enclosure=variant.get('enclosure')
        if enclosure:
            directory=source_path(source,enclosure['sourceDirectory'])
            metadata=json.loads((directory/'exports/manifest.json').read_text())
            for name in ['manifest.json','enclosure-cad.zip',*metadata['output_hashes']]:
                if Path(name).name!=name:raise RuntimeError('Invalid enclosure artifact path')
                add(directory/'exports'/name)
            for name in [*metadata['source_hashes'],'requirements.txt','README.md']:
                if Path(name).name!=name:raise RuntimeError('Invalid enclosure source path')
                add(directory/name)
        for relative in variant.get('routingReview',{}).values():add(source_path(source,relative))
        naming=variant.get('componentNames',{})
        for relative in [naming.get('bomSource'),naming.get('amendmentsSource'),*naming.get('contracts',[])]:
            if relative:add(source_path(source,relative))
        files = variant['files']
        for kind in ['pcb','schematic','project']:
            if files.get(kind): add(source_path(source,files[kind]))
        if files.get('schematic'):
            hierarchy = schematic_hierarchy(source_path(source,files['schematic']),source,variant.get('instanceProject'))
            for p in hierarchy['files']: add(p)
        parents = {source_path(source,p).parent for p in files.values() if p}
        for parent in parents:
            for table_name in TABLES:
                table = parent/table_name
                if not table.is_file(): continue
                add(table)
                for lib in children(sexpr(table.read_text()),'lib'):
                    uri = value(lib,'uri').replace('${KIPRJMOD}',str(parent))
                    if '${' in uri: continue
                    p = (parent/uri).resolve()
                    if not inside(p,source):
                        warnings.append(f'External library is not in the source snapshot: {value(lib,"name")}'); continue
                    if p.is_dir():
                        for member in sorted(p.rglob('*.kicad_mod')): add(member)
                    else: add(p)
    # Include exact referenced model files and installed STEP substitutes. Unknown
    # environment variables, absolute paths outside allowed roots and scripts stay out.
    for rel,p in list(allowed.items()):
        if p.suffix not in {'.kicad_pcb','.kicad_mod'}: continue
        root = sexpr(p.read_text())
        footprints = children(root,'footprint') if p.suffix=='.kicad_pcb' else [root]
        project_dir = p.parent
        if p.suffix=='.kicad_mod' and p.parent.suffix=='.pretty': project_dir=p.parent.parent
        for fp in footprints:
            for model in children(fp,'model'):
                raw=model[1]; resolved=resolver.resolve(raw,project_dir)
                for candidate in {resolved,resolver.export_candidate(resolved)}-{None}:
                    if inside(candidate,source):
                        add(candidate); destination=candidate.relative_to(source).as_posix()
                    else:
                        destination='_dependencies/models/'+sha(candidate)[:16]+'-'+candidate.name
                        external[destination]=candidate
                    model_map[(rel,raw,str(candidate))]=destination
    return {'files':allowed,'external':external,'modelMap':model_map,'warnings':warnings}

def verify_inputs(inputs, hashes, external_hashes):
    current={rel:sha(p) for rel,p in sorted(inputs['files'].items())}
    ext={rel:sha(p) for rel,p in sorted(inputs['external'].items())}
    if current!=hashes or ext!=external_hashes: raise RuntimeError('Source changed during export. Re-export a stable snapshot.')
