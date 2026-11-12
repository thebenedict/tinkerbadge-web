#!/usr/bin/env python3
"""Read mechanical datums from native KiCad; run with KiCad's Python."""
import hashlib
import json
from pathlib import Path
import pcbnew

ROOT = Path(__file__).resolve().parents[2]
board_path = ROOT / 'tinkerbadge.kicad_pcb'
board = pcbnew.LoadBoard(str(board_path))
refs = {'H1','H2','H3','H4','H5','H6','SW401','SW402','SW403',
        'J101','J102','J103','J301','J501','J502','U501','U504','D501',
        'MECH_PANEL','MECH_BATTERY','AE501',*[f'D40{i}' for i in range(1,10)]}
records = {}
for f in board.GetFootprints():
    if f.GetReference() not in refs:
        continue
    p = f.GetPosition()
    x, y = pcbnew.ToMM(p.x), pcbnew.ToMM(p.y)
    records[f.GetReference()] = {
        'pcb_mm': [x,y], 'xy_mm': [x-155,140-y],
        'rotation_deg': f.GetOrientationDegrees(), 'layer': f.GetLayerName(),
        'footprint': str(f.GetFPID().GetLibItemName()),
        'pads': [{'number':p.GetNumber(),
                  'xy_mm':[pcbnew.ToMM(p.GetPosition().x)-155,140-pcbnew.ToMM(p.GetPosition().y)],
                  'size_mm':[pcbnew.ToMM(p.GetSize().x),pcbnew.ToMM(p.GetSize().y)],
                  'drill_mm':[pcbnew.ToMM(p.GetDrillSize().x),pcbnew.ToMM(p.GetDrillSize().y)]}
                 for p in f.Pads()]
    }
data = {'board': 'tinkerbadge.kicad_pcb',
        'board_sha256': hashlib.sha256(board_path.read_bytes()).hexdigest(),
        'kicad_version': pcbnew.Version(),
        'datum': 'millimetres; x=pcb_x-155; y=140-pcb_y; z=0 front PCB surface; +z toward display',
        'pcb_thickness_mm':pcbnew.ToMM(board.GetDesignSettings().GetBoardThickness()),
        'references':records}
Path(__file__).with_name('interfaces.json').write_text(json.dumps(data,indent=2)+'\n')
print('Extracted',len(records),'mechanical references; board',data['board_sha256'])
