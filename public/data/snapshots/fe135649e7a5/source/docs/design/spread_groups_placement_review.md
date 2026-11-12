# Spread functional groups: placement proposal

9 November 2026. Checked with KiCad 10.0.8 against native board SHA256 `a49a19fdf1a2cea1b223f419887e369ab844f49adc9933a0688ba7f01e2ab7b4`. Explicit coordinates are in `.build/spread_groups_proposal.json`. The proposal moves 32 references; no native CAD, schematic, library, model or authoritative placement-plan edits were made.

## Rigid group moves

The original four groups retain every rotation and internal offset.

| Group | References | Translation mm | New IC center mm |
|---|---|---|---|
| Quiet battery ADC | U107, R127–R130, C115, C116 | −32, +2 | 119, 138 |
| Main 3.3 V converter | U103, C107–C109, R117, R118, RES_L101 | −26, +17 | 139, 147 |
| Display load switch | U104, C112–C114, R119 | −7, +9 | 147, 155 |
| I/O expander | U506, C514, C515, R514–R517 | +3, +12 | 149, 136 |

The ADC fits to the left of the fixed battery-connector reservation at (130,138). Converter output bulk C109 ends at (138.7,154.5), near load-switch input C112 at (143.7,154.2). Keep the panel buffer and complete boost network near the FPC. Retain local mux-input C101/C102 and shared output/input C103. Shared I²C pull-ups R501/R502 remain at (155,128)/(158.5,128).

## Correct the sensor capacitor allocation

The earlier placement mistakenly put C502 beside the accelerometer and C504/C505 beside NFC. The reviewed peripheral contract assigns C501/C502 to ambient sensor U501; C503/C504/C505 to accelerometer U502; and C506 to NFC U503. All these capacitors share +3V3/GND, so endpoint parity alone could not detect the placement error.

This proposal corrects only placement and grouping. Component values, nets and land patterns remain unchanged.

| Reference | X mm | Y mm | Front rotation | Placement role |
|---|---:|---:|---:|---|
| U501 | 205 | 103 | 0° | Fixed optical sensor |
| C501 | 201 | 103 | 180° | U501 VCC pin 1 bypass |
| C502 | 208 | 104.5 | 270° | U501 DVI pin 5 bypass |
| U502 | 162 | 133 | 0° | Accelerometer; unchanged axis orientation |
| C503 | 165 | 133.5 | 0° | U502 VDD pin 9 bypass |
| C504 | 165 | 131.5 | 0° | U502 VDDIO pin 10 bypass |
| C505 | 162 | 136.5 | 270° | U502 local 10 µF bulk |

Manufacturer pin drawings were visually checked against native pad locations. U501 pin 1 is on the west side and pin 5 on the east. Both U502 supply pins 9 and 10 are on its east side. The two 100 nF capacitors therefore sit east of U502 with their positive pads pointing toward the supply pins, rather than forcing a bypass connection across the package.

Supply-pad center distances are 1.916 mm for C501→U501.1, 1.779 mm for C502→U501.5, 1.644 mm each for C503→U502.9 and C504→U502.10, and 2.902 mm for C505→U502.9. These are geometric distances, not completed trace/return-loop measurements. Provide ground vias beside capacitor ground pads and short connections to the sensor ground plane.

## Geometry checks

- Native cached front-courtyard polygon intersections: zero positive-area collisions involving any of the 32 moved references against all 177 front courtyards, including holes and reservations.
- Native pad copper polygons for U501/C501/C502 remain entirely inside the board outline. The check uses the actual rounded upper-right edge, not the rectangular overall board bounds.
- Minimum C501/C502 copper-to-edge distance is approximately 1.468 mm, exceeding the current 0.5 mm rule. Native outline polygonization uses a 0.005 mm maximum error.
- Minimum C501/C502 copper-to-H6 Ø3.2 mm drill clearance is approximately 4.904 mm. Clearance to the cord's stroked radius-2.625 mm reservation is approximately 3.879 mm. Native courtyard intersection checks independently include H6.
- All component values and numbered pad-net assignments remain unchanged in the in-memory candidate.
- The accelerometer group occupies x160.705–166.525/y130.725–138.245. The optical sensor stays fixed; its added bypass capacitors occupy x199.475–208.775/y102.225–106.025.

The exposed-front source preview and manufacturer pin-map pixels were inspected. Candidate native DRC, fresh rendered preview inspection, revised-notch checks, and independent before/after endpoint and geometry comparison remain for the applied revision.

## Routing requirements

Provide a wide, low-impedance VSYS feed with continuous return from charger output to C107 and the converter input. Reserve a deliberate corridor around the expander and check DC drop/load transients against the final copper widths and stackup. Do not stretch local bypass loops to accommodate this longer feed.

TPS63802 source §12 requires short, wide input/output-capacitor connections, separate power/control-ground paths joined close to the IC, and feedback routing clear of L1/L2. The rigid move preserves placement relationships, but RES_L101 remains a padless, unqualified inductor reservation. The unchanged display boost has the corresponding L301 selection/loop gate.

Keep BAT_DIV_PRE/BAT_ADC wiring and its return away from both switching networks. Preserve clear I²C and interrupt escapes around the sensor capacitors. The onboard bus starts at 100 kHz; total capacitance and actual routing still need checking.

## Sources and limits

Read AGENTS.md, the specification, PCB guide, current placement/reviews, native footprints and pad nets, and the component/contract records. Source pin images inspected: BH1730FVC PDF p2 top view and LIS2DW12 Rev4 PDF p9 pin diagram/table; the LIS image is explicitly a bottom view, reconciled with the native footprint. Decoupling intent is recorded in the reviewed peripheral contract and component application-circuit records. Relevant power-layout guidance: archived TPS63802 PDF p28 (§12), TMUX1511 layout guidance.

This is an unrouted placement proposal. Existing RF, raised-display tolerance, flex, unresolved footprints, USB NPTH-clearance and prototype gates are unchanged. Human placement review remains required before detailed routing.
