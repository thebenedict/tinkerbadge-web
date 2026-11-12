#!/usr/bin/env python3
"""Build the JLCPCB order package from the native KiCad files.

Writes production/jlcpcb/: Gerbers and drill files (zipped), a BOM and a
placement (CPL) file in JLCPCB's column layout, and a manifest with file
hashes. Hand-fit, DNP and PCB-feature parts are left out of BOM and CPL.

Usage: export_jlc.py   (repository root; needs kicad-cli)
"""
import csv
import hashlib
import io
import json
import pathlib
import shutil
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'production/jlcpcb'
PCB = ROOT / 'tinkerbadge.kicad_pcb'
SCH = ROOT / 'tinkerbadge.kicad_sch'
LAYERS = 'F.Cu,In1.Cu,In2.Cu,B.Cu,F.Paste,B.Paste,F.Silkscreen,B.Silkscreen,F.Mask,B.Mask,Edge.Cuts'


def run(*args):
    r = subprocess.run(['kicad-cli', *args], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr or r.stdout)


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    g = OUT / 'gerbers'
    g.mkdir(parents=True)
    run('pcb', 'export', 'gerbers', str(PCB), '-o', str(g) + '/', '--layers', LAYERS, '--subtract-soldermask', '--no-x2', '--no-netlist')
    run('pcb', 'export', 'drill', str(PCB), '-o', str(g) + '/', '--format', 'excellon', '--excellon-units', 'mm',
        '--excellon-separate-th', '--drill-origin', 'absolute', '--excellon-zeros-format', 'decimal', '--generate-map', '--map-format', 'gerberx2')
    for f in g.glob('*.gbrjob'):
        f.unlink()
    with zipfile.ZipFile(OUT / 'tinkerbadge-gerbers.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for f in sorted(g.iterdir()):
            z.write(f, f.name)

    # BOM from the schematic
    raw = OUT / '_bom.csv'
    run('sch', 'export', 'bom', str(SCH), '-o', str(raw), '--fields', 'Reference,Value,Footprint,LCSC,MPN,Assembly,${DNP}',
        '--labels', 'Reference,Value,Footprint,LCSC,MPN,Assembly,DNP', '--exclude-dnp')
    rows = list(csv.DictReader(io.StringIO(raw.read_text())))
    raw.unlink()
    groups = {}
    hand = []
    for r in rows:
        ref = r['Reference']
        if not r['LCSC']:
            continue                      # test pads, dock pads, coil
        if r['Assembly'].startswith('hand'):
            hand.append(r)
            continue
        key = (r['LCSC'], r['Footprint'])
        groups.setdefault(key, {'refs': [], 'row': r})['refs'].append(ref)
    def refkey(s):
        import re
        m = re.match(r'([A-Z]+)(\d+)', s)
        return (m.group(1), int(m.group(2)))
    with open(OUT / 'bom-jlcpcb.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['Comment', 'Designator', 'Footprint', 'LCSC Part #', 'Manufacturer Part', 'Qty'])
        for (lcsc, fp), gr in sorted(groups.items(), key=lambda kv: refkey(sorted(kv[1]['refs'], key=refkey)[0])):
            refs = sorted(gr['refs'], key=refkey)
            w.writerow([gr['row']['Value'], ','.join(refs), fp.split(':')[-1], lcsc, gr['row']['MPN'], len(refs)])
    with open(OUT / 'bom-hand-fit.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['Comment', 'Designator', 'Footprint', 'LCSC Part #', 'Manufacturer Part', 'Qty', 'Note'])
        for r in hand:
            w.writerow([r['Value'], r['Reference'], r['Footprint'].split(':')[-1], r['LCSC'], r['MPN'], 1, 'through-hole, solder by hand after SMT'])
    placed = {ref for gr in groups.values() for ref in gr['refs']}

    # placement file
    raw = OUT / '_pos.csv'
    run('pcb', 'export', 'pos', str(PCB), '-o', str(raw), '--format', 'csv', '--units', 'mm', '--side', 'front', '--exclude-dnp')
    pos = list(csv.DictReader(io.StringIO(raw.read_text())))
    raw.unlink()
    seen = set()
    with open(OUT / 'cpl-jlcpcb.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['Designator', 'Mid X', 'Mid Y', 'Layer', 'Rotation'])
        for p in sorted(pos, key=lambda p: refkey(p['Ref'])):
            if p['Ref'] in placed:
                w.writerow([p['Ref'], f"{float(p['PosX']):.4f}mm", f"{float(p['PosY']):.4f}mm", 'Top', f"{float(p['Rot']) % 360:g}"])
                seen.add(p['Ref'])
    missing = sorted(placed - seen)
    extra = sorted({p['Ref'] for p in pos} - placed)

    # assembly drawings: every reference is on the fabrication layers, including the parts under the display
    run('pcb', 'export', 'pdf', str(PCB), '-o', str(OUT / 'assembly-front.pdf'), '--layers', 'F.Fab,F.Courtyard,Edge.Cuts',
        '--mode-single', '--include-border-title')
    run('pcb', 'export', 'pdf', str(PCB), '-o', str(OUT / 'assembly-rear.pdf'), '--layers', 'B.Fab,B.Silkscreen,B.Courtyard,Edge.Cuts',
        '--mode-single', '--mirror', '--include-border-title')

    # NFC antenna window regression check (must pass before the package is usable)
    py = '/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/Current/bin/python3'
    chk = subprocess.run([py, str(ROOT / 'tools/check_nfc_window.py'), str(PCB), '--output', str(OUT / 'nfc-window-check.json')],
                         capture_output=True, text=True)
    nfc = json.loads((OUT / 'nfc-window-check.json').read_text())['status']
    if nfc != 'PASS':
        raise SystemExit('NFC window check failed; see ' + str(OUT / 'nfc-window-check.json'))
    # the same property on the files the fabricator receives
    dump = ROOT / '.build/jlc_board_dump.json'
    dump.parent.mkdir(exist_ok=True)
    subprocess.run([py, str(ROOT / 'tools/pcb_dump.py'), str(PCB), str(dump)], capture_output=True, text=True)
    gchk = subprocess.run([sys.executable, str(ROOT / 'tools/check_nfc_gerbers.py'), str(OUT / 'gerbers'), str(dump),
                        '--output', str(OUT / 'nfc-gerber-check.json')], capture_output=True, text=True)
    if gchk.returncode != 0:
        raise SystemExit('NFC Gerber check failed; see ' + str(OUT / 'nfc-gerber-check.json'))

    manifest = {'nfc_window_check': nfc, 'nfc_gerber_check': 'PASS', 'kicad': subprocess.run(['kicad-cli', 'version'], capture_output=True, text=True).stdout.strip(),
                'bom_lines': len(groups), 'placements': len(seen), 'in_bom_not_in_cpl': missing, 'in_pos_not_in_bom': extra,
                'sha256': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in [PCB, SCH, ROOT / 'tinkerbadge.kicad_pro', ROOT / 'tinkerbadge.kicad_dru', *sorted(OUT.glob('*.csv')), *sorted(OUT.glob('*.pdf')), OUT / 'tinkerbadge-gerbers.zip']}}
    # The manufacturing BOM depends on every sheet, not just the root sheet.
    manifest['source_hashes'] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                                for p in [PCB, ROOT / 'tinkerbadge.kicad_pro', ROOT / 'tinkerbadge.kicad_dru',
                                          *sorted(ROOT.glob('*.kicad_sch'))]}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
    print('bom lines', len(groups), 'placements', len(seen), 'hand-fit', [r['Reference'] for r in hand])
    print('in BOM but not placed:', missing, '| in pos file but not in BOM:', extra)
    print(sorted(p.name for p in g.iterdir()))


if __name__ == '__main__':
    main()
