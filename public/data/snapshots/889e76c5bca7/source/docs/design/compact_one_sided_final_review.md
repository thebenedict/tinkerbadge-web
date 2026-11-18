# Compact one-sided final placement review

9 November 2026. **Pass for presentation as an experimental 110 × 80 mm placement, with the existing production/routing blockers retained.** No new planar courtyard collision or electrical-footprint alteration was found. This is not RF, flex, complete 3D, manufacturing or human placement approval.

## Pinned inputs and scope

- Candidate: `.build/compact-one-sided/tinkerbadge.kicad_pcb`, SHA256 `a49a19fdf1a2cea1b223f419887e369ab844f49adc9933a0688ba7f01e2ab7b4`.
- Active board after application: `tinkerbadge.kicad_pcb`, SHA256 `a49a19fdf1a2cea1b223f419887e369ab844f49adc9933a0688ba7f01e2ab7b4`. Independent byte comparison confirms it is identical to the reviewed candidate.
- Preserved 100 mm fallback: `docs/design/history/2026-11-09-100mm-two-sided-fallback/tinkerbadge.kicad_pcb`, SHA256 `99158950ecce21da92f8c0e9343ecf60316f321255fd496f790517ac7717f49f`.
- Candidate plan: `.build/compact-one-sided/pcb_placement.json`.
- DRC inspected: `.build/compact-one-sided/drc.json`, KiCad 10.0.8, dated 2026-11-09 14:51:46.
- Tool: read-only native KiCad 10.0.8 LoadBoard inspection. No SaveBoard, routing, CAD/project/model edits or DRC-rule changes by this reviewer. Only this report was written.
- Root project constraints were checked because preview-generation derivatives can temporarily load default project settings. Candidate and root project files matched at the inspection checkpoint.

This validates the actual saved native geometry, not only the placement generator or its self-reported counts. The exact reviewed 80 mm candidate is now the active root board and remains explicitly experimental. The 100 mm fallback remains preserved. This application changed no reviewed board bytes, so the geometry findings below apply unchanged.

## Outline and RF reservations: verified

Native GetBoardPolygonOutlines, with outline inference disabled and NPTH drills excluded from the outline polygon, returned **valid**, one outer outline and no enclosed internal outline holes. Its exact bounding box is x100..210, y100..180: **110 × 80 mm**.

Fourteen Edge.Cuts primitives form the continuous boundary: eight segments and six arcs. The four outer corners have radius 4.0. The top-open notch starts at x105/155,y100, its vertical walls end y106.25, its two lower arcs have radius 0.5, and its straight floor runs x105.5..154.5,y106.75. There is no overlapping rectangle closing the notch.

Native polygon tests confirm no board material at the antenna or lateral keepout sample locations, including (130,100.5), (130,106.5), (106,106.5) and (154,106.5); material resumes at (130,106.8). Exact polygon intersection of the radio rule area with board material is **0 mm²**.

Both rule areas are footprint-owned, so zero board-owned zones does not mean the exclusions are missing:

| Owner | Native bounds | Layers and prohibitions |
|---|---|---|
| U201 | x106..154, y85.5..106.5 | F.Cu, In1.Cu, In2.Cu, B.Cu; tracks, vias, pads, footprints and pours all prohibited |
| MECH_NFC | x182..200, y166..179 | Same four layers and all five prohibitions |

The NFC reservation is 18 × 13 = **234 mm²**, wholly within the PCB. No coil copper or routing exists. Radio remains F(130,113.25),0°; nominal antenna tip y100.5 is within the outer bounding rectangle. Its south edge is y106.5 and first side-pad north copper is y107.54, leaving 0.79 to the notch floor.

These planar results do not waive the separate RF issue: glass starts at y110, only 3.5 behind the antenna. No compliance with Espressif's recommended 15 mm housing clearance is claimed. Keep the complete display, battery, supports, cables, case and worn-body effects in the RF qualification plan.

## Assembly side and electrical preservation: verified

