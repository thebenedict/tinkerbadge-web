# Overall product review

11 November 2026, Seattle time. Review of electrical design, enclosure, attendee experience and loaner operations. Final reviewed PCB SHA-256: `2ab108d4ad09cb5538978bc369583472795cd0d11a55392cd0bc81e5c5f62757`, revision 0.3. [Input hashes and evidence](product-review-2026-11-11/manifest.json).

## Assessment

The product has a coherent core: a readable, reusable name badge with a visible hardware identity and room for attendee experiments. The large e-paper panel, separate role/interest lights, two everyday buttons, native USB recovery and serviceable enclosure support that purpose. Keep that architecture for the first prototype.

The electronics are ready for the remaining pre-fabrication reviews, but the assembled product is not yet qualified for event use. The largest risks are battery temperature protection, display mating, controls through the case, and the operational gap between a working badge and a reliable loaner fleet. More sensors or interaction modes would not address those risks.

The PCB changed during this review. The earlier saved board (`7b6ea0e6…`) had 36 open connections, including after an isolated copper refill. The final board resolves them. All results below refer to the final board unless explicitly identified otherwise.

## Checks performed

| Check | Result and scope |
|---|---|
| Fresh KiCad 10.0.8 ERC | 0 errors; 1 documented LIS2DW12 address-strap warning |
| Fresh DRC with schematic parity | 0 unconnected items, 0 parity issues, 0 error-severity violations |
| Remaining DRC warnings | 6 dangling-track reports, 3 silk-to-edge, 2 silk overlaps, 1 module-library mismatch. The prior response explains the track reports as T junctions; this review did not independently prove every exception. |
| Fresh schematic contract comparison | PASS: 162 components, 509 endpoints, 24 intentional no-connect endpoints |
| Declared component properties | PASS for the fields checked by the repository validator |
| Native NFC copper-window check | PASS |
| NFC check against current production Gerbers | PASS within the existing checker's scope |
| Current production manifest | PCB hash matches the final reviewed board |
| Native enclosure fit | PASS on a scratch copy with fresh interface extraction: connected frame, board clearance, 15 named body envelopes, optical-divider courtyard screen and nominal battery gap |
| Mechanical interface comparison | All 30 reference records match the older enclosure interface file |
| Visual inspection | Fresh native PCB top render inspected; enclosure construction and dimensions reviewed from CAD sources. The browser inspection stalled, so no live viewer usability result is claimed. |

The enclosure check used build123d 0.10.0 and cadquery-ocp 7.8.1.1.post1. Its named envelopes do not cover every component solid, manufacturing tolerance, insertion path or load case. No powered hardware, wear test or physical assembly was available. [Raw check results](product-review-2026-11-11/) and [PCB render](product-review-2026-11-11/pcb-front.png).

## Electrical findings

### High priority: close the battery and temperature-protection design together

The protected pack is still unspecified. The implemented parallel 10 kΩ and 100 kΩ B3950 thermistors give approximately 9.09 kΩ at 25 °C. Recalculation confirms a nominal hot cutoff of 44.7 °C and an IC-tolerance corner of 48.4 °C, before thermistor tolerances and cell-to-sensor thermal error. That does not guarantee compliance with a pack limited to 45 °C charging. The sensors are on the opposite side of the PCB from the cell; their response to cell heating and nearby regulator heating remains unmeasured.

Choose the exact pack and establish a worst-case autonomous charge window within its allowed range, including sensor coupling, tolerance and lag. Change the cutoff circuit if required. A few successful prototype measurements characterize those units; they do not remove the specified component corners. Verify pack polarity, allowed charge/discharge current, sensor faults and charge termination under load before a wearable or unattended charging trial.

