# Optical-group relocation review

**Pass for the saved placement delta and experimental development use.** The ambient sensor moves to the exposed shoulder immediately right of the MCU. The IR apertures occupy the exposed strip below the role LEDs, while their low-profile support circuitry uses space under the raised display. Retain the receiver's 180° orientation. Optical angular response, isolation and the finished mechanical stack remain qualification gates; human placement approval is required before detailed routing.

## Pinned files and scope

- Baseline board: `tinkerbadge.kicad_pcb`, SHA256 `08b5de1ac1b194544ebf15598fd0b40e66a4e0c05123c6da75603a769d91554e` at inspection.
- Saved candidate: `.build/optical-space-one-sided/tinkerbadge.kicad_pcb`, SHA256 `8fa1ac386d237944d634cd7b5be0ca3ad3188f87965fbee94499eb1a51859399`.
- Machine audit: `.build/optical_space_independent_audit.json`; reproducible independent checker: `.build/check_optical_space_independent.py`.
- Native KiCad 10.0.8 readback, native polygon intersections, full inverse-transform comparison, dependency hashing, archived datasheet diagrams and actual fresh render pixels were inspected. The reviewer made no board, project, schematic, library or model changes and did not invoke SaveBoard.

The original specification, routing guide, component records, peripheral footprint review and preceding placement reviews establish the scope. This pass changes placement only. NFC is separately planned as a **rear B.Cu coil with a projected front clearance area**. No antenna copper has been routed, and the existing front, inner and rear rule-area reservation is unchanged.

## Exact saved placements

All coordinates are millimeters; all twelve moved components remain on F.Cu.

| Reference | X | Y | Rotation |
|---|---:|---:|---:|
| U501 | 145 | 108.25 | 0° |
| C501 | 141.25 | 108.25 | 180° |
| C502 | 148.75 | 108.25 | 0° |
| U504 | 166 | 106.5 | 180° |
| C510 | 162 | 111 | 270° |
| C509 | 164.25 | 111 | 270° |
| R507 | 166.5 | 111 | 180° |
| D501 | 176 | 107.5 | 0° |
| Q501 | 176 | 112 | 0° |
| R504 | 176 | 116 | 0° |
| R505 | 172 | 112 | 0° |
| R506 | 172 | 115.5 | 0° |

The three role LEDs stay at X 160/180.5/201, Y 103 with 20.5 mm pitch. Their capacitors and all other component placements are unchanged. The ambient and IR group membership remains correct, including C501/C502 with U501 and C509/C510 with U504.

## Native preservation and geometric checks

Every one of the **186 complete footprints** was loaded independently, restored in memory to its baseline pose, serialized with KiCad's native formatter and compared as a parsed record. All match. Only item/attribute serialization order is normalized; ordered polygon vertices remain ordered, and no field, model, pad property or numeric tolerance is excluded.

This confirms unchanged values, fields, attributes, schematic links, nets, pad numbers and geometry, masks/paste, drills, graphics, models and footprint-owned rule areas. All board-level content outside footprints also matches, including all eight native groups, the outline, setup and any board-level geometry. Group sanity passes.

- 170 electrical footprints, including 164 front electrical components and six rear copper test pads; 568 pad primitives, 539 numbered.
- Four copper layers, zero tracks/vias. No routing was added.
- One valid closed 110 × 80 mm outline, bounds X 100..210/Y 100..180. The left-open antenna shoulder is unchanged.
- Zero positive-area collisions among all 177 front and nine rear native courtyards.
- All moved copper lies inside the actual outline and outside the radio/NFC keepouts. Minimum moved copper-edge gap is **0.875 mm at U501**, above the unchanged 0.5 mm rule. Pad polygonization uses 0.001 mm maximum error; board outline tolerance is 0.005 mm.
- Radio keepout intersection with board material remains 0 mm². The NFC reserve remains 234 mm² on board. Both retain their prohibitions on all four copper layers.
- All 54 staged dependency files checked match root, including project settings, local footprints/models, schematics and symbol libraries. All 167 model assignments resolve to 33 distinct model files.

