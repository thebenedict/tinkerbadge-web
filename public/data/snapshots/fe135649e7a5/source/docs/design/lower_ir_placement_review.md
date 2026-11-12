# Lower IR placement review

10 November 2026. **Pass for the nine-part placement delta and experimental development use.** The IR receiver, emitter and their support fit below the display and above/between D405 and D406. The move removes IR crowding from the role-LED area without changing the ambient sensor. No new electrical or native geometric blocker was found. Human placement approval remains required before detailed routing.

The receiver has useful optical clearance in this location. The emitter's forward axis is exposed, but the raised display still shadows some emission toward the panel beyond approximately 46° from normal. Treat this as an optical qualification limit rather than promising the complete nominal 120° viewing angle.

## Reviewed files and method

- Baseline: `.build/optical-space-one-sided/tinkerbadge.kicad_pcb`, SHA256 `8fa1ac386d237944d634cd7b5be0ca3ad3188f87965fbee94499eb1a51859399`.
- Saved candidate: `.build/lower-ir-one-sided/tinkerbadge.kicad_pcb`, SHA256 `a7ac2778f423c3847b9a3a6200f00446d6a960bbee242b6ef8da7aff5ed24b84`.
- Independent machine audit: `.build/lower_ir_independent_audit.json`; reproducible checker: `.build/check_lower_ir_independent.py`.
- Independently rerun DRC: `.build/lower_ir_independent_drc.json`.

Review used KiCad 10.0.8 native readback, full inverse-pose footprint comparisons, native courtyard/pad/outline polygons, exact-part source drawings and actual fresh render pixels. The reviewer wrote only new review scripts/reports and did not save or modify CAD, project settings, schematics, libraries, models or existing documents.

## Exact placement delta

All nine parts remain on F.Cu; coordinates are millimetres.

| Reference | X | Y | Rotation |
|---|---:|---:|---:|
| U504 | 137.75 | 168.50 | 180° |
| C510 | 131.50 | 168.75 | 90° |
| C509 | 131.50 | 171.50 | 180° |
| R507 | 128.00 | 168.75 | 0° |
| D501 | 150.00 | 168.50 | 0° |
| Q501 | 155.00 | 168.50 | 180° |
| R504 | 147.50 | 171.75 | 0° |
| R505 | 159.00 | 169.50 | 180° |
| R506 | 159.00 | 166.75 | 0° |

U501/C501/C502, all role and affinity LEDs and their capacitors, the rear battery/dock allowances, and the NFC reserve remain unchanged. The complete IR group courtyard envelope is x126.475..160.525/y165.705..172.745, entirely south of the glass edge at y164.9. Its lower support parts occupy space above or between the LED bodies, rather than sitting under the glass.

## Electrical and routing assessment

### Receiver filter and ground return

The manufacturer requires a 47–220 Ω series supply resistor and at least 2.2 µF close to VCC/GND. The existing 100 Ω R507, 4.7 µF C509 and 100 nF C510 remain unchanged.

Native pad-center distances are:

| Connection | Distance |
|---|---:|
| C509.1 to U504.4 VCC | 2.898 mm |
| C510.1 to U504.4 VCC | 3.110 mm |
| R507.2 filtered output to U504.4 | 5.864 mm |
| R504.2 to D501.1 anode | 3.251 mm |
| D501.2 cathode to Q501.3 drain | 2.563 mm |
| R505.2 to Q501.1 gate | 2.238 mm |
| R506.1 to Q501.1 gate | 3.507 mm |

These are reasonable local connections for this four-layer placement. Feed the receiver through R507 into the local capacitor/VCC node, with direct short branches. The ground pins are on the receiver's opposite side: a surface trace from the capacitor grounds to receiver ground would span approximately 9.4–10.3 mm. **Use nearby ground vias at both capacitors and both receiver ground pins into a continuous reference plane.** Do not form that long loop or share a narrow ground neck with LED or transmitter pulse current.

C509 is close to D405/C405 but does not collide: native courtyard boundary gaps are 0.530 mm to D405 and 0.424 mm to C405. Its filtered positive pad is only 1.955 mm from D405's +3V3 pad, so preserve the distinct nets and keep RGB power/data routing out of the receiver filter loop. Connect the LED bypass return and receiver bypass returns independently to the plane. C405/C406 and their LED connections were not moved.

