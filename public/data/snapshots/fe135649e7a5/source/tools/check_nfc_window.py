#!/usr/bin/env python3
"""Regression check for the NFC antenna window (review 2026-11-11, NFC-1). KiCad Python.

Fails when the saved board has
- no rule area named NFC_WINDOW covering the AE501 winding,
- any filled zone copper inside the window on any layer,
- any track or via inside the window that is not part of the coil feed, or
- zone copper left between the window and the bottom board edge.
It measures saved geometry (filled polygons, tracks, vias) and does not refill
or modify the board.

Usage: check_nfc_window.py BOARD [--output result.json]
"""
import json
import pathlib
import sys

import pcbnew

MM = pcbnew.FromMM
NFC_NETS = ('/05  SENSORS + EXPANSION/NFC_LA', '/05  SENSORS + EXPANSION/NFC_LB')


def rect(x0, y0, x1, y1):
    p = pcbnew.SHAPE_POLY_SET()
    p.NewOutline()
    for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
        p.Append(MM(x), MM(y))
    return p


def main(board, out=None):
    b = pcbnew.LoadBoard(board)
    issues = []
    res = {'board': pathlib.Path(board).name, 'zone_copper_mm2': {}, 'unrelated_items': [], 'feed_items': 0}
    win = [z for z in b.Zones() if z.GetIsRuleArea() and z.GetZoneName() == 'NFC_WINDOW']
    ae = b.FindFootprintByReference('AE501')
    coil = ae.GetBoundingBox(False, False) if ae else None
    if not win:
        issues.append('no rule area named NFC_WINDOW')
        return finish(res, issues, out)
    z = win[0]
    bb = z.GetBoundingBox()
    x0, y0, x1, y1 = (pcbnew.ToMM(v) for v in (bb.GetLeft(), bb.GetTop(), bb.GetRight(), bb.GetBottom()))
    res['window_mm'] = [round(v, 3) for v in (x0, y0, x1, y1)]
    res['layers'] = [b.GetLayerName(l) for l in z.GetLayerSet().Seq()]
    if not z.GetDoNotAllowZoneFills():
        issues.append('NFC_WINDOW does not keep zone fills out')
    for layer in (pcbnew.F_Cu, pcbnew.In1_Cu, pcbnew.In2_Cu, pcbnew.B_Cu):
        if not z.IsOnLayer(layer):
            issues.append(f'NFC_WINDOW is missing layer {b.GetLayerName(layer)}')
    # the winding body (18 x 13 mm about the footprint origin) must lie inside the window
    c = ae.GetPosition()
    cx, cy = pcbnew.ToMM(c.x), pcbnew.ToMM(c.y)
    wind = (cx - 9.0, cy - 6.5, cx + 9.0, cy + 6.5)
    res['winding_mm'] = [round(v, 3) for v in wind]
    if not (x0 <= wind[0] and y0 <= wind[1] and x1 >= wind[2] and y1 >= wind[3]):
        issues.append('window does not cover the AE501 winding')
    edge = b.GetBoardEdgesBoundingBox()
    bottom = pcbnew.ToMM(edge.GetBottom())
    if y1 < bottom - 0.6:
        issues.append(f'window stops {bottom - y1:.2f} mm short of the bottom board edge')
    for zone in b.Zones():
        if zone.GetIsRuleArea():
            continue
        for layer in zone.GetLayerSet().Seq():
            fill = zone.GetFilledPolysList(layer)
            q = rect(x0, y0, x1, max(y1, bottom))
            q.BooleanIntersection(fill)
            area = q.Area() / 1e12
            key = f'{b.GetLayerName(layer)} {zone.GetNetname()}'
            res['zone_copper_mm2'][key] = round(area, 4)
            if area > 0.01:
                issues.append(f'{area:.3f} mm2 of {key} zone copper inside the window')
    box = pcbnew.BOX2I(pcbnew.VECTOR2I(MM(x0), MM(y0)), pcbnew.VECTOR2I(MM(x1 - x0), MM(y1 - y0)))
    for t in b.GetTracks():
        if not t.HitTest(box, False):
            continue
        if t.GetNetname() in NFC_NETS:
            res['feed_items'] += 1
            if t.Type() == pcbnew.PCB_TRACE_T and t.GetLayer() != pcbnew.F_Cu:
                issues.append(f'coil feed track on {b.GetLayerName(t.GetLayer())} inside the window')
            continue
        kind = 'via' if t.Type() == pcbnew.PCB_VIA_T else 'track ' + b.GetLayerName(t.GetLayer())
        p = t.GetPosition()
        res['unrelated_items'].append([kind, t.GetNetname(), round(pcbnew.ToMM(p.x), 2), round(pcbnew.ToMM(p.y), 2)])
    if res['unrelated_items']:
        issues.append(f"{len(res['unrelated_items'])} unrelated tracks/vias inside the window")
    nets = {p.GetNumber(): p.GetNetname() for p in ae.Pads()}
    if nets.get('1') != NFC_NETS[0] or nets.get('2') != NFC_NETS[1]:
        issues.append(f'AE501 terminal nets are {nets}')
    return finish(res, issues, out)


def finish(res, issues, out):
    res['issues'] = issues
    res['status'] = 'PASS' if not issues else 'FAIL'
    text = json.dumps(res, indent=1)
    if out:
        open(out, 'w').write(text + '\n')
    print(text)
    return 0 if not issues else 1


if __name__ == '__main__':
    out = sys.argv[sys.argv.index('--output') + 1] if '--output' in sys.argv else None
    sys.exit(main(sys.argv[1], out))