The display glass is X 109.35..202.65/Y 110..164.9, with a proposed underside 4.5 mm above the PCB and upper glass surface about 5.42 mm. Native optical courtyard-to-glass gaps are **0.555 mm for U501, 0.705 mm for U504 and 0.755 mm for D501**. These are planar gaps, not field-of-view guarantees. C509/C510/R507/Q501/R504–R506 may extend beneath the glass because they are electrical support, not optical apertures. Qualify exact passive heights, solder allowance, display supports and deflection before assembly approval.

## Supply and routing implications

Measured pad-center distances in the saved candidate:

| Connection | Distance |
|---|---:|
| C501.1 to U501.1 VCC | 1.676 mm |
| C502.1 to U501.5 DVI | 1.600 mm |
| C510.1 to U504.4 VCC | 2.598 mm |
| C509.1 to U504.4 VCC | 2.826 mm |
| R507.2 to U504.4 VCC | 4.291 mm |

The receiver's rotated VCC pad faces its local filter. This is a reasonable starting arrangement for the manufacturer's close RC-filter requirement. It is not a completed low-inductance loop: route the bypass feed/return directly, place local capacitor ground vias, connect both receiver grounds, and keep IR-switching and RGB return pulses away from the receiver supply and ambient sensor. Keep the existing IR current-limiting values and duty restrictions. The unchanged role-LED bypass distances remain 1.601 mm.

The group has usable short escape directions, but no detailed escape trial, plane-return review or congestion proof was performed. Human approval remains necessary before routing.

## Optical review

### Receiver U504: retain 180°

The actual Everlight IRM-H638T/TR2 datasheet p1 photograph and p6 package drawing show a **top-facing** lens. A 180° in-plane rotation does not point it into the board or reverse its optical axis. The nominal body in footprint axes is 4 × 5 mm, with a 4.0 ±0.3 mm maximum-height dimension including the lens. The native courtyard includes its extended terminal lands; neither the courtyard nor the 4 mm-high rectangular visual envelope represents a lens cone.

The lens center is about 0.88 mm toward the pin-1/pin-4 side from the body center, based on the drawing's 3.38 mm center dimension and 5 mm body length. Native F.Fab simplifies this to 1 mm. At 180°, that point is therefore near Y 107.38; the following simple calculation conservatively uses the native Y 107.5. At 0°, its native position would be Y 105.5.

Datasheet p3 gives typical horizontal/vertical half angles of ±45° and refers measurements to the receiving-surface vertex. Treating the lens apex as a point at Z 4.0 mm:

- At 180°, a 45° ray toward the glass reaches Y 108.92 at Z 5.42, still **1.08 mm before the Y 110 glass edge**.
- At the minimum 3.7 mm apex height, the same nominal positional calculation leaves **0.78 mm**.
- Nominal center-ray glass occlusion starts near **60.4° from board normal** at 180°, versus **72.5°** at 0°. Both exceed the documented typical ±45° angle.

Thus the 180° choice reduces extra angular reserve but does not introduce a nominal ±45° center-ray obstruction. There is no source-supported reason to undo the useful VCC-facing rotation in this pass. These calculations do not trace rays across the complete curved lens or qualify the final positional, support, cover and assembly tolerances. Verify actual sensitivity with the display and enclosure installed. Keep the entire receiver outside the glass rather than relying on only 0.2 mm of nominal under-glass headroom above its 4.3 mm maximum height.

### Ambient U501 and emitter D501: oblique shadow is expected

The ROHM BH1730FVC datasheet p14 requires a light window covering at least the **0.8 mm diameter area** around the detector; the photodiode itself is 0.25 × 0.3 mm. The native sensor remains outside the glass, and its center is 1.75 mm north of the glass edge. Its 0.75 mm package-height maximum is from p19. The visual model is a plain body without the detector window.