Evidence: [implementation record](../design/implementation_status.md), [review response](response_2026-11-11.md), and [TI BQ24074 datasheet](https://www.ti.com/lit/ds/symlink/bq24074.pdf), electrical limits and §9.3.6.

### High priority: verify the display connector and fold before fabrication

The new dual-contact FH34SRJ connector addresses the old contact-face concern, and its location now follows the flex centreline. Its project footprint deliberately reverses the manufacturer's contact numbering to match the folded panel. The latest response explicitly records that this new footprint and numbering have not received a second-person review.

Perform that independent drawing/pin audit and dry-fit the actual panel and connector against a dimensionally accurate board mockup. Verify pin 1, every contact's mapping, bend radius, insertion depth, latch travel and glass support. The documented flex-to-USB-shell gap is only about 0.7 mm, making the complete assembly sequence consequential.

Evidence: [FH34SRJ record](../components/FH34SRJ-24S-0.5SH.md), [review response](response_2026-11-11.md).

### Prototype qualification: shared power, runtime and storage

Retain the accepted single-3.3 V experiment. It reduces circuit complexity, but the LEDs' 3.3 V minimum leaves no guaranteed allowance for negative rail tolerance and transient droop. Test the MCU and farthest LED supplies during radio activity, display refresh, full-white transitions, low battery and source changes. Record color errors and recoverability as well as brownouts.

The four-hour runtime requirement has no measured workload or selected capacity behind it yet. Define one representative event workload, then measure complete-badge active and storage current. Include radio reconnection, failed network attempts, NFC standby, accessories and the post-event state. Low-voltage handling must leave enough energy for an orderly display update and storage transition.

USB500 is now selected for both inputs. Test depleted/absent-battery startup and operation while charging; establish the supported USB-source policy. The 500 mA charger setting is an input ceiling, not a complete USB attach/current-policy implementation or a promise that charging and every load can run at full demand simultaneously.

Evidence: [power decisions](../design/power.md), [LED record](../components/WS2812C-2020-V6.md), [specification](../spec.md).

### Prototype qualification: IR supply and assembled RF

Separating IR reception from accessory faults is useful. Its new supply path is TCA9534 P1 → 100 Ω → receiver, with 4.7 µF plus local bypass. Qualify output voltage, enable/disable inrush and startup pulses; a GPIO output should not be treated as an ideal switched rail. The receiver specifies a 2.7 V minimum and 0.7 mA maximum no-signal current. This is an unclosed qualification item, not a demonstrated failure.

The NFC copper-window defect is fixed. Coil tuning and phone reads remain necessary with the cell, display, case, fasteners and wearer present. Likewise, qualify the ESP32 antenna with the nearby display and shoulder geometry. Electrical clearance checks do not establish radio range.

Evidence: [peripheral contract](../design/peripherals_contract.json), [TI TCA9534 datasheet](https://www.ti.com/lit/ds/symlink/tca9534.pdf), [Everlight receiver datasheet](https://www.everlighteurope.com/custom/files/datasheets/DMO-0000008.pdf), and the NFC check evidence above.

## Physical findings

### High priority for the fit prototype: make the buttons usable while worn

The A/B switches are about 3 mm inside the outer wall, reached through approximately 7 × 3.8 mm openings. There are no plungers. These dimensions create a credible risk of fingernail-only operation, especially when the badge moves on its lanyard.

Print the control edge first and test it with several people while worn. My preferred correction, if direct access is awkward, is two distinct captive plungers with controlled travel and an overtravel stop. Keep reset recessed. Verify that B can be held while reset is pressed for recovery; also explain the bootloader behavior if B is held during power-on or a brownout.

Evidence: [enclosure source](../../mechanical/enclosure/build.py), [enclosure review](../../mechanical/enclosure/review.md), [switch record](../components/SKSCLBE010.md).

### Treat thickness, retention and assembly as product requirements

The housing is 116 × 86 × 19.5 mm before screw heads and exposed features. It is a substantial object on a lanyard. The dimensions alone do not establish discomfort, but justify a full-size weighted mockup before refining cosmetics. Check swinging, flipping, sitting at a table, snagging and readability on different bodies and clothing.

Nominal clearances are encouraging: about 0.98 mm above the glass and 1.5 mm behind the battery allowance. Neither is a tolerance budget. Select the actual cell, leads, insulation and retention method, and verify glass support against the panel supplier's permitted regions. Check what prevents the panel from shifting when the badge is inverted or dropped; the current shelves establish support, while final retention remains open.

Four separate front support posts, pads, two plates, the frame, optical barrier and battery guides make the prototype serviceable but potentially fiddly to assemble in quantity. Time one complete assembly and one battery/display replacement before committing to a fleet. Keep the enclosure shape; simplify loose parts only where the trial shows a benefit.

### Open LED windows are a sensible direction

The LEDs already provide color, and the A2 openings remove unnecessary inserts. Test brightness, viewing angles and distinguishability in the actual clear cover. The transparent plate can also conduct or scatter light into the ambient/IR region; verify the barrier with LEDs at full brightness and the IR transmitter active.

Prove cable overmold, Qwiic and SAO insertion clearance with real mating parts. A component envelope fitting inside the case does not establish room for a finger, latch or add-on. The rear dock opening is still an access well, not a designed cradle: seating, polarity, contact force, short protection and wear need a one-slot prototype.

## Product UX and fleet operations

### High priority: complete one loaner journey

The arrival proposal is substantially more developed than the rest of the experience. It addresses authenticated links, assignment races and manual-code fallback. Return, reuse, profile changes and organizer recovery remain partly open.

Define and rehearse these outcomes before expanding interaction features:

| Moment | Required user-visible result |
|---|---|
| Pick up | A badge visibly identifies itself as available and shows a scannable claim code plus manual fallback. |
| Claim | Phone distinguishes assignment accepted, badge updating, and badge ready. Slow/offline delivery does not look like a successful display update. |
| Wear | Name is immediately readable; role and interests have a plain-text explanation; button actions have immediate feedback. |
| Lose connection | Existing name and local controls remain useful. The badge avoids repeated disruptive refresh/reconnect behavior. |
| Exchange contact | Recipient and shared fields are explicit. Nearby candidates cannot be silently substituted. |
| Return | A confirmed return clears association, local personal data, persistent display content and any attendee-specific NFC record. It reports completion only after cleanup. |
| Prepare next event | An organizer can distinguish available, assigned, update pending, returned/cleared, charge needed and failed badges. |

Two power pads plus dock-presence sensing do not identify a slot's badge or acknowledge a wipe. Choose a concrete authenticated radio/USB or organizer-assisted return mechanism, including venue-network failure. A dead or interrupted badge needs a recovery path before reassignment. Personal badges need a separate path that preserves owner preferences.

### High priority: distinguish external power, charging and readiness

The status LED is green under external power, and all indicators are intentionally dark during storage, even while charging. Those meanings do not tell an organizer whether a loaner is ready. Moreover, BQ24074 CHG remains asserted during a temperature pause; CHG alone cannot support an accurate charging/fault display.

Keep dark storage if desired, but provide a reliable status-on-wake or dock/fleet view. Define what evidence supports “ready,” “charging,” and “needs attention.” If detailed temperature-fault reporting is required, the present exposed signals need an observability review. Avoid displaying an uncalibrated battery percentage.

Evidence: [power-status contract](../spec.md), [current pinouts](../pinouts.md), [TI BQ24074 datasheet](https://www.ti.com/lit/ds/symlink/bq24074.pdf), §9.3.6.

### Make the core experience obvious

The strongest first release is identification, a few understandable interests, dependable check-in/return and an easy experiment path. Keep BLE/IR encounter inference optional until the basic experience works in a room of people.

Three role lights and five affinity lights need a simple visual vocabulary. Use text on the display or profile page to explain their meaning; do not require people to memorize color combinations or distinguish red from green. Test long names at conversational distance and keep secondary detail from shrinking the name. NFC taps should have a marked target and a QR alternative: the current rear tap face can require lifting or turning a worn badge.

Define the two-button map, brightness override and confirmation feedback together. Slow e-paper updates make immediate LED feedback valuable. Loaner reset/contact sharing should require clear intent, and experimenting with firmware should have a documented return to the event image.

## Release and cost coherence

The production package now matches the final PCB. The enclosure's stored manifest still pins `7b6ea0e6…`; its datums match and this review's fresh scratch fit check passes, but the maintained package should be regenerated against the chosen release. The inspected local web manifest represents an older first-routing snapshot (`dafa93e9…`). This is a local artifact finding; the live deployed site was not inspected.

Before ordering or publishing the next review bundle, align PCB, schematics, enclosure, BOM, assembly drawings, downloads and web assets to one revision. Resolve the outstanding independent footprint reviews and human visual review. Keep current circuit decisions separate from historical narratives so firmware authors do not reuse removed circuitry or obsolete initialization instructions.

Set a complete unit-cost and assembly-time target: PCBA, display, protected cell, hand soldering, enclosure, fasteners, lanyard, provisioning, test and a share of dock cost. Supplier stock checks and a component BOM do not answer whether personal badges can be offered affordably or a loaner pool can be maintained efficiently.

## Recommended next work

1. Select the exact pack; close its autonomous thermal-protection limits. Independently audit and dry-fit the display connection and new footprints.
2. Build a weighted enclosure mockup with real buttons, display/flex and connectors. Decide plungers, retention and assembly sequence from that trial.
3. Bring up a small engineering batch with a defined load/runtime/storage test and power/RF/optical measurements.
4. Rehearse claim → wear → optional exchange → return → clear → charge → reissue, including offline and interrupted cases, with a small group.
5. Freeze a coherent revision and establish total cost and assembly effort before scaling the fleet.

No native design or existing documentation was changed by this review. Added files are this review and its evidence.
