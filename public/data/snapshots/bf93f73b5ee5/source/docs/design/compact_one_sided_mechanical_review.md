# Compact one-sided mechanical review

9 November 2026. Independent, read-only assessment of a 110 × 80 mm front-SMT placement trial. Native inspection used KiCad 10.0.8 and baseline board SHA256 `99158950ecce21da92f8c0e9343ecf60316f321255fd496f790517ac7717f49f`. No board, project, footprint, model or schematic was written; no SaveBoard or routing was performed. Coordinates are millimetres in the existing board datum, with the proposed outer rectangle x100..210, y100..180.

## Decision

**An 80 mm PCB is a plausible placement trial, not a mechanically or RF-qualified assembly.** Raising the display makes the known low-profile electronics fit in principle. The limiting items are the antenna-to-display separation, actual display-flex fold, unresolved inductor/connector heights, and the compressed battery/SAO and NFC regions.

Keep 80 mm as the preferred trial and 90 mm as a fallback. Increasing height gives useful placement and flex/optical margin, but does not by itself qualify RF performance or the unselected interfaces.

## Corrections required before accepting the proposed trial

| Item | Finding | Recommendation |
|---|---|---|
| Role LED at (144,108) | Native north copper y107.10 is only 0.35 from the notch floor y106.75, below the configured 0.50 copper-to-edge rule. | All three role LEDs at y108.5. D401 then has 0.85 nominal copper-to-notch clearance. |
| Cord and upper frame holes | Ø5.2 cord reservation at y112 and the existing M2 courtyard at y117 overlap by 0.075 including strokes. Ø4.5 actual hardware has only 0.15 nominal separation from the cord reservation. | Upper frame holes at y117.5, giving 0.425 courtyard separation. Require outward/rearward textile routing and no front metal clip. |
| SAO at B(151.5,116) | Its review body ends y119.5, only 0.5 before the battery body at y120. SAO and battery courtyards overlap about 0.85. The asymmetric socket key remains unresolved. | Move SAO to B(151.5,114). Nominal body gap becomes 2.5 and courtyard gap about 1.15. Reserve the front tails separately. |
| Display above antenna | Glass y110 begins only 3.5 behind the antenna's south edge y106.5. A 4.5 display lift does not create the manufacturer's recommended 15 mm housing clearance in every direction. | Do not equate a clear native planar keepout with RF compliance. Obtain RF review and test the complete display/battery/enclosure assembly. |
| USB height | The drawing's 3.31 is not a maximum: general X.XX tolerance is ±0.15. | Use 3.46 source-envelope maximum before installation allowance, rather than 3.31 maximum. |

## Dimensioned front-side recommendation

| Item | Proposed position or extent | Mechanical result/restriction |
|---|---|---|
| Display glass | Center (156,137.45), x109.35..202.65, y110..164.9; underside nominal 4.5 above front PCB | Source glass 93.30±0.20 ×54.90±0.20; drawing maximum thickness with protective film 0.92. Nominal top elevation 5.42. Support/tolerance qualification remains required. |
| U201 | F(130,113.25), 0° | Body x121..139, y100.5..126. Antenna y100.5..106.5. Shield/body under glass for 16 mm in Y; never use the shield as a glass support. |
| Antenna notch | Top-open x105..155 to y106.75, inside radii ≤0.5 | Must be part of one closed Edge.Cuts outline. Preserve the full all-layer keepout x106..154, y85.5..106.5 and remove all FR4 within the intended cutout. First side-pad north copper y107.54 gives 0.79 to the floor. |
| Role LEDs | (144,108.5), (172.5,108.5), (201,108.5) | Native courtyard south edge including stroke y109.775 leaves only 0.225 before nominal glass. Light-guide/baffle and panel XY tolerances need explicit treatment; a naked XY gap is not an optical margin. |
| Role capacitors | C401(146.5,111.5), C402(175,111.5), C403(201,112) | May be beneath raised glass after exact passive heights are selected. Keep them clear of actual SAO pad/tail geometry. |
| Affinity LEDs | x108/131.5/155/178.5/202, all y174 | 23.5 pitch, symmetric 8 mm endpoint margins; native lower copper y174.9 leaves 5.1 to the bottom edge. Diffusers and LED wiring must avoid the NFC reservation. |
| IR receiver U504 | F(185,105.5), 0° | Native courtyard x180.825..189.175, y102.725..108.275 including stroke: 1.725 before glass. Keep it outside glass. Its 4.3 maximum body height leaves only 0.2 under a nominal 4.5 cavity, before solder/warp/tolerances, and the opaque panel would block its view. |
| IR emitter D501 | F(195,105.5), 0° | Courtyard x192.475..197.525, y103.775..107.225; source height 1.9±0.2. Preserve a dedicated optical window and baffle. |
| Ambient sensor U501 | F(205,103), 0° | Courtyard x203.075..206.925, y101.825..104.175; source maximum height 0.75. Local capacitor at (205,106.5) clears the proposed cord hole. |
| USB J101 | F(206.325,126), 90° | Existing native mating-edge datum becomes x210, facing right. Courtyard x201.54..210.53, y120.655..131.345 including stroke. Check actual cable overmold and the display-flex fold, not only the receptacle. |
| Qwiic J501 | F(206.5,158), 90° | Right-facing mouth x209.075, recessed 0.925 from PCB edge; body x204.825..209.075, y155..161 nominal. Tail row x204.5. Source height 2.9; plug and finger access remain separate. |
| Buttons | F(102.1,145/155), 270° | Actuators reach x100 and face left. Preserve 10 mm center spacing and both Ø0.8 guide holes at x101.2/103.0. Left sidewall/plungers must not preload or overtravel switches. |
| Status LED | F(104,122) | Outside glass; keep a separate visible aperture. Check adjacent relocated power components in the final placement. |

