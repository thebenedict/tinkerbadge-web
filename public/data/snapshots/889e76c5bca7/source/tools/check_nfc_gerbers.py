#!/usr/bin/env python3
"""Check the exported copper Gerbers, not the board file, for copper in the NFC window.

Complements check_nfc_window.py (which reads the native board): this parses what the
fabricator receives. Fails when an inner layer has any filled copper or track in the
window, or when a front-layer track there is not part of the coil feed.

Usage: check_nfc_gerbers.py GERBER_DIR BOARD_DUMP.json [--output FILE]
       (BOARD_DUMP is tools/pcb_dump.py output, used only to identify the feed nets)
"""
import argparse
import json
import pathlib
import re
import sys

WINDOW = (180.55, 165.2, 200.45, 180.0)     # board mm; matches tools/check_nfc_window.py
FEED = ('NFC_LA', 'NFC_LB')
LAYERS = {'F.Cu': 'tinkerbadge-F_Cu.gtl', 'In1.Cu': 'tinkerbadge-In1_Cu.g1', 'In2.Cu': 'tinkerbadge-In2_Cu.g2'}


def parse(path):
    """Return (regions, draws, flashes) in board mm (Gerber y is negated back)."""
    text = pathlib.Path(path).read_text()
    if re.search(r'G0[23]\*|%LPC', text):
        raise SystemExit(f'{path}: arcs or clear polarity present; this checker handles neither')
    aps = {int(m.group(1)): float(m.group(2)) for m in re.finditer(r'%ADD(\d+)C,([\d.]+)\*%', text)}
    regions, draws, flashes = [], [], []
    cur = None
    x = y = 0.0
    ap = None
    region = None
    for cmd in re.sub(r'%[^%]*%', '', text).split('*'):
        cmd = cmd.strip()
        if not cmd or cmd.startswith('G04'):
            continue
        if cmd == 'G36':
            region = []
            continue
        if cmd == 'G37':
            if region:
                regions.append(region)
            region = None
            continue
        m = re.fullmatch(r'(?:G54)?D(\d+)', cmd)
        if m and int(m.group(1)) >= 10:
            ap = int(m.group(1))
            continue
        m = re.fullmatch(r'(?:G0?1)?(?:X(-?\d+))?(?:Y(-?\d+))?(?:D0?([123]))?', cmd)
        if not m or not any(m.groups()):
            continue
        nx = int(m.group(1)) / 1e6 if m.group(1) else x
        ny = -int(m.group(2)) / 1e6 if m.group(2) else y
        op = m.group(3)
        if region is not None:
            if op == '2' or not region:
                if region:
                    regions.append(region)
                    region = []
                region.append((nx, ny))
            else:
                region.append((nx, ny))
        elif op == '1':
            draws.append((x, y, nx, ny, aps.get(ap, 0.0)))
        elif op == '3':
            flashes.append((nx, ny, ap))
        x, y = nx, ny
    return regions, draws, flashes


def covered(regions, step=0.2):
    """Sample the window; return how many sample points lie inside any filled region."""
    x0, y0, x1, y1 = WINDOW
    edges = []
    for r in regions:
        for a, b in zip(r, r[1:] + r[:1]):
            if a[1] != b[1] and max(a[1], b[1]) >= y0 and min(a[1], b[1]) <= y1:
                edges.append((a, b))
    hit = total = 0
    j = 0
    while y0 + 0.1 + j * step < y1:
        py = y0 + 0.1 + j * step + 1e-7
        xs = sorted(a[0] + (py - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) for a, b in edges if (a[1] > py) != (b[1] > py))
        i = 0
        while x0 + 0.1 + i * step < x1:
            px = x0 + 0.1 + i * step
            total += 1
            if sum(1 for v in xs if v > px) % 2:
                hit += 1
            i += 1
        j += 1
    return hit, total


def in_window(xa, ya, xb, yb, r):
    """Does the segment, widened by r, enter the window? (Liang-Barsky clip against the grown box.)"""
    x0, y0, x1, y1 = WINDOW[0] - r, WINDOW[1] - r, WINDOW[2] + r, WINDOW[3] + r
    t0, t1 = 0.0, 1.0
    dx, dy = xb - xa, yb - ya
    for p, q in ((-dx, xa - x0), (dx, x1 - xa), (-dy, ya - y0), (dy, y1 - ya)):
        if p == 0:
            if q <= 0:
                return False
            continue
        t = q / p
        if p < 0:
            t0 = max(t0, t)
        else:
            t1 = min(t1, t)
    return t0 < t1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('gerbers')
    ap.add_argument('dump')
    ap.add_argument('--output')
    a = ap.parse_args()
    dump = json.load(open(a.dump))
    feed = [t for t in dump['tracks'] if t['net'].split('/')[-1] in FEED]
    feed_pts = {(round(p[0], 3), round(p[1], 3)) for t in feed for p in (t['a'], t['b'])}
    feed_vias = {(round(v['x'], 3), round(v['y'], 3)) for v in dump['vias'] if v['net'].split('/')[-1] in FEED}
    feed_pads = {(round(p['x'], 3), round(p['y'], 3)) for p in dump['pads'] if p['net'].split('/')[-1] in FEED}
    out = {'window_mm': list(WINDOW), 'layers': {}, 'issues': []}
    for layer, name in LAYERS.items():
        regions, draws, flashes = parse(pathlib.Path(a.gerbers) / name)
        hit, total = covered(regions)
        inside = [d for d in draws if in_window(*d[:4], d[4] / 2)]
        other = [d for d in inside if not ((round(d[0], 3), round(d[1], 3)) in feed_pts and (round(d[2], 3), round(d[3], 3)) in feed_pts)]
        fl = [f for f in flashes if WINDOW[0] < f[0] < WINDOW[2] and WINDOW[1] < f[1] < WINDOW[3]]
        other_fl = [f for f in fl if (round(f[0], 3), round(f[1], 3)) not in feed_vias | feed_pads]
        out['layers'][layer] = {'filled_samples_in_window': hit, 'samples': total, 'tracks_in_window': len(inside),
                                'tracks_not_feed': len(other), 'pads_or_vias_in_window': len(fl), 'pads_or_vias_not_feed': len(other_fl)}
        if hit:
            out['issues'].append(f'{layer}: filled copper at {hit} of {total} sample points in the window')
        if other:
            out['issues'].append(f'{layer}: {len(other)} track segments in the window are not the coil feed, first at {[round(v, 2) for v in other[0][:4]]}')
        if other_fl:
            out['issues'].append(f'{layer}: {len(other_fl)} pads or vias in the window are not coil terminals, first at {[round(v, 2) for v in other_fl[0][:2]]}')
        if layer != 'F.Cu' and inside:
            out['issues'].append(f'{layer}: {len(inside)} track segments in the window')
    out['status'] = 'PASS' if not out['issues'] else 'FAIL'
    text = json.dumps(out, indent=1)
    if a.output:
        pathlib.Path(a.output).write_text(text + '\n')
    print(text)
    sys.exit(0 if out['status'] == 'PASS' else 1)


if __name__ == '__main__':
    main()
