# Tinker Badge design review, 11 November 2026

Review date: 11 November 2026, America/Los_Angeles (Seattle).  
Reviewed revision: `3120d6e94619aeb5267b6b119796e4e55db77062` (`3120d6e`).  
PCB SHA-256: `e810ede1361930f441fd6476230c689aeb4480719db890b1a41619168cab674d`.

This document consolidates today's independent NFC and fit-for-purpose reviews, with the mechanical preparation findings that affect enclosure work. The review inspected the current native KiCad design, component sources, contracts, manufacturing records and existing renders. Only this review document was added; the hardware and production files were not changed.

## Conclusion

The overall arrangement is a sensible starting point for a lanyard badge. Keep the adjacent side buttons, outward-facing USB, rear dock contacts, lower forward-facing optics and central accelerometer unless physical tests show a specific problem.

The current board needs an NFC layout correction before fabrication. Its rear coil is almost completely backed by both inner ground planes, and an unrelated front-layer LED trace crosses the aperture. The saved board does not implement the clearance described in the project records.

The other immediate priorities are the battery-temperature protection arrangement, display flex mating, and the actual SAO socket geometry. Those affect safe charging and whether the assembled badge fits. Recovery access and firmware-facing documentation also need attention before bring-up and enclosure freeze.

### Priorities

| ID | Priority | Finding | Required next step |
|---|---|---|---|
| NFC-1 | High; correct before fabrication | Inner planes and RGB routing occupy the selected coil's protected region | Restore an enforceable antenna window, reroute the unrelated trace, refill and inspect copper/CAM |
| PWR-1 | High; charging qualification | Exact pack and cell-to-sensor thermal behavior are unqualified; hot-trip corners reach about 51°C | Select the pack and establish a worst-case safe temperature window and thermal coupling |
| MECH-1 | High; mechanical correction | SAO footprint and render omit the selected socket's true size | Correct the body/courtyard/model or select a qualified smaller part |
| DISP-1 | High; fabrication gate | Bottom-contact connector, short flex and folded path have not been proven together | Dry-fit the exact panel and connector; verify contact face, pin order and full motion envelope |
| UI-1 | Medium-high | Recovery requires small rear pads and has no physical reset/BOOT control | Define accessible recovery and a true power-cycle path |
| DOC-1 | Medium | Expander initialization and display pinout disagree with current hardware | Reconcile contracts and generated records before firmware bring-up |
| SERVICE-1 | Medium | No component reference designators are on manufactured silkscreen | Add useful visible references and matching assembly/probe maps |
| SYSTEM-1 | Qualification | Dock, optics, radio, enclosure, runtime and storage behavior remain untested | Test a complete assembled badge against the acceptance plan below |

“Confirmed” findings below concern observed CAD or source facts. Prototype-dependent findings name the measurement needed to close them. No read-range, runtime, thermal or wearer test was performed.

## NFC: rear copper coil

### NFC-1: the saved copper contradicts the intended antenna clearance

**Confirmed layout defect, high confidence.**

AE501 is a ten-turn B.Cu spiral with its 18 × 13 mm winding body at x182–200 / y166–179 mm. The outer terminal/lead extends beyond that rectangle, to pad edge x180.7 and y165.8. Its 51 copper segments form a continuous winding between the two terminal pads. Native connectivity reaches the intended tag pins: AE501.1 → U503.1/LA and AE501.2 → U503.8/LB. C507 and C508 are across those nets; C507 is 27 pF and C508 is DNP.

The defect is the copper surrounding and overlapping that otherwise connected coil:

| Saved-copper measurement | In1.Cu GND | In2.Cu GND |
|---|---:|---:|
| Ground inside the 234 mm² winding-body rectangle | 233.2085 mm², 99.66% | 233.2085 mm², 99.66% |
| Ground inside the 56.16 mm² central aperture | 55.3685 mm², 98.59% | 55.3685 mm², 98.59% |
| Ground in sampled strip immediately below the coil, x182–200 / y179.05–179.4 | 6.3 mm², 100% | 6.3 mm², 100% |

The nearest inner plane, In2.Cu, is separated from B.Cu by only **0.2104 mm of dielectric** in the saved stackup. These measurements intersect the actual saved filled polygons, including their holes, rather than merely comparing zone outlines.

