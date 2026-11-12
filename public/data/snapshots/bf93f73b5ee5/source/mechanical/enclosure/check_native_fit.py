#!/usr/bin/env python3
"""Independent enclosure checks against native KiCad geometry.

Run with the CAD environment's Python; KiCad Python is used only to read the
board. Prints a JSON report and exits nonzero on solid interference. No CAD,
board, or report files are written. This is an envelope check, not a complete
assembly/tolerance or optical qualification.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

from build123d import Align, Box, Cylinder, Edge, Face, Pos, Wire, extrude, offset

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
KICAD_PYTHON = '/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3'

EXTRACT = r'''
import json,sys,pcbnew
b=pcbnew.LoadBoard(sys.argv[1])
def xy(p): return [pcbnew.ToMM(p.x)-155,140-pcbnew.ToMM(p.y)]
edges=[]
for d in b.GetDrawings():
    if d.GetLayer()!=pcbnew.Edge_Cuts: continue
    item={'start':xy(d.GetStart()),'end':xy(d.GetEnd())}
    if d.GetShape()==pcbnew.SHAPE_T_ARC: item['mid']=xy(d.GetArcMid())
    elif d.GetShape()!=pcbnew.SHAPE_T_SEGMENT: raise RuntimeError('Unsupported Edge.Cuts primitive')
    edges.append(item)
refs={}
for f in b.GetFootprints():
    courtyard=[]
    if not f.IsFlipped():
        p=f.GetCourtyard(pcbnew.F_CrtYd)
        for n in range(p.OutlineCount()):
            o=p.Outline(n); courtyard.append([xy(o.CPoint(i)) for i in range(o.PointCount())])
    refs[f.GetReference()]={'xy':xy(f.GetPosition()),'rotation':f.GetOrientationDegrees(),
                          'side':f.GetLayerName(),'courtyards':courtyard,
                          'pads':[{'xy':xy(p.GetPosition()),'drill':[pcbnew.ToMM(p.GetDrillSize().x),pcbnew.ToMM(p.GetDrillSize().y)]} for p in f.Pads()]}
print(json.dumps({'edges':edges,'references':refs,'thickness':pcbnew.ToMM(b.GetDesignSettings().GetBoardThickness()),'kicad':pcbnew.Version()}))
'''


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def box_at(x, y, z, w, h, d):
    return Pos(x, y, z) * Box(w, h, d, align=(Align.CENTER, Align.CENTER, Align.MIN))


def volume_overlap(a, b):
    result = a.intersect(b)
    return float(result.volume) if result else 0.0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kicad-python', default=KICAD_PYTHON)
    args = parser.parse_args()
    board = ROOT / 'tinkerbadge.kicad_pcb'
    board_hash = sha(board)
    source_hashes = {p.name: sha(p) for p in [HERE/'build.py', HERE/'parameters.json', HERE/'interfaces.json', Path(__file__)]}
    native = json.loads(subprocess.check_output(
        [args.kicad_python, '-c', EXTRACT, str(board)], text=True))
    spec = importlib.util.spec_from_file_location('enclosure_build', HERE / 'build.py')
    cad = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cad)
    if board_hash != cad.I['board_sha256']:
        raise RuntimeError('Native board differs from enclosure interfaces')
    parts = {p['id']: p for p in cad.parts}
    solids = {key: value['shape'] for key, value in parts.items()}
    findings = []
    checks = []

    # This independently reconstructs the native arcs/lines, rather than using
    # the authored case outline or the model's rectangular board allowance.
    edges = []
    for e in native['edges']:
        a, b = (*e['start'], 0), (*e['end'], 0)
        edges.append(Edge.make_three_point_arc(a, (*e['mid'], 0), b)
                     if 'mid' in e else Edge.make_line(a, b))
    wires = Wire.combine(edges)
    if len(wires) != 1:
        raise RuntimeError('Expected one closed native Edge.Cuts loop')
    board_face = Face(wires[0])
    board_solid = Pos(0, 0, -native['thickness']) * extrude(board_face, amount=native['thickness'], dir=(0,0,1))
    for ref in ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']:
        f = native['references'][ref]
        x, y = f['xy']
        radius = f['pads'][0]['drill'][0] / 2
        board_solid -= Pos(x, y, -2) * Cylinder(radius, 3, align=(Align.CENTER, Align.CENTER, Align.MIN))

    checks.append({'check': 'frame_connected_solid', 'passed': len(solids['frame'].solids()) == 1,
                   'solids': len(solids['frame'].solids())})
    for key, shape in solids.items():
        if parts[key]['group'] == 'fasteners':
            continue
        volume = volume_overlap(board_solid, shape)
        if volume > 1e-4:
            findings.append({'severity': 'fail', 'check': 'native_pcb_intersection',
                             'part': key, 'volume_mm3': round(volume, 6)})
    checks.append({'check': 'native_pcb_intersections',
                   'passed': not any(f['check'] == 'native_pcb_intersection' for f in findings)})

    # The mid-thickness section avoids intended rear seating contacts. Check a
    # 0.59mm expanded exact board contour, including its unusual shoulder.
    allowance = .59
    expanded_profile = offset(board_face, amount=allowance)
    if expanded_profile.area <= board_face.area:
        raise RuntimeError('Board clearance profile did not expand')
    expanded = Pos(0, 0, -1.2) * extrude(expanded_profile, amount=.4, dir=(0,0,1))
    volume = volume_overlap(expanded, solids['frame'])
    checks.append({'check': 'native_outline_lateral_clearance', 'tested_mm': allowance,
                   'passed': volume < 1e-4, 'intersection_mm3': round(volume, 6)})

    # Conservative body envelopes based on owning component records. Values
    # are independent of the case's openings and light-guide dimensions.
    def ref_box(ref, w, h, height, z=0, dx=0, dy=0):
        x, y = native['references'][ref]['xy']
        return box_at(x + dx, y + dy, z, w, h, height)
    bodies = {
        'display_glass': ref_box('MECH_PANEL', 93.3, 54.9, .92, 4.5),
        'SAO_body': ref_box('J502', 12.7, 6, 8.5),
        'SAO_key': ref_box('J502', 3.7, 1, 8.5, dy=3.5),
        'FPC_connector': ref_box('J301', 3.8, 14, 1, dx=-.12),
        'IR_receiver_max': ref_box('U504', 4.2, 5.2, 4.3),
        'Qwiic_body': ref_box('J501', 4.4, 6, 2.9, dx=.375),
        'USB_shell_max': ref_box('J101', 8.225, 9, 3.46, dx=-.4375),
        'ESP32_module_max': ref_box('U201', 18, 25.5, 3.25),
        'battery_design_allowance': ref_box('MECH_BATTERY', 35, 55, 7, cad.P['battery_top_z_mm'] - 7),
    }
    for ref in ['SW401', 'SW402', 'SW403']:
        bodies[ref + '_body'] = ref_box(ref, 2.9, 3.5, 1.3)
        bodies[ref + '_actuator'] = ref_box(ref, .65, 1.6, 1, dx=-1.775)
    body_collisions = []
    for name, body in bodies.items():
        for key, shape in solids.items():
            if parts[key]['group'] == 'fasteners':
                continue
            volume = volume_overlap(body, shape)
            if volume > 1e-4:
                body_collisions.append({'body': name, 'part': key, 'volume_mm3': round(volume, 6)})
    checks.append({'check': 'selected_body_envelopes', 'passed': not body_collisions,
                   'bodies': list(bodies), 'intersections': body_collisions})

    # Low baffle walls must not traverse a footprint courtyard. This uses the
    # native transformed courtyard polygons and an explicitly limited 1.5mm
    # high prism; it is an early warning, not a true part-height assertion.
    courtyard_warnings = []
    from build123d import Polygon
    for ref, f in native['references'].items():
        if ref.startswith(('H', 'MECH_', 'RES_')):
            continue
        for loop in f['courtyards']:
            if len(loop) < 3:
                continue
            prism = extrude(Polygon(*(tuple(p) for p in loop), align=None), amount=1.5, dir=(0,0,1))
            volume = volume_overlap(prism, solids['optical-baffle'])
            if volume > 1e-4:
                courtyard_warnings.append({'reference': ref, 'volume_mm3': round(volume, 6)})
    checks.append({'check': 'baffle_native_courtyard_screen', 'passed': not courtyard_warnings,
                   'assumed_height_mm': 1.5, 'overlaps': courtyard_warnings})

    # Measure transparent webs as planar clearance between the true Boolean
    # openings, so a too-thin strip cannot disappear behind a render.
    long_role = next(profile for key, _, profile in cad.light_profiles if key == 'role-left')
    web = offset(long_role, amount=.15).distance_to(cad.sao)
    checks.append({'check': 'role_to_sao_plate_web', 'minimum_design_mm': 1.0,
                   'measured_mm': round(web, 4), 'passed': web >= 1.0})
    rear_gap = cad.P['battery_top_z_mm'] - 7 - (cad.P['rear_z_mm'] + cad.P['panel_thickness_mm'])
    checks.append({'check': 'battery_rear_nominal_gap', 'measured_mm': round(rear_gap, 4),
                   'passed': rear_gap >= 1.0})
    if sha(board) != board_hash:
        raise RuntimeError('Native board changed while checking')
    if source_hashes != {name:sha(HERE/name) for name in source_hashes}:
        raise RuntimeError('Enclosure source changed while checking; rerun')
    failed = [c['check'] for c in checks if not c['passed']]
    report = {
        'board_sha256': board_hash,
        'kicad_version': native['kicad'],
        'checked_source_hashes': source_hashes,
        'status': 'pass' if not failed and not findings else 'fail',
        'checks': checks, 'findings': findings,
        'limits': [
            'Only named body envelopes are checked; this does not replace full component-solid and tolerance checks.',
            'The 1.5mm courtyard screen reports potential low-wall interference, not manufacturer component heights.',
            'Nominal battery rear clearance is not a verified swelling or tape allowance.',
            'Glass support areas, fastener/nut selection, cable and add-on insertion sweeps, optical isolation, RF and the dock remain physical-prototype checks.',
        ],
    }
    print(json.dumps(report, indent=2))
    return int(bool(failed or findings))


if __name__ == '__main__':
    sys.exit(main())
