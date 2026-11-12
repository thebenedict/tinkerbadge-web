# Mechanical placement sanity review

Date: 2026-11-09. Status: **identified geometry changes verified; provisional placement only, not routing or mechanical approval**.

## Scope and evidence

The final reviewed native board SHA256 is `322dc5d129db733813ff2d9dc0912e813fc9aa27043376b74c5deea2b9d668fa`. The initial diagnostic board was `tinkerbadge.kicad_pcb`, SHA256 `44d2258df18bc09253ed0a36999fc9f5826cf54e9e1a1a9d1706679fae71433e`. Read-only KiCad 10.0.8 `LoadBoard` inspection found 186 footprints, four copper layers, 1.6 mm board thickness and zero tracks. No `SaveBoard`, CAD edits, project edits or model edits were performed by this reviewer. The board origin is (100,100), with a 110 x 100 mm outline ending at (210,200).

Reviewed inputs: `docs/design/pcb_placement.json`, exact peripheral source drawings and `pcb_peripheral_footprint_review.md`, the radio component/library acceptance records, panel source record, actual footprint geometry and model dimensions, and the native top/bottom PNG renders in `exports/pcb-review/`.

Dimensions below are mm in native board coordinates. Rectangle tests use actual native graphic/pad positions, not only reference origins. They are conservative XY screening, not arbitrary-shape 3D collision or manufacturing certification. The standard footprint courtyard stroke adds approximately 0.025 mm to stated nominal limits.

## Material findings

### M1. Qwiic connector orientation: corrected

**Found at initial hash, resolved at final hash.** J501 is B.Cu at (206.5,165), +90 degrees. Native electrical tail row is x=208.5 and the mating/front body edge is x=203.925. The entry therefore faces left, into the board, despite placement beside the right edge. Native body bounds including Fab stroke are x=203.875..208.225, y=161.95..168.05. This is a bottom-side orientation issue, not a footprint pin-map change.

Evaluate B.Cu 270 degrees for right-facing entry and align the mating front with the board/enclosure opening. Preserve room for the actual plug, cable bend, insertion and latch access. A bare footprint courtyard does not reserve the plugged cable. Recheck changed geometry and adjacent parts before marking this resolved.

### M2. Back-side SAO tail/panel conflict: avoided by relocation

**Found at initial hash, avoided at final hash.** RES_J502 is at (170,128) on the back. Its entire contact pattern lies under the front glass: panel XY x=109.35..202.65, y=123.05..177.95. The exact SFH11-NBPC-D03-ST-BK manufacturer drawing specifies 3.2 mm straight tails. A flush-mounted socket on this 1.6 mm PCB would leave approximately 1.6 mm tail protrusion on the front before solder allowance.

The provisional panel model puts its underside only 1.0 mm above the front surface. This implies about **0.6 mm nominal intrusion** into the proposed glass clearance, even without manufacturing tolerance or solder fillets. The current SAO envelope model represents the body/key only and omits tails, so a body-only 3D render will not reveal this issue.

Keep J502 unassigned. Move its eventual through-hole pattern outside the panel XY envelope, establish a source-qualified larger support gap, or revise the mechanical/interface plan. The previously unresolved housing-key/contact relationship is a separate release gate and remains open.

### M3. Envelope visibility: corrected previews inspected

The first top/bottom renders, the 12:22 replacement renders, the 12:23 `placement-*-envelope-3d.png` files, and the 12:24 `placement-front-with-envelopes.png` were visually inspected. They show the native board but omit the panel, battery and SAO envelope bodies. Some derivative settings also omit custom small-part models. This initial rendering defect was subsequently corrected on an isolated visualization derivative; no approval is inferred from changing visibility settings.

The corrected12:29 `placement-front-with-envelopes.png` and `placement-rear-with-envelopes.png` were visually inspected. Panel, battery and relocated SAO body are now visible. Both adjacent left-edge buttons and the outward-facing Qwiic connector agree with the final native board. No new obvious body overlap appears in these two orthogonal views. The earlier images without envelopes should not be used as assembled-fit evidence.

A successful exporter exit alone is not proof of fit. A side/oblique view is still needed for panel stand-off, battery thickness, receiver/socket height and actual support geometry. Current models omit SAO tails, flexible cables, fasteners, adhesive and enclosure. Nominal models must stay labeled as nominal, not vendor-certified CAD.

## Checks that passed at the initial hash

### Panel/body XY reservation

