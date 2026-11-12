# Layered clear enclosure

The selected direction combines flat clear front and rear plates with a dark printed frame and the PCB's stepped shoulder. Revision A2 is a fit prototype around the current 110 × 80 mm board. The housing is 116 × 86 × 19.5 mm, excluding screw heads and the exposed antenna/socket.

## Parts and assembly

- Two 1.5 mm clear panels, four M2 screw passages, two aligned lanyard holes, and a printed perimeter frame.
- Rear PCB support bosses are part of the frame. Lower the board onto them, then fit the four separate front support posts. The posts carry provisional display shelves with 0.4 mm compliant pads. Verify the panel's permitted backing/support regions before fitting glass; the cover does not clamp the display.
- Open rounded windows expose the five lower RGB LEDs and the three upper role LEDs directly. The upper opening is split around the SAO socket. There are no separate LED inserts or light guides.
- Separate open apertures for the ambient/IR receiver and transmitter, with an opaque divider. The optical prototype uses open apertures; a later cover material needs visible/940 nm transmission testing.
- Left-side access for A/B and a recessed reset pinhole. Right-side USB and Qwiic openings plus internal flex clearance. The A/B recesses need a fingertip-access test; no button plungers are fitted in A1.
- Removable rear panel with battery locating rails and a dock access well. The pack allowance retains its native PCB position. Retain the cell with removable tape after selecting the exact pack. The rails do not compress the pouch.

Assembly order: fit the optical liner beneath the front plate; fit rear plate/frame and battery; place PCB on rear supports and connect battery; fit the removable front posts; connect and support the display; lower the front plate and install fasteners. Check cable paths, switch travel and the socket mating motion before tightening. Fastener shapes are clearance envelopes; select final screw lengths/nuts after the fit check.

## CAD and reproducibility

`parameters.json` owns dimensions. `interfaces.json` is extracted from the native PCB and records its SHA-256. `build.py` uses build123d/OpenCascade to generate named solid parts, an assembly STEP, individual STEP/STL files, front/rear DXFs, and the matching web GLB. CAD uses millimetres, x = PCB x − 155, y = 140 − PCB y, and z = 0 at the front PCB surface. GLB uses metres in the same axes.

Install `requirements.txt` in Python 3.12. Run `extract_interfaces.py` with KiCad's Python, then `python build.py` from this directory. The build refuses a changed PCB hash. Rerun the independent native fit check when geometry or PCB placement changes. `exports/enclosure-cad.zip` contains the generated CAD and source parameters.

The build validates each BREP, STEP round-trip volume, STL closure/winding, and part-to-part volume intersections. `exports/checks.json` lists the checks and pending physical work. These checks do not establish full component tolerance or insertion clearance.

## Fit work remaining

The exact battery, swelling allowance, cell-to-thermistor coupling, glass support regions, panel flex, cable boots, SAO insertion, printed tolerances, LED visibility and sensor angles need a physical prototype. The dock opening provides access to the PCB pads; the mating dock, guided seating, pin stroke and polarity protection remain separate work. Test radio and NFC performance with the case, cords, fasteners and battery fitted.
