#!/usr/bin/env python3
"""Reject stale manufacturing, enclosure, verification, or archived CAD files."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_hashes(root, hashes):
    if not hashes:
        raise RuntimeError('Missing input/output hashes')
    for name, expected in hashes.items():
        path = (root / name).resolve()
        if not path.is_relative_to(root.resolve()) or sha(path) != expected:
            raise RuntimeError('Stale or invalid export input: ' + name)


def check(root=ROOT):
    board_hash = sha(root / 'tinkerbadge.kicad_pcb')
    production = json.loads((root / 'production/jlcpcb/manifest.json').read_text())
    verify_hashes(root, production['source_hashes'])
    verify_hashes(root, production['sha256'])
    if production['nfc_window_check'] != 'PASS' or production['nfc_gerber_check'] != 'PASS':
        raise RuntimeError('NFC manufacturing checks failed')
    enclosure = root / 'mechanical/enclosure'
    metadata = json.loads((enclosure / 'exports/manifest.json').read_text())
    if metadata['board_sha256'] != board_hash:
        raise RuntimeError('Enclosure belongs to a different PCB')
    verify_hashes(enclosure, metadata['source_hashes'])
    verify_hashes(enclosure / 'exports', metadata['output_hashes'])
    fit = json.loads((enclosure / 'exports/native-fit.json').read_text())
    if fit['status'] != 'pass' or fit['board_sha256'] != board_hash:
        raise RuntimeError('Native enclosure fit check is stale or failed')
    verify_hashes(enclosure, fit['checked_source_hashes'])
    with zipfile.ZipFile(enclosure / 'exports/enclosure-cad.zip') as archive:
        for name, expected in metadata['source_hashes'].items():
            if hashlib.sha256(archive.read(name)).hexdigest() != expected:
                raise RuntimeError('Stale enclosure archive source: ' + name)
        for name, expected in metadata['output_hashes'].items():
            if hashlib.sha256(archive.read('exports/' + name)).hexdigest() != expected:
                raise RuntimeError('Stale enclosure archive output: ' + name)
        if archive.read('exports/manifest.json') != (enclosure / 'exports/manifest.json').read_bytes():
            raise RuntimeError('Stale enclosure archive manifest')
    evidence = json.loads((root / 'exports/publication/manifest.json').read_text())
    verify_hashes(root, evidence['source_hashes'])
    verify_hashes(root, evidence['output_hashes'])
    return {'status': 'pass', 'board_sha256': board_hash,
            'checks': evidence['checks'], 'enclosure_revision': metadata['revision']}


if __name__ == '__main__':
    print(json.dumps(check(), indent=2))