- Panel nominal glass bounds: x=109.35..202.65, y=123.05..177.95. Courtyard is x=109.05..202.95, y=122.75..178.25 before line thickness.
- No front electrical component courtyard intersects the glass XY rectangle. This includes the status LED, top optical components, RGB rows and both side buttons.
- Main board margin to glass is 9.35 left, 7.35 right, 23.05 top and 22.05 bottom. These are board/glass margins, not enclosure-wall or glass-support approval.
- Radio body ends at y=119.5 nominal, giving 3.55 mm to the glass north edge. Its extended antenna courtyard is a separate shape and must not be treated as its physical body.
- Proposed panel z underside=1.00, top=1.92 mm above front. No panel retention, allowed adhesive region, shock isolation, flex fold or clamping geometry has been qualified.

### Bottom battery reservation

- Battery is only an allowance, not a selected pack: 35 x 55 x 7 at (154,163.5), B.Cu. Nominal XY x=136.5..171.5, y=136..191; courtyard reserve x=135.5..172.5, y=135..192.
- No other back-side electrical component or reserved connector courtyard intersects the battery body rectangle in the initial native geometry.
- Six recovery/test points at y=133 lie north of the pack allowance rather than under it. Exact pogo/probe insertion geometry still needs the pack/case installed.
- Battery connector reserve RES_J102 at (130,138) is west of the pack, with nominal drawing x=126..134 and y=135..141. The approximate 2.5 mm planar gap to the pack is not a qualified cable-bend/strain-relief path.
- No pack cable, welded tabs, protection-board overhang, swelling allowance, insulation sheet, retention strap or enclosure loading is included. Never compress a pouch cell to make this envelope fit.

### Buttons and USB access

- At the final hash, both buttons are adjacent on the left edge as requested: SW401 at (102.1,161) and SW402 at (102.1,171), both F.Cu 270 degrees. Both actuators point left and reach x=100.0.
- Actuator centers are 10 mm apart. Each switch has two native guide holes at x=101.2 and103.0, diameter0.8, at its own y coordinate. Nearest back copper-to-hole bounding-box gaps are6.435 mm for SW401 and5.25 mm for SW402. No back-side interference was found.
- Both actuator faces are approximately flush with the PCB outline. An enclosure still needs qualified access openings or plungers; a thick side wall would otherwise block finger actuation.
- Switch source-derived guide holes, source terminal pairing and pad orientation were already independently verified. Rotation preserves these mappings.
- J101 USB at (103.675,130), F.Cu 270 degrees, has its mating face approximately x=100 and points outward left. Reserve the cable overmold and enclosure cutout. Its footprint courtyard intentionally extends outside the board.

### Optical orientation and exposure

- U501 ambient sensor (205,112), U504 IR receiver (185,110), and D501 IR emitter (195,110) are front-facing and north of the panel. No glass XY occlusion was found.
- RGB LEDs at y=114 and y=190, and the left power-status LED near (104,143), remain outside the glass rectangle.
- D501-to-U504 center spacing is 10 mm. D501-to-U501 spacing is approximately 10.2 mm. A clear enclosure does not establish optical isolation: internal reflections can saturate the receiver or bias the ambient-light result. Separate optical windows/baffles and firmware measurement/transmit timing need validation.
- Receiver height is 4.0 +/-0.3 mm above the board, considerably taller than the proposed 1.92 mm panel stack. The front cover must clear the receiver and preserve its field of view. IR emitter height is 1.9 +/-0.2 mm, ambient sensor 0.75 mm maximum.

### Radio and NFC reservations

- Native radio keepout is x=94..142, y=79..100 across F.Cu, In1.Cu, In2.Cu and B.Cu. It prohibits tracks, vias, pads, copper pours and other footprints. No other footprint's courtyard/body intersects this rectangle.
- The module antenna overhangs the main PCB by about 6 mm: module nominal north edge y=94 versus board edge y=100. This is intentional RF placement, but the enclosure must protect the overhang without metal or lossy obstruction. Final overall assembly is taller than the 100 mm PCB.
- Native NFC reserve is x=176..206, y=181..198 across all four copper layers, with the same copper/component prohibitions. No other component/reserve courtyard or battery/glass XY rectangle intersects it. No coil copper exists yet.
- Nominal NFC-to-battery lateral gap is 4.5 mm; NFC-to-glass vertical gap is 3.05 mm; NFC-to-bottom PCB edge is 2 mm. These are recorded spacing facts, **not RF acceptance criteria**. Tune and validate with actual display, pack, enclosure and hardware.
- H4 at (206,177.5), drill2.2, lies 3.5 mm north of the NFC reserve boundary. A hypothetical 6 mm diameter metal head would leave only 0.5 mm to it. Hardware material and extent remain unqualified; the drilled hole alone does not capture nearby metal.

