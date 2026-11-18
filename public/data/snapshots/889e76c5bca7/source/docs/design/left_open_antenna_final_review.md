# Left-open antenna shoulder: independent final review

9 November 2026. Native KiCad 10.0.8 read-only inspection of the saved grouped-placement candidate. **The outline change passes the checks below. This remains an unrouted experimental placement, not mechanical, RF or manufacturing approval.** No CAD was saved or modified by this review.

## Pinned inputs

- Candidate: `.build/spread-one-sided/tinkerbadge.kicad_pcb`, SHA256 `2ff74d95a154bce47ce87e97cf86c60af26514ff08235ffc70f8b9189b61ddda`.
- Prior active board: `tinkerbadge.kicad_pcb`, SHA256 `a49a19fdf1a2cea1b223f419887e369ab844f49adc9933a0688ba7f01e2ab7b4`, unchanged during inspection.
- Saved candidate DRC: `.build/spread-one-sided/drc.json`, KiCad 10.0.8, dated 2026-11-09 15:34:18. Compared with `exports/pcb-review/compact-one-sided/drc.json`.
- Read the repository specification, PCB guide, current placement records and the prior compact mechanical/RF reviews. This check does not repeat their manufacturer-source qualification.

## Actual saved outline

The candidate has exactly eleven Edge.Cuts primitives. Native outline construction succeeds with one exterior contour, zero interior profile holes, and bounds x100..210/y100..180 mm: **110 x 80 mm**. The old left stub, x105 notch wall and left internal notch corner are absent. The former sliver is outside the resulting board polygon.

The new boundary runs from (100,176) to (100,110.75), around the R4 outer corner through approximately (101.171573,107.921573) to (104,106.75), then horizontally to (154.5,106.75). The existing R0.5 concave return continues through (154.853553,106.603553) to (155,106.25), then vertically to (155,100). The remaining top, right and bottom boundaries are retained. Native polygonized board area is approximately 8415.051 mm2; about 33.804 mm2 was removed from the prior profile.

## Clearance checks

All six mounting/cord hole centers and drills are unchanged. Independent point-to-boundary calculations on the native outline confirm minimum drill-to-profile ligaments of 2.40 mm for the two diameter-3.2 cord holes and 2.90 mm for all four diameter-2.2 structural holes.

At left cord hole H5=(104,112), the straight left edge remains the closest boundary. Its drill ligament to the new horizontal shoulder is 3.65 mm and to the R4 arc is 2.591 mm. The complete diameter-5.2 courtyard, including its 0.05 mm stroke, remains 1.375 mm from the nearest profile. H1=(104,117.5) has 9.65 mm drill ligament to the shoulder. H5-to-H1 drill separation is 2.80 mm; their two stroked courtyards have **0.400 mm** separation, correcting the older 0.425 mm figure.

Nearest copper-to-shoulder distances are 0.79 mm at U201 pads 1/40, 0.85 mm at D401, 1.74 mm at C202 and 2.80 mm at C201. The project retains its 0.50 mm copper-edge minimum. Native pad-polygon subtraction found no plated/SMD pad copper outside the board; NPTH holes were excluded from that copper test. These are nominal geometric clearances, not tolerance or structural-load guarantees.

## RF and NFC preservation

- U201 remains F(130,113.25),0 degrees. Its full native rule area x106..154/y85.5..106.5 has **zero FR4 overlap**. It retains prohibitions on tracks, vias, pads, other footprints and pours across F.Cu, In1.Cu, In2.Cu and B.Cu. The shoulder remains 0.25 mm beyond the south limit of that rule area.
- NFC remains x182..200/y166..179. Native intersection confirms the entire **234 mm2** reservation is on-board; the same five prohibitions remain on all four copper layers.
- Independently polygonized pad copper has zero intersection with either reservation. Native board readback confirms 186 footprints, 164 front electrical footprints, six rear test points, six named functional groups, four copper layers, and zero tracks, vias or board copper pours.

## DRC and remaining limits

The saved DRC contains the same four USB J101 NPTH-to-pad errors (0.1944 mm against 0.25 mm), one U201 silk-edge warning, 390 unrouted-item reports and nine missing-footprint parity reports. Error/warning types and affected component UUIDs match the prior DRC; the changed Edge.Cuts UUID is expected. There is no reported invalid outline, new copper-edge error or keepout violation. This reviewer inspected and compared the saved DRC rather than rerunning it.

Fabricator acceptance of the R0.5 internal return remains necessary, normally requiring a router tool no larger than diameter 1.0 mm. The outer R4 creates no narrow residual tab. The cord/frame assembly still needs strain, pull/drop, support and tolerance qualification; preserve textile-only outward/rearward cord routing and the maximum diameter-4.5 structural hardware assumption.

The unsupported antenna needs mechanical protection. Removing FR4 does not resolve the display's 3.5 mm planar antenna separation or establish the recommended surrounding RF clearance. Retain complete-assembly RF testing, NFC coil/tuning qualification, raised-display height/deflection checks, flex/contact/insertion validation, unresolved part choices and existing USB fabrication issues. Human placement review remains required before detailed routing.