A point-at-center example using Z 0.75 mm and the glass upper surface at Z 5.42 gives a southward geometric cutoff near **20.5° from normal**. Consequently, this layout must not be described as an unobstructed wide-angle ambient view. It can still serve room-light adaptation after final-enclosure calibration, but angular response depends on badge tilt and light direction. Cover-window area/transmission, self-light isolation and manual brightness override remain relevant.

D501 is a top-looking IR emitter with a 1.9 ±0.2 mm package height and a typical 120° full viewing angle. Its center at Y 107.5 is 2.5 mm north of the glass. Using nominal top height gives a corresponding point-center cutoff near **35.4° toward the panel**, inside the nominal 60° half-angle. The normal/front direction stays exposed, but part of its oblique emission toward the display is blocked. These examples use outer optical-face points rather than detailed internal optical paths and do not predict range.

Moving U501 farther from the role LEDs improves spatial separation; its nearest role-LED center is now about 15.9 mm away. This does not guarantee rejection of direct or diffuser-reflected badge light. Verify lux with RGB LEDs off/on over colors and brightness, and test IR-emitter interference with U501 and receiver saturation/self-interference. Preserve independent optical windows and suitable light barriers in the enclosure. No optical face should be moved beneath the opaque glass to make the component map look emptier.

## DRC and native visual review

The saved DRC report dated 2026-11-09 16:05:07 was inspected and compared with the prior saved DRC by finding type, severity and affected UUIDs. It contains the same four USB hole-clearance errors and one radio silkscreen-edge warning, plus 390 unconnected items and nine unresolved-footprint parity findings. Ignored checks are unchanged. No new courtyard, copper, mask, keepout or outline issue is reported. The reviewer independently checked geometry but **did not rerun the full DRC engine**; the board is not DRC-clean.

Actual pixels in all four new native PNGs under `exports/pcb-review/optical-space/` were inspected:

- `front-components.png`: U501 sits right of the MCU; IR parts form a clearer group below the role row. No new obvious component-body overlap. SHA256 `7383dc3ce97be06e3fdeda8149d7f2bb21e07c09aba06e912d91f3bf14249f43`.
- `front-with-display.png`: all three optical packages are exposed north of the display; most IR support is concealed beneath it as intended. Role and affinity rows remain exposed. SHA256 `021b4bb5efddd1d89ba070522caf96e39a865601cbc70ba03e37d7fd8418bef7`.
- `rear-with-battery.png`: battery/socket allowances and six test pads remain in place. The absence of a rendered coil reflects that the rear antenna is still only planned. SHA256 `01eb536d914da11b0c11772c3be39a9c291fe141a8a8952615a4742ec270afc5`.
- `raised-display-perspective.png`: the raised glass, optical strip and side interfaces agree with the checked placement. This oblique view also illustrates why the glass can shadow low optical packages. SHA256 `db2a24e2989ea3ea110efba85e5262f8508eacb24cc3e06056d1b3da85123b2c`.

The render models omit optical windows/lens details and the final cover, supports and flex. They establish composition and nominal fit, not optical or manufacturing acceptance. Existing experimental radio/glass clearance, NFC tuning/metal clearance, unresolved connectors/magnetics, exact part heights, flex/battery mechanics and manufacturing exceptions remain.

## Source records checked

- Everlight IRM-H638T/TR2, DMO-0000008 Rev3, 1 January 2025, pp1/3/6. Archived PDF SHA256 `6ba15dc59077b2a3357495e5cbfe9b68378a275ae1750e02e77f9d6f2663d22e`.
- Everlight IR67-21C/TR8, DIR-0000986 Rev3, 10 July 2013, pp1–3. Archived PDF SHA256 `8b0cafbc6c75a60d705c078c8027fea96162e198b8125909d2658e66738f527c`.
- ROHM BH1730FVC, Rev001, 8 June 2016, pp14/19. Archived PDF SHA256 `012d391bb2712fc3f22d6596e83ad49075e294dd797b5a40634467dc567d0572`.

The corresponding source JSON files retain manufacturer URLs. Freshly rendered p14/p19/p3 review images are saved under `.build/optical-review-*`; existing source p1/p6 and IR-emitter p2 pixels were also inspected.