## Open mechanical/interface gates

- All nine blocked electrical references remain provisional: U105, J102, J103, J104, L101, J301, L301, AE501 and J502. Their drawing reserves are not approved mating definitions or footprints.
- Panel flex reserve RES_J301 is back-side x=195..209, y=140..158. It is not proof that the actual flex length, contact face, bend radius, fold direction or insertion direction can reach the chosen connector. The panel is intended to be oriented with flex to the right; a symmetric glass rectangle cannot verify that orientation.
- Right mounting holes H2=(206,121) and H4=(206,177.5) are only 3.35 mm laterally from the glass edge. A 6 mm head would leave 0.35 mm before tolerances. Choose actual fastener/standoff/washer envelopes and confirm glass safety. Left-side holes have more glass clearance.
- Rear SAO socket body alone is 8.5 mm high, exceeding the 7 mm battery allowance. A case sized only around the battery will not clear that connector. With 4.3 mm front receiver height, 1.6 mm PCB and 8.5 mm rear socket, the unpadded electronics stack can reach about 14.4 mm before case walls and clearances.
- Dock reserve near (124,193) does not establish insertion direction, pogo compression, polarity-safe guide, seating load path or clearance from plugged cables. No dock contacts are routed or approved.
- Lanyard holes have no modeled hardware/strap sweep. Do not permit metal clips to enter the radio no-metal region.
- Existing `drc-placement.json` contains four 0.1944 mm USB pad-to-NPTH clearance errors against a configured0.25 mm rule, plus two intentional radio-overhang silk warnings. These are not new body collisions, but must not be described as a clean DRC pass. Unconnected pads are expected on this unrouted proposal.

## Final-hash changed-placement recheck

Final board SHA256: `322dc5d129db733813ff2d9dc0912e813fc9aa27043376b74c5deea2b9d668fa`.

- **J501 corrected:** B.Cu (206.5,165),270 degrees. Electrical tail row now x=204.5; mating face x=209.075, facing outward right. The face is recessed0.925 mm from the board edge. Maximum mounting-pad copper x=209.275 gives0.725 mm copper-to-edge separation. Native body including Fab stroke is x=204.775..209.125, y=161.95..168.05. Allow the actual plug and case opening to bridge the recess without obstruction.
- **SAO moved:** RES_J502 now B.Cu(151.5,116), away from the glass. Provisional pad-center candidates x=148.96/151.5/154.04, y=114.73/117.27. With hypothetical1.70 mm pad envelopes, nearest front copper is C401 pad1 at0.635 mm edge clearance. Rear reserved courtyard has0.345 mm gap to R502,0.445 mm to C502 and1.425 mm to U506. The previous panel-tail interference is avoided by XY separation. Actual socket key orientation, pad shape, drill, lead/tail tolerances and add-on envelope remain unapproved. Key extension is asymmetric relative to the contact pattern and must be drawn explicitly when that mapping is settled.
- **Both buttons left:** SW401F(102.1,161),270 degrees; SW402F(102.1,171),270 degrees. Native actuator directions and both guide-hole locations read back correctly; no back-side pad or body conflict was found.
- **DRC remains provisional:** four existing USB hole-clearance errors and two antenna-overhang silk warnings remain. No newly reported overlap/keepout/intercomponent-clearance errors were introduced by these moves. No routing was performed.

## Decision

The two material placement mistakes identified here have been corrected or avoided in the final pinned layout. Panel, battery, radio and NFC primary XY reservations remain useful and clear. This is a **conditional placement proposal**, not mechanical or routing approval: exact interfaces, connector mating, flex, battery, optics, RF tuning, fasteners and enclosure still require their stated gates. Corrected front/back assembly previews have been inspected and match this conditional proposal. They do not certify the unmodeled side/height, cable, support and fastener requirements. Any further material change requires a fresh pinned-hash review.

## Final preview evidence

- `exports/pcb-review/placement-front-with-envelopes.png`: SHA256 `6e2732bd32ce5190b3c9237eb9273d32aa697066442292d94e219c302ba2c3ef`. Actual image inspected with panel/battery/SAO visibility confirmed.
- `exports/pcb-review/placement-rear-with-envelopes.png`: SHA256 `7df663f942d886fce3e96c849075719165d6f364d824b20510e41dcb8d580baa`. Actual image inspected with panel/battery/SAO visibility confirmed.

The supplementary `placement-review-map.svg.png` inspected at this stage is cropped at its right edge, cutting off the rear-column illustration. Regenerate it at the full SVG canvas dimensions or use the complete SVG. This is a presentation issue, not a native placement change.
