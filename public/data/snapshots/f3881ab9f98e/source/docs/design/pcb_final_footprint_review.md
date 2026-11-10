# Final placement footprint review

Temporary review artifacts below are identified by filename only; these intermediate files are not distributed. Published source outputs and repeatable checks are linked from the [current verification record](verification.md).

9 November 2026. Independent read-only review using KiCad 10.0.8. Reviewed board SHA256: `322dc5d129db733813ff2d9dc0912e813fc9aa27043376b74c5deea2b9d668fa`. The board hash was unchanged after the checks. No production CAD was edited and `SaveBoard` was not called.

## Result

Electrical pin/net parity, actual source pad geometry, model associations, keepouts, footprint attributes and schematic metadata pass for this placement checkpoint. The board is unrouted and is not approved for fabrication or assembly.

- **Connectivity:** All 170 placed electrical components, 524 distinct logical endpoints and 539 numbered physical pad primitives agree with `exports/tinkerbadge.net` (SHA256 `8409e65a237a60fd872eb89a0f4c5aa5caa0808df69a90cfe8a569411a77af59`). No missing pads or unexpected pad nets on placed components. The nine documented unresolved references remain absent: AE501, J102, J103, J104, J301, J502, L101, L301 and U105.
- **Critical pads:** All four J101 `SH` pads are GND. Overlapping USB power-contact pad identifiers have matching nets. U102 exposed pad 17 and VSS pin 8 are GND. U103 pad 8 is GND, has no B.Paste, and retains two separate B.Paste-only windows. It has no pin 11. U201 ground/EP pad primitives retain GND.
- **Geometry:** Every placed pad matches the current source footprint after its native side/rotation/position transform. This includes shape, number, size, drill, layers, active roundrect radius and offsets. U503 pads are rectangular. The earlier reported roundrect-radius difference was an inactive API field, not a copper difference, and is withdrawn.
- **Models:** All 167 model associations and transforms match their source footprints; every referenced model file exists. This verifies association and availability, not complete mechanical certification of vendor models or dimensional envelopes. Earlier top/bottom 3D images were inspected; final model/enclosure fit remains a separate mechanical check.
- **Keepouts:** The two footprint-owned rule areas are present. U201 spans x=94–142, y=79–100 mm; MECH_NFC spans x=176–206, y=181–198 mm. Both prohibit tracks, vias, pads, fills and footprints on F.Cu, In1.Cu, In2.Cu and B.Cu. Their polygons and restrictions match the sources. The ESP32 all-copper source mask is correctly restricted to the four enabled board copper layers.
- **Attributes:** All attributes match source libraries after the intentional exceptions. H1–H6 are board-only and excluded from BOM/position output. TP201–TP206 are included in the BOM to match their symbols, retaining their source position-file exclusion. Electrical references are on the correct side's Fab layer.
- **Schematic metadata:** All 170 UUID paths, sheet names, sheet files, values, datasheets, descriptions and copied custom fields match the refreshed export. The earlier sheet metadata omission is resolved.
- **Population caveat:** C507/C508 have `Population=DNP` and `TUNE / DNP` values, but native `IsDNP()` is false. This is the previously documented custom-field population workflow. Manufacturing exports must honor the approved population records; native-flag-only exporters would not exclude them.

## Final placement delta

Verified directly in the pinned native board: J501 is B.Cu at (206.5,165.0), 270°; the board-only SAO reservation RES_J502 is B.Cu at (151.5,116.0); SW401 is F.Cu at (102.1,161.0), 270°; SW402 is F.Cu at (102.1,171.0), 270°. The complete pad/net, source geometry and metadata checks were rerun after these changes, rather than assuming rotation or movement preserved them.

## Independent DRC

A new CLI DRC with schematic parity was run without zone refill or board saving. It found:

- Four J101 hole-clearance errors: 0.1944 mm actual against the 0.25 mm project rule. These represent two physical NPTH-to-ground-land gaps, each reported twice for overlapping USB logical contacts. The geometry agrees with the reviewed GCT land pattern. Resolve through the chosen fabrication process and an explicit, justified local rule or reviewed geometry change before release. This review does not waive the rule.
- Two U201 silkscreen/board-edge warnings from the overhanging radio footprint. Final fabrication silk needs clipping or cleanup without compromising the antenna placement.
- 390 unconnected items, expected for the unrouted board.
- Nine schematic-parity findings, corresponding exactly to the unresolved references listed above.
- No other reported violations, including no source-library mismatch or courtyard-overlap violations. Existing project-disabled checks are recorded in the JSON; this is not a blanket DRC-clean result.

Exact evidence: `exports/pcb-review/final-electrical-footprint-review.json`. Independent DRC: `final-independent-drc.json`. Read-only audit used during review: `audit_final.py`.

Human placement approval, unresolved parts/interfaces, source-current and thermal design, paste/assembly qualification, final model/enclosure fit, detailed routing and final manufacturing checks remain separate gates.
