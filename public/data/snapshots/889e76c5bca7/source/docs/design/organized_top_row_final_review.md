# Organized groups and top row: final combined review

9 November 2026. **Pass for the saved native placement delta.** The final board has the requested organized groups, corrected sensor bypass allocation, left-open antenna shoulder and revised top role-LED arrangement. Existing routing, RF, mechanical and manufacturing gates remain.

## Pinned revisions

- Original active board: `tinkerbadge.kicad_pcb`, SHA256 `a49a19fdf1a2cea1b223f419887e369ab844f49adc9933a0688ba7f01e2ab7b4`.
- Intermediate organized placement: `.build/spread-one-sided/tinkerbadge.kicad_pcb`, SHA256 `2ff74d95a154bce47ce87e97cf86c60af26514ff08235ffc70f8b9189b61ddda`.
- Final candidate: `.build/top-role-one-sided/tinkerbadge.kicad_pcb`, SHA256 `08b5de1ac1b194544ebf15598fd0b40e66a4e0c05123c6da75603a769d91554e`.
- Reviewed final delta: `.build/top-role-one-sided/reviewed-proposal.json`.
- Machine-readable audit: `.build/organized_top_row_delta_check.json`.

Checks used native KiCad 10.0.8 LoadBoard, in-memory inverse transforms, native polygon operations and file hashing. No SaveBoard or native CAD, project, library or model writes were made by this reviewer.

## Exact moves and preservation

Compared independently with both baselines:

| Comparison | Distinct moved references | Unexpected moves | Placement/rotation mismatches |
|---|---:|---:|---:|
| Final versus intermediate | 18 | 0 | 0 |
| Final versus original | 48 | 0 | 0 |

The final placements match the merged reviewed proposals exactly. The difference is 48 rather than 50 distinct references because C501/C502 move in both steps.

For each comparison, all 186 final footprints were restored in memory to that baseline's position and orientation, serialized with KiCad's native formatter, parsed and compared. **Every complete footprint record matched exactly**, ignoring only element serialization order. No numeric tolerance or property exclusion was needed.

This verifies preservation of values, all fields/properties, schematic associations, attributes, 568 physical pad primitives including 539 numbered pads, local pad geometry, drills, masks/paste, custom shapes, graphics, models and footprint-owned rule areas. Model offsets/rotations/scales are unchanged. Board content outside footprints and editor groups is identical between intermediate and final; the final step adds no copper, silkscreen, outline or annotation changes.

The board still has 170 electrical footprints: 164 front electrical footprints and six rear copper test pads. Four copper layers and zero tracks/vias are unchanged.

## Final top arrangement

- D401/D402/D403 are at x160/180.5/201, all y103 and 180°. Their pitch is 20.5 mm.
- Their bypass capacitors C401/C402/C403 sit 2.5 mm west at y103, all 90°. Each capacitor positive-pad center is 1.601 mm from its LED VDD pad.
- IR receiver U504 is at (186.5,106.5), and emitter D501 at (196.5,106.5), retaining 10 mm center separation. The three RC-filter components R507/C509/C510 are locally repacked as specified, rather than mistakenly treated as a rigid translation.
- C509 at (192,103),90°, and C510 at (192,106.5),270°, have positive-pad distances of 2.764 and 2.402 mm to U504 VCC.
- Ambient sensor U501 is at (206,107.5),0°; C501 at (202,107.5),180°; C502 at (208,105),0°. Their positive-pad distances to U501 VCC/DVI are 1.916 and 2.504 mm.

The earlier sensor correction remains intact: C501/C502 belong to ambient U501; C503/C504/C505 belong to accelerometer U502; C506 remains with NFC U503. The accelerometer's placement/axis orientation and all four earlier rigid functional groups are unchanged from the checked intermediate. The original allocation error was positional, not a net/value error, and is not reintroduced by the top-row change.

Pad-center distances describe geometry, not completed routing. Retain short supply/return loops, nearby capacitor ground vias, and clear I²C, LED-data and IR signal escapes.

## Eight native groups

Native group contents exactly match the reviewed proposals and pass KiCad's group sanity check:

- Quiet battery ADC: U107, R127–R130, C115/C116.
- Main 3V3 converter: U103, C107–C109, R117/R118, RES_L101.
- Display load switch: U104, C112–C114, R119.
- I/O expander: U506, C514/C515, R514–R517.
- Accelerometer: U502, C503/C504/C505.
- Ambient-light sensor: U501, C501/C502. This replaces the earlier two-capacitor-only bypass group.
- Top role LEDs: D401–D403 and C401–C403.
- Infrared optical group: U504, D501, R507, C509/C510, Q501, R504–R506.

