# Independent enclosure review

11 November 2026. **Pass for the nominal geometry checks below; physical fit and manufacturing acceptance remain open.**

The selected direction is a clear front/back sandwich with a printed stepped frame. The review used the native board, component records, and independently reconstructed board geometry. No electronics or placement were changed.

## Reviewed inputs

- Native `tinkerbadge.kicad_pcb`: SHA-256 `7b6ea0e61d1b97d6fb4b8665112096e6f28ca91348ab3617c9fafc7cb11dd688`.
- `build.py`: SHA-256 `10b2a82544f6234bf48b28f82aee67f9de687a1a0d23dfdb5aa8863515b96de1`.
- `parameters.json`: SHA-256 `8f9fd655556a134481f2f20d377dc9a1fc53a308c59d162709a77b850ad53148`.
- KiCad 10.0.8; build123d 0.10.0; cadquery-ocp 7.8.1.1.post1.
- Source basis: [specification](../../docs/spec.md), [current implementation](../../docs/design/implementation_status.md), [display connector](../../docs/components/FH34SRJ-24S-0.5SH.md), [switch](../../docs/components/SKSCLBE010.md), [optical placement](../../docs/design/shared_passive_optics_review.md), and the native component bodies/courtyards.

## Checks performed

Run `python check_native_fit.py` with the CAD environment. The script invokes KiCad Python to read the source, reconstructs the exact native Edge.Cuts arcs and lines, and prints a revision-bound JSON report. It does not modify the board. It refuses a changed board or changed enclosure inputs during the check.

| Check | Result |
|---|---|
| Printed perimeter frame | One connected valid solid |
| Native PCB against enclosure parts | No positive-volume intersection |
| Expanded native board outline at PCB mid-thickness | 0.59 mm lateral allowance fits, including the stepped shoulder |
| Fifteen named body envelopes against enclosure parts | No intersection: glass, SAO body/key, display connector, IR receiver, Qwiic, USB, ESP32, battery allowance, and three switch bodies/actuators |
| Low optical divider against native front courtyards | No overlap using a 1.5 mm-high screening prism |
| Long role-light opening to SAO opening | 1.55 mm clear-panel web |
| Battery allowance to rear panel | 1.5 mm nominal space |
| Display top to front-panel underside | 0.98 mm nominal space |

The implementation was revised during review to remove a PCB/frame clash at the stepped tip, make the rear bosses part of one connected frame, provide an ESP32 antenna relief, clear the glass with the optical liner, separate the right diffuser flange from the SAO body, and widen the web between the long diffuser and SAO openings. Separate front posts allow the PCB to be inserted onto its rear seats before the front cover is fitted.

The body tests use documented conservative envelopes, not complete vendor solids. The courtyard screen identifies potential low-wall interference; it does not supply missing component heights. The generator separately checks B-rep validity, STEP round trips, closed STL meshes and intersections between enclosure parts.

## Fit-prototype work

- **Display support:** The four removable posts have provisional shelves for compliant pads under the glass border. Confirm the panel's permitted support/adhesive areas, pad compression, deflection, and flex/latch assembly motion. The cover must not preload the glass.
- **Battery:** Preserve the native pack allowance at z = −1.6 to −8.6 mm, immediately behind the PCB, with the rear-panel inner face at −10.1 mm. The NTCs are on the PCB front; no rear thermistor clearance is required. The nominal 1.5 mm rear space does not establish safe swelling clearance, insulation, attachment strength or thermal coupling through the PCB. Select and measure the complete pack, leads and connector before fixing retention.
- **Controls:** A/B use recessed access openings, with the actuators about 3 mm inside the outer wall. Verify fingertip or fingernail operation while worn. The approximate switch model does not establish a precise actuator-center height for production plungers. The reset pinhole and B/BOOT combination also need a physical recovery test.
- **Optics:** The receiver/ambient-sensor and emitter openings are separated from the continuous clear plate. Establish the actual visible/940 nm transmission, opaque barriers, leakage, field of view and RGB interference. The older approximately ±30° estimate used a lower aperture plane and is not a result for this cover.
- **Fasteners and lanyard:** M2 screw envelopes reserve the passages. Select actual heads, lengths, nuts and material; keep the Ø4.5 mm head/boss envelope near the glass. Verify cord threading, smooth edges and load transfer through the board/frame rather than the display.
- **Ports and dock:** Prove cable overmold clearance, Qwiic seating, SAO mating/add-on clearance, and battery-disconnect access. Rear dock access is a recessed opening; a guided, polarity-safe cradle and pin stroke are still to be designed.
- **Radio and NFC:** Mechanical non-interference does not qualify RF performance. Test the complete enclosure, fasteners, battery, display and cords, including rear-face NFC tapping while worn.

No physical prototype, process tolerance study, full component-solid interference review, or human visual acceptance was performed by this review.
