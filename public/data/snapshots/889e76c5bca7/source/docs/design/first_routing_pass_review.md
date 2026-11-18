# First PCB routing pass

10 November 2026. The user approved routing after reviewing the initial published placement and approved the R2 notch tip. This is an **incomplete engineering checkpoint**, not a fabrication release.

Board SHA256: `dafa93e938c3cc8b44d3bd1bc96028d27d44f320e9012c124e3212df88432e70`  
Project SHA256: `1ccd83ba5d61f6923840064d6fe5a6f83db74da29f9d65713d34fe9e23741966`  
Native CAD/checks: KiCad 10.0.8. Published starting point: commit `1809844`, board `ddf824f2a59bc82568bbb03bcb3f89959f2ee12638b380790207739273c1844d`.

## What changed

- Added the approved **R2 convex notch tip**, tangent at (155,102) and (157,100), with center (157,102). The existing R0.5 concave corner remains. The outline stays 110 × 80 mm, with no component or antenna-keepout move.
- Kept the user-visible anchors fixed: the LEDs, shared passive optical group, buttons, USB, Qwiic, display, battery allowance and module. C202 rotates 180° at the same center. C511, C512 and R508 move locally to shorten accessory-switch support paths. Full native inverse-transform comparison confirms these are the only four footprint changes.
- Added local decoupling/ground fan-outs, two continuous inner GND planes, deliberately sized power distribution, battery sensing and protected ordinary digital paths. The result has **1258 tracks, 328 through vias and two GND zones**.
- Added eleven targeted GND return vias after reviewing layer changes. They shorten avoidable return detours near SPI and RGB transitions; they are not a blanket via grid.
- Recovered display chip select, NFC field-detect, boot/recovery and the rear GND test point in a bounded cleanup. The rear +3V3 test point is still unconnected.

Local support poses (x/y in mm; rotations in degrees):

| Reference | Previous pose | Routed pose | Purpose |
|---|---|---|---|
| C202 | 118.5,108.8,0° | 118.5,108.8,180° | Face the MCU supply pin without moving the capacitor center. |
| C511 | 192,151,0° | 193,154.65,90° | Shorten the accessory-switch bypass connection. |
| C512 | 192,148,0° | 193.8,151.3,90° | Bring bulk capacitance closer to the switch supply. |
| R508 | 187,154,0° | 197.925,158.3,270° | Shorten the current-limit resistor connection. |

The preserved pre-routing source and review are under `history/2026-11-10-before-routing/`. The native board is authoritative; staged routing trials were not merged blindly.

## Stackup and rules