No duplicate, missing or unexpected member was found.

## Planar and edge checks

Native courtyard polygon intersections across 177 front and 9 rear courtyards show **zero positive-area collisions**.

The valid single closed outline remains 110 × 80 mm, bounds x100–210/y100–180. Its left-open shoulder and removed PCB sliver are unchanged from the intermediate. The radio keepout still intersects board material by 0 mm². The full 234 mm² NFC reserve remains on-board. Both retain their all-four-layer prohibitions.

Every copper pad of the 18 further-moved references is inside the actual native outline and clear of both keepouts. This check includes the rounded upper-right corner, not only rectangular board bounds. The smallest final copper-edge gap is C502 at **0.775 mm**, above the unchanged 0.5 mm rule. The native outline polygonization maximum error is 0.005 mm.

The closest newly moved copper to the H6 Ø3.2 mm cord drill is U501 at approximately **2.428 mm**. Native courtyard checks also include the cord-sweep reservation. Actual cord/hardware/enclosure geometry and optical isolation still need qualification; these planar checks do not supply a complete assembly clearance model.

## Dependencies and DRC

All 167 model assignments resolve to 33 distinct model files. Staged models, local footprints, schematics and symbol libraries are byte-identical to root. Root and final staged project settings matched at the inspection checkpoint.

The saved native DRC dated 2026-11-09 15:48:45 contains only the same:
- Four USB NPTH-to-pad clearance errors, 0.1944 mm versus 0.2500 mm.
- One module silkscreen/edge warning.
- 390 unconnected-item reports for the unrouted board.
- Nine unresolved-footprint schematic-parity reports.

The four USB findings retain identical descriptions and affected pad UUID pairs. Ignored-check settings are unchanged. No new courtyard, copper, mask, keepout, outline or copper-edge finding appears. This reviewer inspected that saved report and independently checked geometry; the full DRC engine was not rerun by this reviewer. The board is not DRC-clean.

## Remaining review and release gates

Keep the wide, low-impedance charger-to-converter VSYS feed, continuous return and deliberate routing corridor required by the organized placement. Preserve short local bypass, converter/boost and feedback paths. Exact magnetic parts, unresolved connectors/antenna, effective capacitor ratings and routing escapes remain open.

The existing experimental RF clearance, NFC tuning, display/flex/support/height tolerances, optical isolation, battery/enclosure mechanics and manufacturing exceptions remain. Moving optics nearer role LEDs makes final light barriers and sensor calibration important; no optical-isolation qualification is implied.

Fresh final native renders were subsequently inspected as recorded below. The separate annotation overlay remains outside this review. The full native comparison confirms that no annotation or new silkscreen was added to the authoritative candidate. Obtain human placement approval before detailed routing.

## Fresh native-render inspection

Actual pixels in all four PNGs under `exports/pcb-review/organized-top-row/` were inspected after the native checks:

- `front-components.png`, SHA256 `81c069968e541228b4537a0e72d538e89fd4c9e6403eb40b894c16b4e0ee4ba0`: Organized group locations, corrected sensor capacitor positions, aligned three-LED top row, unchanged five-LED bottom row and removed left sliver agree with the checked native candidate; no obvious body overlap.

- `front-with-display.png`, SHA256 `1833c8aa6e9a36530dc15b51b88ff8910129a37a845aef261f016ef8068abdc7`: Raised glass envelope, exposed top LEDs/optics, left buttons, right connectors and holes agree with the recorded placement.

- `rear-with-battery.png`, SHA256 `e88c4c61829dc5ceba1c83573420a821f7e4bea66195689e136488df3c3e9134`: Rear battery/SAO allowances and six test pads remain in their recorded locations; revised outline is visible.

- `raised-display-perspective.png`, SHA256 `d36347947222bf56bde7f376e772667efb25ab8762825f1ecb7c2179f5ad71a0`: Proposed raised display, exterior LED rows, side controls/connectors and underlying component space are consistent. Supports, flex/cables and final enclosure remain unmodeled.

No new obvious visual collision or disagreement with the checked placement was found. The independent native-preservation, planar and visual checks support applying this exact candidate as the next experimental development placement. This does not approve routing or manufacture. The separate annotation overlay was not part of this visual pass and does not change the native board.