The capacitor values/packages are specified, but exact passive MPNs and effective capacitance under bias remain an existing BOM gate. Verify that the selected 4.7 µF part meets the intended filter requirement in circuit.

### Transmitter and MCU signals

D501 cathode faces Q501 drain, and R505 is adjacent to the gate. Keep R506 local to gate/source, give Q501 source a direct local ground connection, and keep the +3V3 → R504 → D501 → Q501 pulse-current path compact. Do not route that current through the receiver filter or its ground return. The existing 100 Ω, at-least-0.25 W LED resistor limits nominal current to about 21 mA; retain the 38 kHz, one-third carrier-duty and bounded-packet restrictions. The emitter's 1 A absolute pulse rating does not apply to that carrier duty.

Moving the group does not introduce a high-speed interconnect requirement:

| MCU connection | Previous straight-line distance | New distance |
|---|---:|---:|
| U201.10 IR_TX to R505.1 | 50.47 mm | 63.21 mm |
| U201.11 IR_RX_N to U504.3 | 44.38 mm | 48.42 mm |

Rectilinear lower bounds change from 57.35 to 88.66 mm for IR_TX and from 57.06 to 59.89 mm for IR_RX. Actual routed lengths depend on the escape paths. These board-scale digital paths are manageable; their length alone is not a placement blocker. Route over continuous ground, avoid switching nodes and RGB edges, and provide return continuity at layer changes. Keep the 100 Ω gate resistor at the driver. Check received pulse edges and false pulses on the prototype; do not add an always-on pull-up that defeats the receiver's switched-power isolation.

No detailed escape trial or completed return-path review has been performed. This remains an unrouted placement.

## Optical access

The glass occupies x109.35..202.65/y110..164.9, with proposed underside z4.5 mm and upper surface z5.42 mm. U504's courtyard begins 0.805 mm below the glass and D501's begins 1.855 mm below it. These planar gaps establish package separation, not an unobstructed angular response.

### U504 receiver

The exact Everlight drawing shows a top-facing lens. At 180°, its approximate 0.88 mm lens-center offset toward pins 1/4 points away from the display, giving lens center y169.38. The specified lens apex height is 4.0 ±0.3 mm and typical horizontal/vertical half angles are ±45°.

For a point at that lens apex, a northward 45° ray remains 3.06 mm outside the glass at its upper surface using nominal height, or 2.76 mm at the minimum 3.7 mm height. Geometric glass occlusion starts around 72.4° from normal nominally, or 69.0° at minimum apex height. Thus the glass does not obstruct the typical 45° center-ray example. Retain the 180° orientation.

### D501 emitter and enclosure

The IR67-21C/TR8 is top-looking, 1.9 ±0.2 mm tall, with a typical 120° full viewing angle. Its center at y168.5 is 3.6 mm from the glass edge. A point-center calculation at nominal top height gives northward shadow onset at **45.6° from normal**, approximately 44.1–47.3° over the package-height range. This lies inside the nominal 60° half-angle. The forward axis and the direction away from the display remain exposed.

For comparison, clearing a nominal 60° center ray toward the panel would require an emitter center near y171.0, before adding positional/cover tolerances. That would require a different local placement around R504 and the LED row. It is not necessary for this placement pass unless full display-side angular coverage becomes a requirement.

These calculations use an optical-face point and nominal glass geometry. They do not model the complete lens, internal die optics or final cover. Keep distinct IR windows, avoid placing a frame lip or diffuser over them, and isolate them from the affinity light guide. Receiver/emitter centers are 12.25 mm apart; the receiver lens is about 7.77 mm from D405's center. Validate self-reception/saturation, RGB on/off interference, display reflections, sunlight, badge tilt, viewing angle and communication range in the assembled enclosure. Ambient sensing remains at its previous position and retains its earlier angular-response/calibration gate.

## NFC, battery and dock mechanics

The selected future B.Cu NFC coil and its existing front/inner/rear clearance remain unchanged at x182..200/y166..179. No coil exists yet. The IR group courtyard ends at x160.525, leaving at least 21.475 mm horizontal separation from this reserve. No moved pad intersects either the radio or NFC keepout. Do not use the NFC window to route the new signal paths.

The rear battery allowance is unchanged at x136.5..171.5/y120..175. Some front IR components project over that rear allowance, but they are SMT and add no through-board tails. No new physical battery intrusion is identified. Actual pack, swelling/insulation, supports and retention still require the existing mechanical qualification.

