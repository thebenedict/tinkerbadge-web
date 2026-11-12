# Even top role LEDs: placement proposal

9 November 2026. Native KiCad 10.0.8 review of an 18-reference placement delta to staged board SHA256 `2ff74d95a154bce47ce87e97cf86c60af26514ff08235ffc70f8b9189b61ddda`. Explicit coordinates, original positions, group membership and checks are in `.build/top_role_placement_proposal.json`. No CAD was saved.

## Recommended positions

All positions are front-side millimetres; rotations use native KiCad conventions.

| Reference | X | Y | Rotation |
|---|---:|---:|---:|
| D401 | 160 | 103 | 180° |
| D402 | 180.5 | 103 | 180° |
| D403 | 201 | 103 | 180° |
| C401 | 157.5 | 103 | 90° |
| C402 | 178 | 103 | 90° |
| C403 | 198.5 | 103 | 90° |
| U504 | 186.5 | 106.5 | 0° |
| D501 | 196.5 | 106.5 | 0° |
| R507 | 188.5 | 102 | 0° |
| C509 | 192 | 103 | 90° |
| C510 | 192 | 106.5 | 270° |
| Q501 | 196.5 | 111.5 | 0° |
| R504 | 196.5 | 115.5 | 0° |
| R505 | 192.5 | 111.5 | 0° |
| R506 | 192.5 | 115 | 0° |
| U501 | 206 | 107.5 | 0° |
| C501 | 202 | 107.5 | 180° |
| C502 | 208 | 105 | 0° |

The role LEDs have 20.5 mm pitch and equal 5 mm center margins from the straight top-edge endpoints x155 and x206. Their common centerline is 3 mm below that edge. This supersedes the earlier role-row positions while preserving the left-open R4 shoulder, lower LED row, grouped circuit spacing and corrected sensor-capacitor allocation.

## Electrical placement choices

At 180°, each role LED has DI northwest, DO southeast and VDD southwest. This matches left-to-right data progression and places VDD beside the left-hand capacitor. Capacitors at 90° put their positive pad south, 1.601 mm from the LED VDD pad center. A horizontal capacitor at the requested 2.5 mm center offset would overlap the LED courtyard by 0.55 mm; the vertical arrangement leaves 0.20 mm between drawn courtyards including strokes.

The IR optical centers move by (+1.5,+1), preserving their 10 mm separation and receiver orientation. Q501/R504/R505/R506 retain their mutual geometry. **R507/C509/C510 are deliberate exceptions to the rigid translation:** the receiver source requires the RC filter as close as possible to VCC and GND. The inherited bulk and bypass supply-pad distances were approximately 7.97 and 6.43 mm. The new positions give 2.764 mm for C509, 2.402 mm for high-frequency bypass C510 and 3.246 mm for R507's filtered output. Route the resulting short filtered-supply connections and adjacent ground vias without a detour around the receiver or emitter driver.

C501 remains assigned to U501 VCC pin 1 and C502 to DVI pin 5. Their positive-pad center distances are 1.916 and 2.504 mm. The horizontal C502 avoids squeezing its lower end toward the cord sweep. Accelerometer C503/C504/C505 allocation is unchanged.

Keep R401's series damping near the MCU source. Route the longer first-LED data connection over a continuous return plane. The unchanged C409 bulk capacitor at (145.5,120) must be tied into the final low-impedance LED supply feed; its presence alone does not verify transient voltage at the relocated row.

## Native geometry checks

- Zero positive-area courtyard collisions involving the 18 moved references against all 177 front courtyards, including mounting holes and review reservations.
- No moved pad copper lies outside the true rounded board outline or intersects the RF/NFC rule areas. The lowest moved copper-to-edge clearance is **0.775 mm at C502**, against the unchanged 0.50 mm rule. Role LED copper has 2.10 mm top-edge clearance; its local capacitors have 1.775 mm.
- U504's native cached courtyard ends at y109.295, leaving **0.705 mm** before nominal glass y110. The drawn courtyard with stroke ends at y109.275. The receiver's source maximum body extent ends at approximately y109.1 before placement/support tolerances.
- U501's drawn courtyard, including stroke, ends at y108.675. H6's diameter-5.2 sweep including stroke begins at y109.375: **0.700 mm separation**. U501 copper is at least **2.428 mm** from the diameter-3.2 drill. U501 also stays laterally outside glass ending at x202.65.
- Receiver and emitter remain outside glass; the emitter's stroked courtyard ends at y108.225. Values and every pad-number/net assignment remain unchanged. The source CAD hash is unchanged.

Native cached courtyard bounds include geometry-conversion allowances. The explicit H6 spacing above uses the actual drawn circle radius plus half its stroke, rather than treating a polygonized circle's bounding box as the exact textile envelope.

## Optical, height and assembly limits