An additional **F.Cu RGB_LINK_7 trace crosses the aperture**, approximately from (181.3,174.55) to (199.4,174.55), then diagonally toward (200.8,175.95). Removing the inner pours alone would leave this unrelated conductor in the antenna region. The intentional NFC crossover is a separate feature and must remain electrically connected.

There is no NFC rule area in the saved board. The remaining antenna rule area belongs to the ESP32.

### Why this matters

The NFC loop couples through a magnetic near field. Nearby conductive planes support induced currents that oppose that coupling and introduce loss and detuning. They are not a beneficial antenna ground reference.

[NXP TN00042, revision 1.0, §4.2.2](https://www.nxp.com/docs/en/engineering-bulletin/TN00042.pdf) warns against placing an antenna directly on a metal plate or ground plane and identifies distance and/or ferrite as remedies. This board has a dielectric separation, so that warning is not a measured guarantee of zero communication here. It does establish a serious conflict with the selected unshielded coil architecture.

[ST AN2972, §§3.4.1–3.4.3](https://www.st.com/resource/en/application_note/an2972-how-to-design-an-antenna-for-dynamic-nfc-tags-stmicroelectronics.pdf) independently recommends avoiding overlapping planes and surrounding conductive loops and describes reduced inductance and Q near metal. It corroborates the mechanism; its examples do not quantitatively predict performance for this NTAG design.

Changing the tuning capacitor can compensate a resonance shift. It does not by itself recover lost coupling or Q. CAD cannot establish that every phone will fail, or predict the lost read distance.

### Root cause and affected records

- [`tools/sync_board_design_review.py`](../../tools/sync_board_design_review.py), line 32, selects the replacement AE501 footprint. Line 40 includes `MECH_NFC` in `DROP_REVIEW`; lines 66–76 remove those footprints and their embedded rule areas.
- [`tools/create_review_footprints.py`](../../tools/create_review_footprints.py), lines 60–91, creates the replacement coil's graphics, pads, courtyard and text without a replacement rule area.
- [`tools/route_remaining.py`](../../tools/route_remaining.py), lines 34–36 and 154–156, excludes the coil rectangle from the router's In2.Cu occupancy. This is a track-routing restriction, not a KiCad zone-fill rule. In1.Cu is explicitly left as a solid plane, and no equivalent front-region exclusion is applied.
- [`implementation_status.md`](../design/implementation_status.md), line 9, describes front/inner clearance, and the [10 November design review](../design/design_review_2026-11-10.md), line 136, describes no copper under the coil. Those statements do not match the checkpoint's saved filled copper.

### Recommended correction

1. Restore an explicit exclusion on all four copper layers covering the winding and aperture, with reviewed perimeter and feed clearance. Permit the intentional coil, terminals and necessary feed/crossover. Do not reinstate a blanket prohibition that makes the antenna itself illegal.
2. Extend the plane-free window to the bottom board edge, rather than leaving a rectangular opening surrounded by ground. The saved planes retain a complete copper bridge immediately below the coil; opening the window avoids that closed surrounding ground path.
3. Reroute RGB_LINK_7 outside the window with a suitable return path. Review adjacent ground, power routes and any islands created by the cutout.
4. Refill the zones. Inspect actual filled copper and exported Gerbers, and add a regression check that rejects unrelated copper in the protected region. A router configuration or generic DRC pass does not establish this property.
5. Re-characterize the coil and tune the assembled tag. Keep 27 pF as a provisional starting value. Measure coil impedance, fitted-tag resonance and phone read/write success with the actual display, cell and enclosure, including passive operation without badge power.

NXP's [NTAG I²C plus antenna design guidance](https://community.nxp.com/t5/NXP-Designs-Knowledge-Base/Guide-to-designing-antennas-for-the-NTAG-I2C-plus/ta-p/1104729) calls for characterization in the final mounting environment.

### Mechanical boundaries and alternatives

The battery allowance ends at x171.5, giving 10.5 mm nominal lateral separation from the winding. The display envelope ends at y164.9, only 1.1 mm before it. D408's nearby pad edge is at x200.735. These are measured coordinate gaps, not qualified RF clearances. There is no basis here for inventing a universal 3, 5 or 10 mm keepout or enlarging the board without testing.

The integral rear coil can retain front-only SMT assembly. A separately qualified ferrite-backed flex antenna is an alternative if the necessary region cannot be cleared. Ferrite on the outward face of the existing B.Cu coil would not separate that coil from the PCB's inner planes. See the [rear NFC feasibility record](../design/rear_nfc_feasibility.md) for the architecture and phone-approach tradeoffs.

Define the intended tap face and mark it. Test worn and unworn positions, hand/body loading and practical phone alignment; a rear-facing tap may require lifting or turning a worn badge.

The current [production manifest](../../production/jlcpcb/manifest.json) references the reviewed board hash. After correction, regenerate and review the manufacturing package rather than reusing it.

## Power, charging and storage

### PWR-1: pack and temperature sensing are not yet qualified together

**Confirmed implementation and qualification gap; high priority.**

Charging is autonomous: U102 CE is tied low. RT101 is a front-mounted NTC at (168.8,123), while the battery allowance is on the rear, x136.5–171.5 / y120–175. The sensor measures temperature through the board and attachment stack, not directly at a verified point on the pouch. Charger heating, cell heating, insulation, adhesive, attachment pressure and response time can alter that relationship.

The new exact protected two-wire pack is still unspecified. The former LP603450 source allows charging only at 0–45°C, but it is no longer the selected pack. The issue is unresolved compatibility, not a demonstrated violation of an already-selected replacement.

The BQ24074 source gives NTC bias current 72/75/78 µA and hot thresholds 270/300/330 mV. With nominal 10 kΩ B3950:

| Calculation | Hot trip |
|---|---:|
| Nominal threshold and bias | 47.15°C |
| IC threshold/bias corners, nominal R25 and beta | 43.66–50.95°C |
| Same corners with R25 ±1%, nominal beta | 43.40–51.22°C |

These values follow `R = VHOT / INTC` and `T°C = 1 / (1 / 298.15 + ln(R / R25) / 3950) - 273.15`. Nominal R is 4000 Ω; the hot-threshold resistance corners are 4583.33 and 3461.54 Ω. Beta tolerance, resistance/temperature curve accuracy and thermal offset/lag still need to be included.

**Recommendation:** select the exact pack, verify polarity and charge-current limits, and establish a worst-case temperature window inside its allowed range. Provide dependable cell coupling and test open/short sensor faults, actual trip temperatures and lag. Until that is done, do not qualify unattended or worn charging. Low charge current and an ordinary pack protection PCB do not replace temperature protection.

Evidence: [BQ24074 datasheet](../datasheets/BQ24074RGTR.pdf), §8.5 p13 and §9.3.6 p29; [text extraction](../datasheets/extracted/BQ24074RGTR.txt), lines 740–746; [implementation record](../design/implementation_status.md), lines 22 and 52–54; [former pack record](../components/LP603450.md), lines 17–24; native RT101 and MECH_BATTERY at PCB lines 35843 and 39525.

### Existing power choices to retain and test

- The shared nominal 3.3 V rail for the MCU and eight WS2812C-2020-V6 LEDs is an explicitly accepted first-prototype experiment. The LED minimum remains 3.3 V; the design's tolerance and load transients can go below it. Test at the LED and MCU supply pins under combined radio, display and full-white LED demand, low battery and source changes. Eight full-white pixels are about 120 mA nominal before other loads.
- Complete-badge runtime and storage current remain unmeasured. Include NFC standby, LED standby, sensor/expander states, pull-ups, charger/regulator current and backfeed. Battery voltage alone is not a reliable remaining-runtime percentage.
- Verify USB-only boot with a depleted or absent battery, source transitions with both inputs present, charging under system load, termination, fault recovery, low-voltage sleep/restart and thermal rise.
- Keep the no-live-insertion/no-self-powered-accessory limitation visible in bring-up instructions. Drive external I²C/GPIO high impedance and disable pulls before accessory power is removed.

These tests are detailed in the [implementation record](../design/implementation_status.md), lines 40–64, and [specification](../spec.md), lines 109–132. No rail change is made by this review.

## Display, SAO and enclosure fit

### MECH-1: the selected SAO socket is larger than its footprint

**Confirmed CAD defect; high priority.**

J502 is specified in the [hand-fit BOM](../../production/jlcpcb/bom-hand-fit.csv), line 3, as **SFH11-NBPC-D03-ST-BK**. The Sullins drawing gives a **12.70 mm long × 6.00 mm wide body, an additional 1 mm key, and 8.50 mm height**.

The current [footprint](../../Tinkerbadge.pretty/SAO_Socket_2x03_Front.kicad_mod), lines 15–16, draws a 7.88 × 5.34 mm body and 8.6 × 6.0 mm courtyard. It contains no 3D model; the native board's J502 model list is also empty. The clean-looking front render therefore omits the actual socket body. The real housing also covers the current 3V3/GND markings at footprint lines 20–21.

This establishes a body/courtyard/model error. It does not establish wrong contact pitch or a collision with a particular neighboring component.

**Recommendation:** model the selected part correctly or qualify a smaller socket. Verify key and pin orientation with an actual SAO. Decide whether the 8.5 mm body protrudes through the cover or requires a deeper front cavity, and preserve a usable role-light path around it. Recheck mating and insertion clearance with an installed add-on, not just an empty socket.

Sources: [component facts](../components/SFH11-NBPC-D03-ST-BK.md), line 22; [independent footprint review](../design/pcb_peripheral_footprint_review.md), lines 352–368; [archived official drawing](../datasheets/SFH11-NBPC-D03-ST-BK_official.pdf), Sullins 11160 revision J, p1; [manufacturer drawing](https://drawings-pdf.s3.amazonaws.com/11160.pdf). Native J502 is at (190.75,105), beginning at PCB line 2313.

### DISP-1: prove the exact display mating before fabrication

**Known unresolved physical risk; high priority.**

The glass envelope is 93.3 × 54.9 mm, x109.35–202.65 / y110–164.9, with a proposed underside 4.5 mm above the PCB. J301 is a bottom-contact Hirose FH12 at (198.5,145), facing right, with pin 1 toward the southern end.

The panel drawing provides only **13.8 ±0.3 mm projecting flex**. Contact face, mirrored pin order, folded path, bend radius and latch motion have not been demonstrated together. The right-side region also contains USB and Qwiic; there is no verified complete flex/plug/case assembly.

**Recommendation:** dry-fit the exact panel, actual connector and dimensionally accurate PCB mockup before ordering. Verify 1-to-1 pin continuity, contact side, support height and the full flex/latch motion envelope. Confirm the allowed glass support and adhesive regions. A connector rotation or contact-side correction after fabrication could invalidate every board.

Evidence: native J301 at PCB line 8197; [release note](../design/jlcpcb_release.md), lines 7–13; [implementation record](../design/implementation_status.md), line 27; exact panel source and drawings referenced by [display design](../design/display.md). The panel drawing pixels were inspected during today's usability review.

### Enclosure basis and next design pass

The native board provides these useful anchors:

- Board: 110 × 80 × 1.6 mm, with an asymmetric radio-antenna shoulder.
- Display envelope: 93.3 × 54.9 × 0.92 mm; proposed underside 4.5 mm above the PCB.
- Battery: 35 × 55 × 7 mm **allowance**, not a selected complete pack. Cable, connector bend, insulation and swelling clearance still need real dimensions.
- Four Ø2.2 mm structural holes and two Ø3.2 mm lanyard holes. Earlier mechanical review limits structural boss/head envelopes to Ø4.5 mm and calls for RF-aware hardware. The upper-right mounting center is only 3.35 mm laterally from the glass.
- SAO is now front-top; the battery connector is on the rear beside the allowance. Some older placement JSON describes the previous arrangement.

The nominal display/PCB/battery stack already totals about 14 mm before walls and clearances. Fully enclosing the 8.5 mm SAO body increases the front cavity requirement. Use compliant display support, insulated battery retention with swelling space, a serviceable assembly sequence and a lanyard load path through the structure. Do not clamp arbitrary glass edges or compress the pouch. Smooth edges and a breakaway lanyard belong in the wearable prototype.

Enclosure implementation should begin from a pinned board snapshot after the intended board corrections are complete. Use native board geometry and exact source drawings; the existing simplified VRML envelopes and the omitted SAO model are insufficient clearance evidence and may not all survive STEP export.

The existing specification's build123d approach remains suitable: separate board datums, fit parameters and styling; compare two or three restrained frame shapes; then develop front/back/frame parts, controlled button plungers, port access, optics partitions and a dock interface. Deliver editable source, named-part STEP assembly, individual print meshes, dimensioned review drawings and an assembly model for the web pipeline. STEP import into Fusion does not preserve a native parametric feature timeline. No enclosure implementation was started in this review.

## Controls, service and firmware-facing records

### UI-1: retain the button placement, improve recovery access

SW401 and SW402 are at (102.1,145) and (102.1,155), with 10 mm center spacing and left-facing actuation. Their faces are essentially flush with board edge x100. The Alps part is specified at 2.2 ±0.65 N and about 0.2 mm travel.

This is sensible placement, but it requires a controlled plunger and overtravel stop. Use distinct tactile shapes or a separator, and test operation while worn, with a stabilizing hand, plus accidental bag/edge presses. Retain the [Alps continuous-bias and application qualification gate](../components/SKSCLBE010.md); geometry alone does not close it.

Recovery is less convenient:

- Six 1 mm rear pads, 3 mm pitch, run along y116 at x174–189: EN, BOOT, 3V3, GND, UART TX and UART RX.
- They sit above the battery allowance, but need an explicit service opening or removable rear cover.
- No physical reset or BOOT switch is fitted. The user buttons connect to GPIO2 and GPIO4, not GPIO0.
- Native USB handles normal flashing, but cannot guarantee recovery from arbitrary firmware changes to USB/PHY pins. Keep the strap/UART recovery path.

**Recommendation:** provide recessed reset/BOOT access and retain a keyed pogo fixture option. Reusing a normal button for BOOT is possible, but requires strap/RC and accidental boot-mode review. Keep an accessible battery disconnect for a true power cycle with USB, dock and back-powering accessories removed. Reset alone is not a complete power cycle.

### DOC-1: reconcile initialization and pinout records

**Confirmed documentation defect; not evidence that existing firmware already uses the wrong value.**

The [implementation record](../design/implementation_status.md), line 33, correctly says unused TCA9534 P1 and P4–P7 should be driven low as outputs after their pulldowns were removed. Line 60 still prescribes direction mask `0xFB`, which leaves those pins as inputs.

The [peripheral contract](../design/peripherals_contract.json), lines 992–1008, has the current pin map, but line 1011 and lines 1104–1118 retain the old `0xFB` initialization, removed PGOOD input and “unused pulldown input” descriptions. With only P0/CHARGER_CHG_N and P3/ACC_FAULT_N as inputs, and P1/P2/P4–P7 as outputs, the described intended direction register is **`0x09`**, after writing output latch **`0x00`**. MCU-only reset does not reset the expander.

The [generated display pinout](../design/display_pinout.md), lines 16–20 and 40–59, still lists buffered `_PANEL` nets and removed U301. The current connector uses direct EPD_RST_N/DC/CS_N/SCK/MOSI signals; the [implementation record](../design/implementation_status.md), lines 29 and 63, documents removal of the buffer.

**Recommendation:** reconcile owning contracts, generated pinouts and firmware initialization together, then add checks for these changed states. These inconsistencies affect startup and sleep-current debugging.

### SERVICE-1: manufactured references and probe access

All 167 native footprint reference fields are on fabrication/user layers, with none on F.Silkscreen or B.Silkscreen. Functional markings are present and useful: USB, EPD, Qwiic, A/B, battery/dock polarity, revision and recovery-pad labels.

Troubleshooting “check R507” still requires an external placement map, and the opaque display hides much of the circuitry.

**Recommendation:** put at least important IC, connector, test-point and power/filter references on silk where visible. Supply revision-matched front/back assembly maps for the covered parts. Add practical, labeled rear probe access for VBAT, VSYS, the switched display supply and internal I²C; the existing dedicated pads mainly serve MCU recovery.

## External interfaces and dock

### USB and Qwiic

USB J101 faces outward at the right edge, center y126, with its mouth approximately at x210. Qwiic faces outward at y159 but its mouth is about 0.925 mm recessed from the PCB edge.

Keep these anchors, then reserve actual cable overmolds, insertion/removal space and the nearby display flex path. A thick wall can prevent Qwiic seating. Right-side cables avoid the lower dock pads but may still snag or twist a hanging badge. Case support should take cable forces without loading the display.

### Dock contacts and return flow

J103 is implemented as two rear-facing 4 × 6 mm pads at (120,175.5) and (128,175.5): 8 mm pitch and 4 mm edge-to-edge gap. Their lower edges are 1.5 mm from the board bottom. Pad 1 is DOCK_5V; pad 2 is GND.

This is a useful starting point for a keyed cradle. Because the contacts face rearward, a drop-in dock needs rear-facing spring pins or a guided seating motion, rather than only vertical pins under the PCB.

Remaining requirements:

- Define pin travel, wiping, tolerance stack, alignment and support. Route insertion force into the case/PCB supports rather than the glass.
- Use polarity-safe guides and per-slot current limiting/short protection.
- Choose the actual surface finish. The footprint describes ENIG landing pads, but the [release settings](../design/jlcpcb_release.md), line 24, default to HASL. ENIG is preferable for this prototype contact interface; cycle testing is still needed for a fleet.
- Preserve separate USB and dock presence sensing. Two power contacts do not identify which badge has been returned; checkout needs an authenticated identity/communication path.
- Green power status means externally powered, not fully charged. The specified storage state intentionally leaves every LED dark, including during charging. If staff need charge-complete visibility, resolve that experience explicitly rather than treating the existing status light as a charge gauge.

Test contact bounce, partial/reversed insertion, shorted contacts, repeated cycles and reliable identity/cleanup. USB charging must never trigger loaner checkout. The persistent e-paper image and local attendee data must be cleared before reporting a confirmed loaner return/reset complete, as required by the [specification](../spec.md).

## Sensors, light and radio

### Ambient light and IR

The placements are sensible for forward-facing sensing below the glass:

- U501 ALS: (143.5,170.5).
- U504 IR receiver: (137.75,168.5), top-looking, with its lens-center offset away from the panel edge.
- D501 IR emitter: (150,168.5).

The receiver's normal/typical forward view is not obstructed by the documented glass geometry. The ALS is about 12.0–12.5 mm from its neighboring affinity LEDs; distance alone does not prevent self-light contamination.

For the emitter, the nominal display-side shadow starts around 46° from normal, inside its nominal 60° half-angle. Do not assume the complete datasheet cone survives assembly.

Use a visible-and-940 nm-transmitting passive window for ALS/receiver, a separate emitter segment, and isolation from the RGB diffuser. A continuous clear cover can still carry internally reflected IR. The earlier suggested ±30° passive-window target is an enclosure design target, not guaranteed sensor performance.

Test tint and transmission, ALS calibration, RGB on/off, IR self-transmission, sunlight, event lighting and tilted worn positions. Verify the receiver's burst/protocol behavior with multiple badges.

The receiver supply is coupled to the accessory rail through R507. Accessory power-off or a fault also disables IR reception. Document that dependency, or separate it if reception is a core independent feature.

### Accelerometer

No placement defect was found. U502 at (162,133) is near the board center rather than a corner or mounting hole, and INT1 reaches the MCU directly. It needs no optical opening.

Document the body-axis mapping and run a six-face/calibration test. Lanyard swing can resemble a gesture. A bump should initiate candidate selection or confirmation, not establish deliberate contact exchange on its own. Disable motion wake for storage/transport as specified.

### Radio

The antenna overhang and notch are useful, but the glass starts only 3.5 mm beyond the antenna strip, short of Espressif's broader recommended 15 mm housing clearance. This compactness tradeoff creates a performance risk; it does not prove radio failure.

Test with the actual glass, battery, case, lanyard hardware and wearer, including crowded-event conditions. Keep conductive clips, coatings and fasteners away and protect the unsupported overhang. The [10 November review](../design/design_review_2026-11-10.md) and [RF/mechanical review](../design/one_sided_rf_mechanical_review.md) contain the existing clearance context.

## Verification and evidence

### What was checked today

- Native KiCad 10.0.8 board placements, pad nets, reference layers, footprints, saved fill polygons and mechanical envelopes.
- Independent NFC winding connectivity and actual inner-plane overlap, including front routing and the bottom ground bridge.
- Original SAO and panel drawing pixels, plus the existing front and rear render pixels, during the usability review.
- Current component records, specification, implementation record, contracts, prior reviews and manufacturing settings.
- All 12 source files in [`exports/design-review-2026-11-10/sha256.txt`](../../exports/design-review-2026-11-10/sha256.txt) match their recorded hashes. The documentation consolidation independently repeated this hash check.
- The production manifest identifies the same PCB hash as this review.

### Existing pinned checks, read rather than rerun

The checkpoint's [DRC report](../../exports/design-review-2026-11-10/drc.json) has zero unconnected items, zero schematic-parity issues and no clearance/short violations. Its ten warnings are four dangling-track reports, three silkscreen-edge reports, two silkscreen overlaps and one library-footprint mismatch. The prior review records the dangling segments as needed T-junction joins.

The [ERC report](../../exports/design-review-2026-11-10/erc.json) contains zero errors and the one documented LIS2DW12 address-strap warning. Existing [endpoint](../../exports/design-review-2026-11-10/endpoint-check.json), [property](../../exports/design-review-2026-11-10/property-check.json) and [power-path](../../exports/design-review-2026-11-10/power-paths.txt) results remain part of that pinned evidence.

Today's reviews did not run a fresh DRC/ERC, refill zones, regenerate renders/CAM, simulate RF or test physical hardware. In particular, the existing DRC does not test the missing NFC exclusion. There is no completed enclosure or dock proving physical fit.

### Reproducing the NFC measurements

Use KiCad 10.0.8's bundled Python/pcbnew against the exact PCB hash above.

- Load the board with `pcbnew.LoadBoard`.
- Construct `SHAPE_POLY_SET` rectangles in native nanometres using `FromMM`, `NewOutline` and `Append`.
- For each GND zone, use `GetFilledPolysList(zone.GetLayer())`. Intersect a rectangle with that saved polygon set using `BooleanIntersection`; divide `Area()` by 10¹² for mm².
- Winding-body rectangle: (182,166)–(200,179). Central aperture: (185.8,169.8)–(196.2,175.2). Bottom bridge sample: (182,179.05)–(200,179.4).
- Polygonize AE501 B.Cu graphics with `TransformShapeToPolygon(poly, pcbnew.B_Cu, 0, pcbnew.FromMM(0.001), pcbnew.ERROR_OUTSIDE)` and union them. The graphic union is 93.74756 mm²; its overlaps with In1/In2 fill are 93.51639/93.51617 mm². Polygonize tracks and pads similarly to identify unrelated copper.
- The winding endpoint-degree check found two degree-1 endpoints and 50 degree-2 joins across 51 segments. Check the pad/net connections to U503 and C507/C508 separately.

This method measures saved geometry without modifying or refilling the board.

## Recommended sequence and acceptance gates

### Before fabrication and enclosure freeze

1. Correct the NFC copper exclusion and unrelated RGB routing. Refill, inspect copper/CAM and add the regression check.
2. Select the pack and resolve temperature sensing, coupling, tolerances, cable polarity and charge limits.
3. Dry-fit the exact display and connector, including contact side, pin order, support height, flex path and latch access.
4. Correct the SAO mechanical geometry; decide protrusion, role-light clearance and accessible recovery controls.
5. Reconcile expander initialization, display pinouts and other stale current-versus-historical records.
6. Pin the corrected board and mechanical inputs, complete human routing/placement review, rerun the affected electrical checks and regenerate the production package. Check supplier placement rotations and exact footprint source drawings before an order.

### Assembled prototype acceptance

- **Power:** representative four-hour event workload; measured storage current; cold start; depleted/no-battery USB boot; both-input transitions; charge faults, termination and cell/sensor temperatures; low-voltage behavior; combined LED/display/radio transients.
- **NFC/RF:** assembled-coil tuning and phone reads/writes, including passive battery-free reading; marked tap face; worn/unworn orientations; actual battery/display/case and metal hardware; event radio performance.
- **Optics/UI:** readable names and QR codes at real conversation distance, including long names; display refresh/ghosting; non-color role/affinity explanations; button force/travel and accidental presses; diffuser uniformity; ALS/IR/RGB interference and room lighting.
- **Recovery/service:** recovery after broken firmware without normal application USB behavior; accessible EN/BOOT/UART and battery disconnect; useful assembly/probe maps; repeated assembly without damaging the flex or pouch.
- **Dock/fleet:** keyed seating, spring travel, bounce, shorts and repeated cycles; authenticated badge identification; clear source-versus-charge state; confirmed loaner cleanup including persistent display; USB charging never treated as checkout.
- **Wearability:** a full-size weighted mockup for tilt, comfort, cable snagging and button use; protected antenna/glass; safe lanyard and fastener loads; battery retention and service access.

Record the board, BOM, firmware, enclosure and test conditions for each result. Close failures before a larger build.

## Related records

- [Specification](../spec.md)
- [Current implementation](../design/implementation_status.md)
- [10 November design review](../design/design_review_2026-11-10.md)
- [Current placement review](../design/pcb_placement_review.md)
- [Rear NFC feasibility](../design/rear_nfc_feasibility.md)
- [JLCPCB package and release settings](../design/jlcpcb_release.md)
- [Checkpoint on GitHub](https://github.com/thebenedict/tinkerbadge-hardware/tree/3120d6e94619aeb5267b6b119796e4e55db77062)