The provisional fabrication reference is [JLC04161H-7628](https://jlcpcb.com/impedance), nominal 1.6 mm, 1 oz outer / 0.5 oz inner copper. The source layer values sum to 1.5862 mm and are retained as published: outer copper 0.035, prepreg 0.2104, inner copper 0.0152, core 1.065, inner copper 0.0152, prepreg 0.2104, outer copper 0.035 mm. This is an engineering baseline, not a fabrication order or impedance qualification.

F.Cu and B.Cu carry signal/power traces. In1.Cu and In2.Cu are GND reference planes. No signal tracks use the inner layers or cross the radio/NFC voids. The future rear NFC coil remains unimplemented and its all-layer exclusion remains intact.

`routing_constraints.json` records exact net assignments and routing profiles. Ordinary digital traces use 0.20 mm and 0.60/0.30 mm vias. Major supply trunks use 1.0 mm where practical, with 0.8/0.4 mm through vias and paired transitions on the new long trunks. Short pad escapes and low-current taps are narrower. The source global minima, rule severities and empty DRC-exclusion list are unchanged. Exact fine-pitch lands require 0.15 mm intrinsic clearance in the main-power/NFC classes; wider separation remains preferred outside escapes.

USB width/gap settings are placeholders. No 90 Ω calculation or pair routing was accepted. Exact USB ESD land-pattern acceptance and fabricator geometry remain prerequisites.

## Electrical and return-path review

- Converter feedback takes a separate Kelvin spur directly from the lower-right portion of C108's output land. It does not share copper with outgoing load branches outside the capacitor land. Its off-center but perpendicular pad entry is a deliberate Kelvin exception.
- Converter MODE/AGND and the feedback return connect locally to PGND. Charger exposed-pad ground reaches VSS through exterior copper; no new open via is placed in an assembly paste land. Ground returns were reinforced locally, while thermal/stencil qualification remains open.
- R120 remains wired to hold charger CE high. Charging is disabled. Local BAT bypass and the VSYS/input-output paths checked in this pass are actually connected, not merely assigned the same net.
- Both filled inner GND layers remain single connected regions. Targeted return vias connect to both planes. Sampling of signal centerlines found no reference-gap crossings outside expected local via antipads; this is a bounded geometry check rather than electromagnetic simulation.
- The long BAT_ADC route has no new close same-layer clock/RGB run in the reviewed pass. A short filtered-button parallel segment is 2.94 mm long at 0.417 mm edge separation. The low-impedance Kelvin supply-sense spur has 3.87 mm of adjacent I2C at 0.403 mm; EPD_EN runs beside FB for 2.10 mm at 0.5245 mm. Preserve these as prototype noise checks rather than infer quiet behavior solely from DRC.
- The shared nominal 3.3 V LED rail remains the accepted prototype supply-tolerance experiment. Wide traces do not guarantee that every LED stays above its specified minimum during radio/display/LED transients.

## Checks and visual review

Final native results:

- **48 unconnected-item reports**, down from 390 in the published unrouted board. This is a native report count, not a percentage of completed nets or a claim that the board can operate.
- **Five unchanged geometric findings:** four USB footprint NPTH-to-pad clearance errors (0.1944 mm versus 0.25 mm) and the existing module silkscreen/notch-edge warning. No new geometric violation was introduced or excluded.
- **Nine missing-footprint parity reports**, exactly the recorded unresolved references. Complete pad/net signatures and footprint property/model records are preserved, apart from the four authorized support poses.
- ERC remains zero errors and one documented LIS2DW12 warning. Contracts/property checks pass for 179 components, 576 endpoints and 30 NC endpoints. The 24 repository checker/button regression tests pass; the selective-routing workflow also passed its focused preservation and via-in-pad tests.
- All added copper stays within the board and outside the radio/NFC exclusions. No copper was added to NC nets. New through vias avoid SMD copper/paste lands, including same-net assembly lands.

Fresh native layer SVGs, top/rear 3D previews, overview and circuit close-ups are in `../../exports/pcb-review/first-routing/`. Actual images were inspected for outline shape, plane continuity, sensible fan-out, power transitions, the converter/charger region, the accessory switch and the optical group. Long runs mainly use horizontal/vertical/45° routing. Short perpendicular branch taps and constrained local escapes remain; a final visual refinement belongs with completion of the remaining connections.

The current preview shows review envelopes for the raised glass, battery and optional socket. They do not qualify final height, tolerance, flex motion or assembly access. Earlier static functional-block annotations are historical; the next web snapshot must regenerate all geometry and callouts from this pinned board.

## What remains

Six ordinary digital connections remain congested after bounded attempts: **I2C_SDA twice, I2C_SCL, CHARGER_CHG_N, CHARGER_PGOOD_N and EXP_UNUSED_P6**. They require further local escape work; they are not missing-part holds.

Other unfinished connections include the +3V3 test point; accessory power/pull-ups; USB/dock supply and presence-control branches; mux/charger control wiring; and intentionally held USB, display-boost/high-voltage and NFC networks. `../../exports/pcb-review/first-routing/remaining-connections.json` preserves the exact native endpoints for the next pass. Do not treat every deferred connection as blocked only by an unassigned footprint.

The nine absent footprints remain: U105 exact TPD4E05U06DQAR package variant, J102 protected-pack connector, J103 dock contacts, J104 optional thermistor interface, L101 exact 0.47 µH power inductor, J301 display FPC mating/contact side, L301 exact 68 µH display inductor, AE501 NFC coil/tuning and J502 keyed SAO socket. Resolve the corresponding source/mechanical gates before completing those interfaces.

Final current/thermal sizing, passive MPNs/effective capacitance, USB/ESD and hotplug behavior, display flex and support stack, optical isolation, battery safety, NFC tuning and assembled radio performance remain open. In particular, the glass remains only 3.5 mm behind the ESP antenna, below the recommended 15 mm surrounding clearance. The R2 edge does not improve that RF limitation.

**Next review:** inspect this routing checkpoint and complete the remaining connections and exact-part decisions. Then repeat native checks, visual review and prototype qualification before issuing manufacturing outputs.
