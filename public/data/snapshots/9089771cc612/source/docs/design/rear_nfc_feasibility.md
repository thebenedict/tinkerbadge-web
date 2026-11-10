# Rear NFC antenna feasibility

10 November 2026. Read-only CAD assessment of the current 110 × 80 mm placement. This note does not change the antenna reservation, placement plan, libraries, or board.

## Recommendation

**Yes: put the eventual PCB coil on B.Cu if that suits the appearance. Keep U503 and its tuning components on the front so the coil itself adds no rear SMT assembly pass. This does not, by itself, free the corresponding front area for electronics.**

For the immediate placement iteration, preserve the existing x182..200 / y166..179 mm reservation. It is already an all-four-layer reservation, despite its review footprint being anchored on F.Cu. Nonconductive front artwork or an NFC tap symbol can occupy that visual patch; front copper artwork, components, metallized labels and conductive finishes cannot be assumed harmless.

If reclaiming the front electronic placement area is the actual goal, evaluate a **separate ferrite-backed flex antenna on the rear**, with the ferrite between the antenna and PCB/battery and a clear rear-facing phone approach. Qualify that stack before releasing the current reservation. No coil, ferrite, flex connection or read range is selected by this assessment.

## Verified starting point

The native board read initially matched SHA256 `08b5de1ac1b194544ebf15598fd0b40e66a4e0c05123c6da75603a769d91554e`.

- KiCad 10.0.8 reports four copper layers, nominal 1.6 mm board thickness and zero tracks.
- All 164 schematic-linked non-test electrical footprints are on F.Cu. The six rear test pads do not require rear component placement.
- MECH_NFC is anchored at F(191,172.5). Its rule polygon is x182..200, y166..179: 18 × 13 mm, 234 mm². Native inspection confirmed prohibitions on tracks, vias, pads, zone fills and footprints on F.Cu, In1.Cu, In2.Cu and B.Cu. It contains no implemented coil.
- U503 is F(191,163.5); the two tuning footprints C507/C508 are F(188,164) and F(195,164); local C506 is F(194,161.5). These are useful nearby starting positions, not a finalized RF feed layout.
- The rear battery allowance is 35 × 55 × 7 mm at (154,147.5), giving x136.5..171.5, y120..175. It is not an exact selected pack.
- The raised display glass occupies x109.35..202.65, y110..164.9, with a proposed 4.5 mm underside height.
- The fixed affinity LED centers remain x108,131.5,155,178.5,202 at y174.

Geometry comes from the native board and the current [placement review](pcb_placement_review.md), [mechanical review](compact_one_sided_mechanical_review.md) and [specification](../spec.md). No new DRC or RF measurement was performed because there is no CAD change.

## Manufacturer facts

These statements are manufacturer guidance. The following sections apply engineering judgment to this badge.

