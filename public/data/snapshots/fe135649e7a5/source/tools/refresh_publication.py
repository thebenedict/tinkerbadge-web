#!/usr/bin/env python3
"""Rebuild and verify the current KiCad -> manufacturing/enclosure snapshot."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
from check_export_chain import ROOT, check, sha


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cad-python', required=True, help='Python with mechanical/enclosure/requirements.txt installed')
    parser.add_argument('--kicad-python', default='/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3')
    args = parser.parse_args()
    out = ROOT / 'exports/publication'
    out.mkdir(parents=True, exist_ok=True)
    native = [ROOT/'tinkerbadge.kicad_pcb', ROOT/'tinkerbadge.kicad_pro', ROOT/'tinkerbadge.kicad_dru', *sorted(ROOT.glob('*.kicad_sch'))]
    before = {str(p.relative_to(ROOT)): sha(p) for p in native}

    def run(*command):
        result = subprocess.run(list(map(str, command)), cwd=ROOT, capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)

    run('kicad-cli', 'sch', 'erc', 'tinkerbadge.kicad_sch', '--severity-all', '--format', 'json', '-o', 'exports/publication/erc.json')
    # Refill in memory. Do not rewrite the reviewed board or its project settings.
    run('kicad-cli', 'pcb', 'drc', 'tinkerbadge.kicad_pcb', '--refill-zones', '--schematic-parity', '--severity-all', '--format', 'json', '-o', 'exports/publication/drc.json')
    run('kicad-cli', 'sch', 'export', 'netlist', 'tinkerbadge.kicad_sch', '-o', 'exports/publication/tinkerbadge.net')
    for script, name in [('check_schematic_contracts.py', 'contracts'), ('check_schematic_properties.py', 'properties')]:
        run(sys.executable, 'tools/' + script, 'exports/publication/tinkerbadge.net', '--output', out/(name+'.json'))
    erc = json.loads((out/'erc.json').read_text())
    drc = json.loads((out/'drc.json').read_text())
    erc_violations = [v for sheet in erc['sheets'] for v in sheet['violations']]
    counts = {'erc_errors': sum(v['severity'] == 'error' for v in erc_violations),
              'erc_warnings': sum(v['severity'] == 'warning' for v in erc_violations),
              'drc_errors': sum(v['severity'] == 'error' for v in drc['violations']),
              'drc_warnings': sum(v['severity'] == 'warning' for v in drc['violations']),
              'unconnected_items': len(drc['unconnected_items']), 'schematic_parity': len(drc['schematic_parity'])}
    if any(counts[key] for key in ['erc_errors', 'drc_errors', 'unconnected_items', 'schematic_parity']):
        raise RuntimeError('Electrical checks failed: ' + json.dumps(counts))
    print('Native electrical checks:', json.dumps(counts), flush=True)
    run(sys.executable, 'tools/export_jlc.py')
    run(args.kicad_python, 'mechanical/enclosure/extract_interfaces.py')
    run(args.cad_python, 'mechanical/enclosure/build.py')
    if before != {str(p.relative_to(ROOT)): sha(p) for p in native}:
        raise RuntimeError('Native inputs changed during publication build')
    sources = [*native, *sorted((ROOT/'docs/design').glob('*_contract.json')),
               *[ROOT/'tools'/name for name in ['refresh_publication.py','check_export_chain.py','export_jlc.py','check_schematic_contracts.py','check_schematic_properties.py','check_nfc_window.py','check_nfc_gerbers.py']]]
    outputs = [*sorted(out.glob('*.json')), out/'tinkerbadge.net', ROOT/'production/jlcpcb/manifest.json', ROOT/'mechanical/enclosure/exports/manifest.json', ROOT/'mechanical/enclosure/exports/enclosure-cad.zip']
    evidence = {'schema_version': 1, 'board_sha256': before['tinkerbadge.kicad_pcb'],
                'kicad': subprocess.check_output(['kicad-cli','version'], text=True).strip(),
                'zone_refill': 'in-memory; native inputs unchanged', 'checks': counts,
                'source_hashes': {str(p.relative_to(ROOT)): sha(p) for p in sources},
                'output_hashes': {str(p.relative_to(ROOT)): sha(p) for p in outputs if p.name != 'manifest.json' or p.parent != out}}
    (out/'manifest.json').write_text(json.dumps(evidence, indent=2)+'\n')
    print(json.dumps(check(), indent=2))


if __name__ == '__main__':
    main()
