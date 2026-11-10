# Organized one-sided PCB placement review

10 November 2026. **Experimental placement for human review. Unrouted; not a manufacturing release or an RF-compliance claim.**

The active board is 110 × 80 mm, SHA256 `ddf824f2a59bc82568bbb03bcb3f89959f2ee12638b380790207739273c1844d`. The previous 110 × 100 mm, two-sided placement and its libraries/models are preserved under `history/2026-11-09-100mm-two-sided-fallback/`. The first 80 mm placement is preserved under `history/2026-11-09-80mm-before-group-spacing/`; the intermediate group-spacing revision is under `history/2026-11-09-organized-before-top-row/`.

## Changes made

- All 164 non-test electrical footprints are now on the front. This includes the two tuning footprints whose custom population fields say DNP. Six bare copper test points remain on the rear. The nine unassigned electrical footprints below are still absent.
- The display glass stays 93.3 × 54.9 × 0.92 mm. Its proposed underside is now 4.5 mm above the front PCB surface, allowing the known low-profile circuitry underneath. The glass occupies x 109.35..202.65, y 110..164.9 mm. The exact support frame, tolerances, flex and unresolved part heights remain unqualified.
- USB J101 is at F(206.325,126),90°, with its mating face at the right PCB edge x 210. The Qwiic connector is also front/right, at F(206.5,159),90°.
- Both side-actuated buttons remain together on the left, now at y 145 and 155, 10 mm apart, pointing outward.
- The five affinity LEDs are at x 108,131.5,155,178.5,202, all y 174. Pitch is 23.5 mm, with 8 mm end margins. The leftmost LED retains its horizontal position; the row moved upward to fit the shorter board.
- The three role LEDs are now at x 160,180.5,201, all y 103, evenly spaced at 20.5 mm pitch along the remaining straight top edge (x 155..206). Their centers have 5 mm end margins. Each LED is rotated 180° and its local bypass capacitor sits 2.5 mm west at 90°. This follows the latest request to reposition all three top LEDs.
- U201 remains at F(130,113.25). Its antenna lies inside the board's overall rectangle, x 121..139/y 100.5..106.5. The antenna opening now extends fully to the left edge, removing the narrow sliver. A 4 mm outer shoulder radius meets the edge at y 110.75 and joins the horizontal shoulder at y 106.75; the right internal radius remains 0.5 mm. Native copper-to-shoulder clearance at the first module pads is 0.79 mm.
- The NFC reservation shrinks from 30 × 17 to 18 × 13 mm, at x 182..200/y 166..179, between the last two affinity LEDs. It is an all-four-layer no-metal rule area, not a completed antenna.
- C101/C102 are allocated as local TPS2121 input bypass, with unchanged values and nets. Their positive pads are 1.876/2.027 mm from the respective mux inputs. D101/D102 and the USB ESD reservation stay at the ports.

## Organized functional groups and optical relocation

This pass moves 48 distinct references from the first 80 mm placement, preserving all footprint records apart from their placement transforms. Eight native editor groups keep each IC and its support parts together. ADC sensing now occupies the left-center, the 3.3 V converter the lower-center, the I/O expander the center, and display support spans the lower-right. Open space between groups is reserved for routing rather than filled uniformly.

The sensor support allocation was corrected physically: C501/C502 belong with ambient-light sensor U501; C503/C504/C505 belong with accelerometer U502. Their nets and values were already correct and remain unchanged. C101/C102 stay close to the power-mux inputs.

The latest pass consolidates the passive optical sensors below the display. Ambient sensor U501 is now at (143.5,170.5),90°, beside IR receiver U504 at (137.75,168.5),180°. C501 and C502 remain local to the two ALS power pins. IR emitter D501 stays at (150,168.5),0°; only R504 moves slightly right, to (150.75,172),180°, to leave room for a separate transmitter optical compartment. No LED, receiver, emitter, other circuit, outline or keepout moved in this four-part revision.

The ALS and IR receiver can share one visible-and-940 nm-transmitting window. The transmitter needs a separate optical segment, and the sensor cavity must be isolated from the affinity-LED diffuser. A common exterior bezel is possible; a continuous transparent emitter-to-detector window can conduct stray light despite a divider underneath. No enclosure, optical divider or copper keepout was added to the PCB. The native geometry leaves a proposed 0.5 mm-wide divider corridor at x146.6..147.1/y165.25..175.75 clear of front courtyards and copper pads.

The glass ends at y164.9. ALS courtyard clearance is 3.655 mm; receiver/emitter clearances remain 0.805/1.855 mm. C502's courtyard overlaps the glass projection by 0.175 mm, but it is a low electrical support part, not an optical opening; its actual height and glass/support tolerances remain to qualify. ALS point-ray clearance past the glass improves from roughly 20.5° to 50.2° using a 0.75 mm optical-height example. That height is a package maximum, not a guaranteed detector plane. The emitter still has display-side shadow near 45.6°, and a separating wall further narrows its inward view. Final angular coverage depends on the cover and barriers.