- **NXP TN00042, rev 1.0, §4.2.2, p9:** placing an antenna directly on a metal plate or ground plane prevents communication; isolation requires distance and/or ferrite. This supports a conditional on-metal solution, not an absolute ban on metal at every distance. [NXP PDF](https://www.nxp.com/docs/en/engineering-bulletin/TN00042.pdf).
- **NXP AN11276, rev 1.8, §6.2, p37:** the NTAG203F Class 6 reference uses ferrite foil for a metal environment. It is evidence for the architecture, not an interchangeable antenna for the selected NTAG I²C plus. §§2.1 and 4.2 include the LA/LB connection and connection/coil capacitance; §4.2.1 gives 14.5 MHz as a nominal single-tag design starting point, not a universal final target. Its introduction recommends testing every intended reader. The 25 × 20 mm Class 6 boundary in §5.1.4 is not a minimum coil size or proof that this 18 × 13 mm reserve works. [NXP PDF](https://community.nxp.com/pwmxy87654/attachments/pwmxy87654/nfc/6155/1/AN11276.pdf).
- **ST AN2972, rev 10, §§3.4.1–3.4.3, pp13–16:** short chip-to-antenna connections are recommended; planes overlapping the antenna and a surrounding shorted conductive loop are problematic. A dedicated antenna region is preferred. Nearby conductive surfaces reduce inductance, raise resonance and reduce Q. This is corroborating inductive-tag layout guidance for ST parts, not an exact-part NTAG specification. [ST PDF](https://www.st.com/resource/en/application_note/an2972-how-to-design-an-antenna-for-dynamic-nfc-tags-stmicroelectronics.pdf).
- **Würth ANP022, §§2 and 4.2, pp2/4:** permeability and loss depend on frequency; its NFC example puts ferrite between coil and metal, with thickness affecting tuning. A shield material must be selected for this application rather than merely being called ferrite. [Würth PDF](https://www.we-online.com/components/media/o109046v410%20ANP022c%20EN.pdf).

The exact chip evidence remains [NT3H2111W0FHKH component facts](../components/NT3H2111W0FHKH.md), the archived [datasheet](../datasheets/NT3H2111W0FHKH.pdf), and its [source/hash record](../datasheets/NT3H2111W0FHKH.source.json). The external application notes above were consulted online, not added to the controlled datasheet inventory in this read-only assessment.

## What a rear copper coil changes

A copper loop is fabricated with the PCB. It does not require pick-and-place, stencil or reflow on its side. Keeping the tag IC, bypass and tuning pads on F.Cu preserves the present single-front-SMT intent; connect LA/LB with short, deliberate via transitions and an appropriate coil crossover. Include all feeds, vias and crossover capacitance in tuning. Do not add a gratuitous long cable or assume a 50-ohm antenna interface.

The present blanket rule would also prohibit the intended coil and feed. During antenna implementation, replace it with reviewed rules that permit only the antenna network while excluding unrelated routing and pours. Do not simply flip MECH_NFC or remove its front/inner restrictions.

For the unshielded baseline, retaining an exclusion through the board under the coil and its aperture is the prudent project choice. Its exact perimeter margin and permitted nearby conductors are design/measurement questions. This is not a claim that every possible trace or small part inevitably disables NFC. A measured design may permit exceptions; an untested placement should not depend on them.

At 13.56 MHz this is chiefly magnetic near-field coupling. Nearby metal produces induced currents, losses and detuning; treating a battery or ground plane as a useful radio-style reflector is misleading. Moving copper through 1.6 mm of FR4 does not make those surrounding conductors disappear.

## Larger rear zone and edge options

The battery allowance leaves a nominal 38.5 mm strip to its right, x171.5..210 over y120..175. This is a mechanical projection, not an RF-clear area. Native front footprints in that projection include the display boost/output capacitors, accessory circuitry, U503 and its support; the FPC/USB region, Qwiic connector and right-side mounts also constrain it. Much of that strip lies beneath the raised display. The panel/FPC conductive construction and final metal hardware still require review.

Within the existing lower reserve, the nominal battery gap is 10.5 mm horizontally and glass gap 1.1 mm vertically. Those are coordinate differences, not approved RF clearances. Enlarging left/right toward the fixed affinity LEDs or upward under display/support electronics introduces new metal and clearance dependencies.

A larger bare rear loop therefore needs a newly agreed all-layer/assembly window, not just available B.Cu. A narrow lower-edge loop or a full board-perimeter loop is also a new antenna design: the fixed LED pads, power/data routes, battery, ground and structural hardware remain in or near its flux path. A perimeter loop enclosing the existing ground/battery is not automatically better than the small reserved loop. Do not enlarge or cut the board, move LEDs, or fragment the main reference planes solely on this assessment.

A larger flex antenna on a plastic rear cover is the more credible route to recover front placement freedom. It can be placed outboard of ferrite that separates it from PCB conductors. Placement beside the battery is preferable to introducing avoidable battery-stack constraints. A position over the battery is possible only with an approved mechanical stack, insulation, swelling allowance and strain relief; no sharp attachment or pressure on the pouch.

## Ferrite stack and sourcing

For rear taps with front circuitry behind the antenna, the intended order from the phone inward is:

**Phone → nonmetal rear cover → flex coil → specified ferrite/insulation → PCB and/or battery metal.**

A ferrite sticker on the outward face of an integral B.Cu coil is on the wrong side to isolate that coil from front/inner PCB copper. It may address a different rear-side metal object, but it does not authorize filling the board underneath with copper. Ordinary FR4 cannot hide an added ferrite layer between B.Cu and the inner planes without changing the construction.

A separate flex/ferrite assembly adds thickness, adhesive/retention, connection cost, tolerances and another assembly operation, though not necessarily a second PCB SMT reflow. Ferrite can alter inductance and losses, so existing tuning values cannot be carried over unverified.

For a sourcing investigation, use NFC-rated low-loss magnetic material with permeability/loss characterized at 13.56 MHz. [TDK's selection guide](https://product.tdk.com/en/products/selectionguide/noise-suppressing_magnetic-sheet.html) distinguishes NFC material families from generic EMC absorbers. [Würth WE-FSFS](https://www.we-online.com/en/components/products/WE-FSFS) provides 13.56 MHz properties, adhesive sheets and dimensional variants. These are source families, not approved part choices or verified stock.

Before selection, record exact material/MPN, thickness including adhesive/protection, lateral coverage and cut tolerances, magnetic-property curves, temperature/mechanical limits, flex/cable design and assembly process. Verify supplier availability and controlled documentation. Obtain either a bare antenna compatible with the selected dynamic tag or a deliberately approved new subsystem; a generic finished NFC sticker with its own IC is not a drop-in MCU-programmable antenna.

## Phone approach and qualification gate

A rear copper layer does not inherently force rear-only reading: an unshielded loop with a clear field path can couple from either face. This must be tested. A ferrite/metal-backed rear assembly should instead be designed and marked for a rear approach; do not promise reliable front taps through the display, board planes and battery.

Rear-facing taps may require lifting or turning a worn badge. Check that user journey, phone coil alignment, hand placement, body/clothing loading, enclosure, cords, screws and any metal clips in the assembled prototype. Avoid predicting a read distance from area or an ideal LC equation.

Before releasing front space:

1. Define the intended tap face, practical target-phone set and read/write success criteria.
2. Choose the antenna architecture, mechanical location and complete stack, including actual battery and display.
3. Prototype coil/ferrite variants; measure impedance, resonance and losses in the final stack, not only an unloaded coil.
4. Tune with the exact NTAG, feeds and component tolerances. Check phone reads/writes and passive reading with badge power absent.
5. Test worn/unworn orientations, nearby hands/metal, active display/LED/radio conditions and assembly variation.
6. Update the antenna footprint, keepouts, source records and placement review only after review of those results.

**Immediate decision:** rear copper is feasible and compatible with front-only SMT, but preserve the existing reserve until a separately qualified rear antenna arrangement actually replaces it.

## User decision

On 10 November 2026 the user selected an integral rear-copper coil with the front antenna area kept clear. This is recorded in `pcb_placement.json`. Keep the tag and tuning parts front-side, retain the inner-layer and surrounding-metal clearance and qualify the final coil/feed/tuning. The current native all-layer reservation remains unchanged pending antenna implementation. A ferrite-backed flex is an alternative, not the selected architecture.