The receiver is 4.0±0.3 mm high. Keeping it outside the glass is necessary: a nominal 4.5 mm cavity would leave only 0.2 mm before solder, warp and support tolerances. Preserve its receiving aperture and field of view. IR emitter height is 1.9±0.2 mm; ambient sensor maximum is 0.75 mm; role LED height is 0.84 mm nominal. Exact passive heights and the assembled enclosure stack still need qualification.

The ambient sensor is only 6.73 mm center-to-center from D403 and 9.55 mm from the IR emitter. Give it a separate optical aperture/baffle and test with RGB and IR on/off through the actual enclosure. The receiver, emitter and role light guides likewise need isolation against internal reflections and saturation. Courtyard separation does not establish optical isolation or room for a particular diffuser. Keep the right cord rearward/outward; the 0.700 mm sweep gap does not admit an arbitrary knot or front metal clip.

Fresh saved-board DRC, independent geometry/parity readback and rendered inspection remain required after applying the proposal. Existing RF/NFC, flex, raised-display tolerance, USB hole-clearance, unresolved-part and prototype gates remain open; obtain human placement review before routing.

## Sources inspected

Read repository specification, PCB/writing guides, current mechanical/RF and footprint reviews, and component records. Actual source pixels inspected: Worldsemi WS2812C-2020-V6 p2 pin/package drawing; Everlight IRM-H638T/TR2 DMO-0000008 Rev3 pp2 and 6 (RC filter and 4.0±0.3 mm package); ROHM BH1730FVC Rev001 p19 (0.75 mm maximum); Everlight IR67-21C/TR8 DIR-0000986 Rev3 p1. Emitter dimensional tolerances are supported by the previously reviewed p2 drawing in `pcb_peripheral_footprint_review.md`. Archived PDFs, hashes and source links remain under `docs/datasheets/` and the matching component records.

## Saved-candidate readback

9 November 2026, after native application. Independently loaded `.build/top-role-one-sided/tinkerbadge.kicad_pcb`, SHA256 `08b5de1ac1b194544ebf15598fd0b40e66a4e0c05123c6da75603a769d91554e` with KiCad 10.0.8.

**Pass:** all 18 saved positions, orientations and front-side assignments match the table and proposal JSON. All other footprint positions/sides and all values/pad-number/net assignments are unchanged from the staged source. The saved role row has exact 20.5 mm pitch, 5 mm center margins to the straight-edge endpoints and 180° LED orientation. Receiver RC-filter refinements and their measured pad-center distances match the proposal.

Repeated native checks against 177 front courtyards found no collisions involving moved references, no moved pad copper outside the board and no moved copper in either antenna reservation. Minimum affected copper-edge clearance remains 0.775 mm at C502; R507 has 1.525 mm. Receiver cached courtyard ends at y109.295, retaining 0.705 mm to nominal glass. U501 retains the 0.700 mm analytical stroked-courtyard gap to the cord sweep and 2.428 mm copper-to-drill clearance.

The complete Edge.Cuts geometry matches the prior left-open candidate: eleven primitives, one closed exterior contour, no interior profile cutouts and 110 x 80 mm bounds. Both radio/NFC rule-area coordinates, all four copper layers and all five prohibitions are unchanged. Radio rule-area/FR4 intersection remains zero; NFC board intersection remains its complete 234 mm2.

Reviewed the saved native DRC dated 2026-11-09 15:48:45 in the same folder. Its component UUIDs and violation types match the prior report: four known J101 hole-clearance errors, one U201 silk-edge warning, 390 unrouted items and nine missing-footprint parity reports. This was a report comparison, not an independent DRC rerun. Rendered pixel inspection is recorded below. Both candidate and main-board hashes remained unchanged during this read-only review.

## Rendered visual review

Inspected the actual pixels of `exports/pcb-review/organized-top-row/front-components.png`, `front-with-display.png` and `raised-display-perspective.png`, derived from the saved `08b5de1a...` candidate.

**Pass for the placement direction.** The three role LEDs read as one evenly spaced row along the surviving upper edge and are fully exposed above the display in the front view. Their repeated left-hand capacitors are consistent. The IR receiver, emitter and ambient sensor remain outside the glass; the local receiver filter occupies the intended nearby space. The cutout reaches the left edge with a rounded shoulder and no obsolete sliver. Both upper cord/frame hole pairs remain visible and separate from the glass.

The bare-board view shows distinct circuit groups with useful space between them, while retaining the unchanged evenly spaced five-LED lower row. The perspective shows the raised panel and exposed side connectors/buttons without a new visible model overlap. The display intentionally hides the low-profile circuitry in the assembled front view.

These renders do not include a qualified support frame, cord, diffuser/baffle system, flex fold or complete cable envelopes. They support the visual arrangement; the previously listed tolerance, optical-isolation, RF, flex and fabrication checks still apply. No CAD changes were made during pixel review.