The lower ALS is 12.02 mm from D406 and 12.50 mm from D405, closer to visible emitters than its former 15.89 mm separation from D401. This move improves enclosure grouping and display-side access, not self-light rejection by distance. Use characterized visible/IR-transmitting cover material, barriers opaque at both visible wavelengths and 940 nm, local IR-off intervals throughout ALS integration, and assembled RGB-on/off calibration. Roughly ±30° is an initial aperture-design target, not a guaranteed field of view. Shorter integration trades sensitivity and 50/60 Hz rejection for less disruptive LED blanking if testing shows blanking is needed.

The local electrical geometry remains practical: C501/C502 positive pads are 2.159/2.100 mm from their ALS supply pins; R504-to-emitter anode is 3.747 mm. Receiver filtering remains unchanged, with C509/C510 2.90/3.11 mm from VCC. Use independent local ground vias into a continuous reference plane rather than sharing LED or transmitter return paths. I2C and IR signals need ordinary board-scale routing with ground continuity and switching-node avoidance. No routing or detailed escape trial has been performed.

C509's front courtyard projects slightly across the unresolved rear dock reservation, but its copper and nominal body remain outside the nominal dock drawing. This is not a same-side collision. The exact dock contact, through-board tails, seating motion and insulation remain unqualified, so the revision does not claim a completed dock fit.

The charger-to-converter VSYS feed is longer in this arrangement. Route it with deliberately wide, low-impedance copper and a continuous return, preserving a clear corridor around the I/O group. Local converter capacitors/feedback and the L101 reservation retain their compact relationship; no completed switching loop is implied while L101 remains unresolved.

## Single-sided assembly assessment

A single front-side SMT assembly pass is plausible and is the intent of this placement. This is not a claim that the complete badge needs no other assembly operation: the battery/display are fitted afterward, USB shell anchors need an approved soldering process, and the optional rear through-hole SAO socket would need secondary assembly. Exact assembler cost and stencil/reflow capability have not been quoted.

The display lift has credible nominal headroom above known parts: 1.25 mm above the ESP32 module's 3.25 mm maximum envelope, and 1.04 mm above the USB drawing's 3.46 mm maximum before solder/installation allowance. These are not finished worst-case stacks. The 4.3 mm IR receiver stays outside the glass rather than relying on only 0.2 mm nominal space.

The panel review footprint deliberately has no same-plane front courtyard because electronics occupy the space beneath the raised glass. This is replaced by an explicit Z-height/support qualification requirement, not a claim that planar DRC verifies the stack. All assembly must be inspectable and reworkable before attaching the panel.

The battery is still only a 35 × 55 × 7 mm rear allowance, not a selected pack. Its center is B(154,147.5). The provisional SAO body is above it at B(151.5,114), with a separate 8 × 5 mm front tail reservation. The model does not draw the individual tails or certify pin/key orientation.

Four structural Ø2.2 mm NPTH holes use a maximum Ø4.5 mm head/boss assumption. Two Ø3.2 mm cord holes have Ø5.2 mm textile sweep reservations. At the left shoulder, the cord drill retains 2.4 mm of edge ligament and its complete stroked courtyard stays 0.400 mm from the frame-hole courtyard. Cords must route outward/rearward. Metal clips, screws, battery tabs and final enclosure supports require separate mechanical/RF assessment.

## Important tradeoffs at 80 mm

**Radio:** The native antenna keepout has zero overlap with FR4 and is clear of placed copper/components. However, the glass begins only 3.5 mm behind the antenna's south edge. Lifting it 4.5 mm does not satisfy Espressif's recommended 15 mm surrounding housing clearance. The assembled glass, battery, case, mounting hardware and cords must be included in RF evaluation. This 80 mm version is an explicit experimental candidate, not manufacturer-guidance-compliant packaging.

**NFC:** The new 234 mm² reservation is 54% smaller than the previous 510 mm² area. A coarse analytical coil estimate makes this worth exploring, but neither inductance, coupling nor phone read range is qualified. There is no antenna copper yet. Final coil/tuning may require a larger board, changed LED/metal spacing or a separate flex antenna.

**Selected NFC layer:** The user chose an integral rear-copper PCB antenna with the front area kept clear on 10 November. The eventual coil will be on B.Cu, with U503 and tuning components remaining front-side, so this does not add a rear SMT pass. Front and inner-layer clearance, battery/display separation and assembled tuning remain necessary. No antenna copper exists yet. Retain the current all-layer reservation until reviewed antenna-specific rules permit the intended coil/feed while excluding unrelated copper. Nonconductive front artwork can use the reserved visual patch. See `rear_nfc_feasibility.md`.

**Display flex:** The 14 × 18 mm FPC area is a placeholder. The real 13.8±0.3 mm projecting flex and broad root may share the USB region in XY. Its descending fold, contact side, insertion/latch sweep and strain relief have not been proven. The final Qwiic-to-FPC courtyard gap is about 1.01 mm, which is not a complete service-motion allowance.

**Taller fallback:** 90 mm adds useful room but does not automatically solve both RF and NFC. Moving the glass down to y 121.5 restores 15 mm planar separation behind the antenna but leaves only 13.6 mm below it on a 90 mm board, insufficient for the 18 × 17 mm NFC alternative plus margins. A 100 mm version offers more credible room to pursue both. The preserved 100 mm board is a prior two-sided placement, not a newly qualified one-sided/RF solution.