The board has 186 total footprints, including 170 electrical footprints. **164 non-test-point electrical footprints are on F.Cu; TP201..TP206 are the six electrical footprints on B.Cu.** The six are copper test pads, not rear fitted SMT parts. Counts include DNP candidates and are not a released assembly BOM.

There are four copper layers, 1.6 mm nominal board thickness, and **zero tracks/vias in the board track collection**.

Independent comparison against the preserved main board covered all **562 pads** in the 170 electrical footprints, including **539 numbered pad endpoints**. After removing each footprint's translation/rotation and normalizing rear-side mirroring:

- Pad numbers, net names, local positions, angles and layer sets are unchanged.
- Pad sizes, shapes, drills, offsets, round-rectangle/chamfer settings, pad types, and local mask/paste settings are unchanged.
- Electrical footprint library identifiers, values and schematic source paths are unchanged.
- Electrical model references, offsets, rotations and scales are unchanged.

Thus the side/position changes did not alter the existing electrical land patterns or source associations. This does not supply the nine unresolved electrical footprints.

## Saved mechanical geometry: verified

| Feature | Actual saved result |
|---|---|
| Glass | F(156,137.45); x109.35..202.65, y110..164.9 |
| Display Z | Model uses its existing 1.0 mm underside plus 3.5 mm model offset: **4.5 underside, 5.42 glass-body top** above front PCB |
| Role LEDs | D401..D403 x144/172.5/201, y108.5; 28.5 pitch |
| Affinity LEDs | D404..D408 x108/131.5/155/178.5/202, y174; **23.5 pitch**, symmetric 8 mm endpoint margins |
| USB | J101 F(206.325,126),90°; native mating-edge datum x210, facing right |
| Qwiic | J501 F(206.5,159),90°; mouth x209.075, facing right; electrical tail row x204.5 |
| Buttons | SW401/SW402 F(102.1,145/155),270°; both left-facing, actuator tips x100; 10 mm center pitch |
| Button guide holes | Each switch retains Ø0.8 NPTH holes at x101.2 and x103.0, at its own Y |
| Cord holes | H5/H6 at (104,112)/(206,112), actual Ø3.2 NPTH drills, nominal Ø5.2 textile reservations |
| Frame holes | H1/H2 at (104,117.5)/(206,117.5); H3/H4 at (104,166)/(206,166); actual Ø2.2 NPTH drills |
| Rear battery | B(154,147.5), x136.5..171.5, y120..175 |
| Rear SAO body | B(151.5,114), nominal drawing x145.15..157.85, y110.5..117.5 |
| Front SAO tails | Separate F.CrtYd rectangle x147.5..155.5,y111.5..116.5 on the rear SAO envelope |
| FPC reserve | F rectangle x195..209,y136..154 |
| Optics | U504(185,105.5), D501(195,105.5), U501(205,103), all front and outside the glass |

The SAO is an envelope with no invented electrical pins or holes. Its actual key/contact mapping and 3.2 mm tails remain unmodeled. The nominal tail-to-display clearance is 4.5−(3.2−1.6) = **2.9 mm** before tolerances and solder.

The panel model also contains a 0.03 mm decorative active-area surface at z5.42..5.45. This is a visual model detail, not extra source-qualified glass thickness. Panel F.CrtYd is intentionally absent because electronics sit below it; **planar DRC cannot validate that height relationship**.

## Independent planar collision screening: passed

Native courtyard polygon intersection across **177 front and 9 rear courtyard polygons** found **zero positive-area pair intersections**, including the front SAO tail field, the rear SAO/battery reservations and the smaller NFC area.

Readback of conservative cached courtyard bounds gives these minimum axis separations:

- Qwiic north y155.055 versus FPC south y154.045: **1.01 mm**, improved from the earlier y158 proposal.
- Upper-right frame courtyard south approximately y119.996 versus USB north y120.635: **0.639 mm**.
- Cord courtyard south approximately y114.646 versus upper frame north y115.004: **0.358 mm**.
- Rear SAO south y117.845 versus battery north y118.955: **1.110 mm**.