The top optical components are geometrically feasible. Their windows must isolate ambient sensing from role LEDs and IR from internal reflections. IR emitter/receiver remain 10 mm apart. No clear-plastic enclosure automatically provides optical isolation.

### Mounting and lanyard holes

Use the following candidate set:

- H5/H6 textile-only Ø3.2 NPTH cord holes at (104,112) and (206,112), with explicit Ø5.2 swept/placement reservations. Both have 2.4 mm nominal side-edge drill ligament. The left hole is below the antenna notch, not in the removed material.
- Four structural Ø2.2 NPTH frame holes at (104,117.5), (206,117.5), (104,166), (206,166). Limit actual head, washer and boss diameters to **4.5 mm**; do not assume 6 mm hardware.
- The native M2 footprint courtyard is Ø4.90 plus its 0.05 stroke. Upper-right courtyard ends y119.975, leaving 0.68 before the USB courtyard. The right hardware's left edge x203.75 leaves 1.10 from nominal glass.
- At y166, right hardware x203.75..208.25 is only 3.75 laterally from the NFC reserve. Prefer nonconductive hardware there and include the final supports in RF tuning/testing.
- Use a rigid frame plus source-approved compliant display support. The hole positions are attachment datums, not permission to clamp the glass or place pads on weak corners. Qualify board strain and lanyard pull/drop loading.
- Keep the cord loop rearward/outward along the side, away from display faces and optical windows. A Ø5.2 reservation does not accommodate arbitrary knots, swivels, metal clips or straps. The final cord and attachment assembly must be measured.

## Rear battery and optional SAO

Battery remains an allowance, not a selected protected pack: B center (154,147.5), nominal x136.5..171.5, y120..175, 35×55×7. It leaves 5 mm to the PCB bottom. Actual cell tabs, protection board, cable bend, retention, insulation and swelling clearance remain unspecified. Do not compress the cell to meet this allowance.

Prefer SAO B(151.5,114) rather than y116. Retain a front no-component tail field x147.5..155.5, y111.5..116.5 pending the actual footprint. The source 3.2 mm tails nominally protrude 1.6 beyond a 1.6 mm board, leaving **2.9 nominal** to a 4.5 display underside, not 3.0. Include tail tolerance, board-thickness tolerance, seating and solder in final clearance. The connector drawing's 3.2 mm tail and 8.5 mm body dimensions carry its general tolerances; source contact/key orientation and actual solder access remain unresolved.

The rear socket can be installed after front SMT, before attaching glass and battery. This retains one-sided SMT but still requires a secondary through-hole operation. Preserve front soldering/rework access before the panel is installed. The 8.5 mm nominal rear socket is taller than the 7 mm battery allowance; total bare stack is approximately 15.5 mm using nominal support and socket height, before case walls, support tolerances and clearances.

## Height budget and supports