## Checks performed on this revision

Native KiCad 10.0.8:

- 186 total footprints:170 schematic-linked electrical,10 padless review reservations and 6 holes.
- 539 numbered physical pad primitives,524 distinct logical endpoints. Independent inverse-transform comparison confirms every electrical pad's number/net, local position/orientation, size, drill, shape, layers and mask/paste settings are unchanged.
- 164 electrical footprints front,6 test pads rear. Zero tracks, vias or copper pours.
- Single closed 110 × 80 mm Edge.Cuts outline, with 11 primitives and the true left-open antenna shoulder. Its 0.5 mm internal radius requires a suitable fabrication tool or approved process.
- Exact complete inverse-transform comparison passes for all 186 footprints against the previous checked board. Exactly the four intended ALS/support poses changed; board-level content and all eight native groups remain unchanged. The earlier organized-group/top-row passes retain their separate pinned reviews.
- Footprint-owned radio and NFC keepouts preserved on all four copper layers. NFC reserve is fully on-board at 234 mm².
- No positive-area courtyard collisions, inter-component copper clearance/shorts, mask bridges or keepout violations. The native courtyard comparison checks 177 front and 9 rear polygons.
- All 167 model references resolve through 33 distinct model files. Electrical model assignments are unchanged. New padless review footprints represent raised glass, smaller NFC area, SAO tail allowance and textile cord holes.
- Fresh schematic contract and property checks pass:179 components,576 contract endpoints and 30 intentional NCs. Source netlist remains SHA256 `8409e65a237a60fd872eb89a0f4c5aa5caa0808df69a90cfe8a569411a77af59`.
- Fresh ERC: zero errors, same one LIS2DW12 SDO/SA0 bidirectional-to-power warning.

DRC is **not clean**: four existing USB source-footprint NPTH-to-pad clearance errors remain (0.1944 mm against the provisional 0.25 mm rule), plus one module silkscreen/notch-edge warning. 390 unconnected-item reports are expected because the board is unrouted. Nine missing-footprint parity reports correspond exactly to the unresolved references below. No rule was relaxed or failure suppressed.

## Remaining electrical/mechanical gates

| Reference | Decision required |
|---|---|
| U105 | Resolve exact TI DQA0010A/B package/land-pattern variant. |
| J102 | Select protected battery pack and connector, polarity/current rating, wire route and retention. |
| J103 | Select dock contact and polarity-safe guide/mating mechanics. |
| J104 | Define optional initially unpopulated thermistor interface if charging is enabled. |
| L101 | Select exact 0.47 µH inductor with current/saturation/DCR and assembled-height margins. |
| J301 | Validate exact display FPC connector, contact side, bend/fold and service access. |
| L301 | Select exact 68 µH display inductor with correct electrical/height margins. |
| AE501 | Design and qualify the smaller NFC antenna and tuning. |
| J502 | Confirm exact keyed SAO socket mating view, pad numbers and key orientation. |

Generic passive MPNs, effective capacitance/ratings, high-current and fine-pitch escapes, controlled-impedance stackup, USB hotplug/inrush, optical isolation, full height/tolerance/deflection stack, cable/plug motions, fabricator constraints and prototype tests remain pending. The placement leaves routing corridors but no trial escape or routing has been performed.

R120 still holds charger CE high. Charging remains disabled. The shared 3.3 V LED supply retains its documented prototype qualification gate. C507/C508 custom population fields say DNP while their native KiCad DNP flags remain false, matching the existing schematic workflow; do not issue a native-flag-only assembly BOM.

## Review artifacts and decision

`exports/pcb-review/shared-optics/` contains native front-with-display, rear-with-battery, exposed-front-components and raised-display-perspective images, native assembly SVGs, DRC/ERC and contract/property reports. Images use rendering-only derivatives that show the three virtual review envelopes; authoritative board exclusions and electrical geometry are unchanged.

The static `functional-blocks` annotations in earlier export folders are historical; a current static annotation has not been generated for this shared-optics revision. Use the web viewer's regenerated callouts for the current labeled view. Native preview images are in `exports/pcb-review/shared-optics/`.

The panel/battery/socket are dimensional allowances. Source-supported mechanical findings are in `compact_one_sided_mechanical_review.md`, RF tradeoffs in `one_sided_rf_mechanical_review.md`, and this pass's independent check is `shared_passive_optics_review.md`. Earlier optical checks remain in `lower_ir_placement_review.md` and `optical_space_placement_review.md`. Earlier organized/top-row checks are retained in `organized_top_row_final_review.md`, `top_role_placement_review.md` and `left_open_antenna_final_review.md`. Their images and the preceding compact/spread views are historical.

**Ask the user to review the 80 mm form factor, raised display, shared passive optical group, left buttons, right connectors, LED arrangement and antenna cutout as a placement direction. Do not start detailed routing without approval, and do not treat placement approval as resolving the listed RF, flex, part-selection or fabrication gates.**