**Dock clearance is not established by this pass.** RES_J103 is an unpopulated rear review marker, with nominal drawing x118..130/y171.5..178.5 and expanded native rear courtyard ending at x130.545. C509's front courtyard begins at x129.975: its projection crosses the nominal drawing by 0.025 mm and the expanded rear courtyard by 0.570 mm. Actual C509 copper begins at x130.275 and nominal body at x130.700, both outside the nominal drawing. This opposite-side marker overlap is not a same-side component collision, but J103 has no selected contact footprint, pins, holes, front tails or seating mechanism. Check those actual envelopes and the dock insertion/support sweep before finalizing the lower edge.

## Independent preservation and geometric checks

- Exactly the intended nine poses changed.
- All **186 complete native footprints** match after restoring their baseline poses in memory and comparing native serialized records. Only item/attribute order is normalized; ordered vertices, every field, pad/net property and model remain in the comparison.
- Board-level content outside footprints is unchanged, including setup, nets, outline, native groups and rule areas. All eight groups match and native group sanity passes.
- 170 electrical footprints: 164 front components and six rear test pads. There are 568 pad primitives, 539 numbered.
- Four copper layers; zero tracks/vias. One valid closed 110 × 80 mm outline.
- Zero positive-area same-side courtyard collisions across 177 front and nine rear courtyards.
- No moved copper outside the outline or inside radio/NFC keepouts. Minimum moved copper-to-edge clearance is **7.550 mm at R504**, above the unchanged 0.5 mm rule.
- All 54 checked staged dependency files match root, including schematics, project, libraries and models. All 167 model assignments resolve to 33 distinct files.
- Source PDF hashes match their records. Baseline and candidate hashes were unchanged after independent inspection.

Native pad polygonization used maximum error 0.001 mm; outline tolerance was 0.005 mm. The audit records exact positions, nets, clearances, dependencies and optical arithmetic.

## DRC and visual review

The independent KiCad CLI DRC rerun found the same **four USB hole-clearance errors and one radio silkscreen-edge warning**, plus 390 unconnected items and nine missing-footprint parity warnings. Finding types, severity, descriptions and affected UUIDs match the preceding saved DRC, and ignored checks are unchanged. No new copper, courtyard, keepout, mask or outline finding appeared. The board is not DRC-clean.

Actual pixels were inspected in all four new native exports under `exports/pcb-review/lower-ir/`:

- `front-components.png`: the IR filter and driver remain recognizable local groups; no new component-body overlap is visible.
- `front-with-display.png`: the entire nine-part group is visible below the panel, leaving the role-LED strip clear of IR parts.
- `rear-with-battery.png`: rear battery/socket allowance and test pads remain in place; no rear SMT or coil was added.
- `raised-display-perspective.png`: receiver, emitter and support sit outside the glass projection, with useful forward access.

Their SHA256 values are recorded in the machine audit. Simplified component models omit detailed optical surfaces, and the final cover, supports and dock are absent. Existing radio/display spacing, flex/connector acceptance, battery/dock selection, exact-part heights, NFC tuning, manufacturing exceptions and prototype gates remain. Approval of this placement delta does not close those gates.

## Sources

Read `AGENTS.md`, `docs/spec.md`, the PCB routing guide, current implementation/peripheral contracts, component records, earlier optical placement review and rear-NFC assessment.

- Everlight IRM-H638T/TR2, DMO-0000008 Rev3, 1 January 2025, pp1–3/6. Actual p2 application-circuit, p3 angular limits and p6 package pixels inspected. Archived PDF SHA256 `6ba15dc59077b2a3357495e5cbfe9b68378a275ae1750e02e77f9d6f2663d22e`.
- Everlight IR67-21C/TR8, DIR-0000986 Rev3, 10 July 2013, pp1–3; actual p2 dimensions/polarity/current-limit pixels inspected. Archived PDF SHA256 `8b0cafbc6c75a60d705c078c8027fea96162e198b8125909d2658e66738f527c`.
- AOS AO3400A, Rev3.1, July 2023; existing independently reviewed pin/drive record. Archived PDF SHA256 `9c60d0b6c1ddc7609a4b788a91181468d8ffe6c3e9ba425c3d8ffc5ba88c5033`.

Manufacturer URLs remain in the corresponding `docs/datasheets/*.source.json` records.