For the radio, 4.5 minus 3.25 leaves 1.25 to allocate among solder standoff, PCB/glass warp, support variation, insulation and clearance. This is plausible, not a completed tolerance stack. The USB source envelope leaves 1.04 before installation allowance if it overlaps the glass edge. The receiver's 0.2 nominal margin is inadequate.

Known TSSOP, SOT-23, QFN and small diode packages are well below 4.5: reviewed examples include TSSOP 1.2 maximum, TI DBV SOT-23-6 1.45 maximum, AO3400A 1.25 maximum and SMF6.0A 1.10 maximum. Nevertheless **all parts are not yet height-qualified**: generic passive MPNs, L101/L301, battery connector, FPC interface and other blocked references are unresolved. Require a maximum assembled-height table tied to exact MPNs. A footprint's XY size or a generic 3D model cannot establish its maximum height.

Set a positive residual non-contact gap after the full worst-case tolerance stack, then validate handling/shock deflection. Glass support may not bear on components, the radio can or flex. Do not select an arbitrary inductor only to fit the model.

## Flex and connector conflict that remains open

The panel source drawing shows a **13.80±0.30 mm projecting flex**, with its broad root beginning **15.55±0.30 mm** from one edge of the 54.9 mm glass dimension. In the proposed right-flex orientation, the root is approximately in the y125..150 band and the contacts near y137.45. The exact mirrored view/fold must still be proven.

The proposed FPC reserve x195..209,y136..154 is therefore only a trial envelope. It does not cover the entire broad root, establish its descent from z4.5, or prove that the 13.8 mm tail can reach the connector without a sharp bend. The USB body near y126 shares part of that root's XY projection. They may coexist at different heights, but the descending fold must not cross the shell or cable. USB y130 increases overlap with the center of the flex and is less attractive without a confirmed alternative fold.

Qwiic at y158 begins its courtyard at y154.075, only about 0.05 beyond the FPC reservation's stroked south edge. That is insufficient to claim latch/insertion/service clearance; move or reshape the actual FPC route and reserve its operating motion before routing.

## 80 versus 90 mm

At 80 mm, glass consumes 54.9 mm of height, leaving 10 mm above and 15.1 below. The proposed 18×13 NFC area x182..200,y166..179 begins only 1.1 below glass and ends 1 mm above the PCB edge. It lies between the last two affinity LEDs, but its small size, nearby metal/LED copper and clearance require the separate RF review.

A 90 mm board adds 1,100 mm² and 10 mm of vertical room. Keeping the glass at y110 provides more room below it but does **not** improve radio-to-glass separation. Moving glass to y121.5..176.4 restores a nominal 15 mm planar gap behind the antenna and leaves 13.6 mm to a y190 board edge. This still does not automatically restore an 18×17 NFC region plus display/edge margins. A taller fallback, relocated/flex NFC antenna or another source-qualified arrangement may be needed if assembled RF performance is inadequate.

## Evidence and remaining verification

Read: repository specification, PCB guide, component and prior mechanical reviews, native footprints/pads/courtyards/board thickness and project edge/hole clearances. Visually inspected source drawings: panel p5, IR receiver p6, JST side-entry p2, USB p1, and Sullins drawing11160 RevJ. Sources are archived under `docs/datasheets/` with the existing source/inventory records.

Primary sources: [panel drawing](https://files.waveshare.com/upload/7/71/3.7inch_e-Paper_Specification.pdf), [Espressif module](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf), [Espressif hardware guidelines](https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32s3/esp-hardware-design-guidelines-en-master-esp32s3.pdf), [IR receiver](https://www.everlighteurope.com/custom/files/datasheets/DMO-0000008.pdf), [JST SH](https://www.jst-mfg.com/product/pdf/eng/eSH.pdf), [USB drawing mirror](https://s3.amazonaws.com/snapeda/datasheet/USB4105-GF-A_GCT.pdf), [Sullins](https://drawings-pdf.s3.amazonaws.com/11160.pdf).

Performed: read-only native extraction, source-drawing inspection and explicit coordinate/height arithmetic. Pending: final placed-board readback/DRC, full exact-MPN height audit, flex/contact continuity, real support/enclosure and cable models, manufacturing tolerances, optical testing, RF tuning, pull/drop tests and human placement approval. Existing USB pad-to-NPTH clearance errors are not resolved by this review. No production or routing approval is implied.