Native cached polygons include KiCad's polygonization allowance, so these are slightly more conservative than simple graphic centerline/stroke arithmetic. No new planar collision is identified; these small gaps do not authorize larger hardware, arbitrary knots, connector latch motion or unmodeled flex.

Retain **Ø4.5 maximum head/washer/boss hardware**, preferably nonconductive near NFC, and textile-only rear/outward cord routing with no front metal clip. Use the enclosure/frame for a qualified compliant glass support. Actual cord sweep, frame stiffness, screw lengths, PCB strain and pull/drop loading remain open.

## Files and dependency integrity: verified after correction

All **33 distinct referenced model files** resolve using the candidate directory and installed KiCad 10 model root. Existing local footprint files and model files are byte-identical between root and candidate; the four new review footprints carry the changed mechanical reservations. All six staged schematic files are byte-identical to root.

An initial packaging defect was reported: the copied symbol table referenced power/peripheral libraries not present in the stage, and the primary symbol filename had different case. This was corrected during review. Both candidate and preserved fallback now contain correctly named:

- `tinkerbadge.kicad_sym`
- `power_symbols.kicad_sym`
- `peripheral_symbols.kicad_sym`

All three match root bytes. The local footprint table resolves to the existing staged `Tinkerbadge.pretty` directory. Electrical source paths were preserved. Model availability does not certify the generic models' maximum heights.

## DRC and remaining gates

The saved DRC report contains exactly:

- **4 existing USB hole-clearance errors**: 0.1944 actual versus 0.2500 required, involving J101 end GND pads and its locating holes.
- **1 radio silk/edge warning** at the antenna notch.
- **390 unconnected items**, expected for this unrouted placement.
- **9 missing-footprint parity warnings**: J102, J103, J104, L101, U105, J301, L301, AE501, J502.

No new intercomponent clearance, courtyard, keepout, board-outline or copper-edge error appears in that report. It is **not a clean DRC pass**. This reviewer inspected the saved DRC and independently checked geometry; it did not rerun the full DRC engine.

The unresolved complete-assembly gates remain: exact inductors/passives/connectors and maximum installed heights; display support/tolerance/deflection budget; flex contact orientation and 13.8 mm tail fold around the USB shell; FPC/Qwiic insertion/service movement; battery/cable/swelling envelope; SAO mating and solder access; NFC design/tuning and radio performance; optical isolation; manufacturing exceptions; and human placement approval before detailed routing.

See [the dimensioned mechanical assessment](compact_one_sided_mechanical_review.md) for source drawings and the tolerance/RF reasoning. This final review accepts only the saved experimental placement's geometry and preservation checks.


## Fresh export review

The actual pixels in all four PNGs under `exports/pcb-review/compact-one-sided/` were independently inspected after the native checks:

- `front-with-display.png`, SHA256 `4a14873b63f74d967b3907512946ab3b3fa00614d569102684c59c239c2b6099`: glass, exposed role/affinity lights, top optics, right USB/Qwiic, left buttons, and notch agree with the saved placement.
- `front-components.png`, SHA256 `1617e5dd0b81a0140c08ffaca57c534f22d598c7eaea282db949ec41075bbea5`: front-side circuits are visible with no obvious body overlap; reserved unassigned parts are not falsely modeled as finished components.
- `rear-with-battery.png`, SHA256 `d03cf3e8dad83f379e4217562911ddd85675f781c753246c6dbada722a3f7eb8`: battery and rear SAO body are visible, with six accessible test pads above the pack.
- `raised-display-perspective.png`, SHA256 `714b7cf2a1d19af122939dbf19e03eb83d24d180e2f4234e14699d35146674e1`: raised glass and the underlying component space are shown. Supports, flex, cables, SAO tails and enclosure remain absent and cannot be cleared by this image.

No new obvious visual collision was found. The drawings represent the recorded experimental geometry, not a complete assembled-fit model.

Also inspected the fresh saved endpoint/property check reports: both PASS, with 576/576 expected schematic endpoints and no reported issues. The fresh saved ERC contains zero errors and one existing pin-type warning for LIS2DW12 SDO/SA0 tied to the shared supply. These are reports inspected by this reviewer, not separately rerun tests.
