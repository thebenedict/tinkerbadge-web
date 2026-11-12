# Schematic implementation

11 November 2026, board revision 0.3. Native KiCad 10 development schematic, with five circuit sheets and an overview. After the [10 November design review](design_review_2026-11-10.md) and the fixes answering [the 11 November review](../review/response_2026-11-11.md) the project has 162 schematic components, including ten probe pads. Every part has a footprint. The board is fully routed and DRC shows no clearance, short or parity errors; see the review's check results.

## Open the project

Open `tinkerbadge.kicad_pro` in KiCad 10, then its root schematic. Double-click a sheet box to enter a block. Project-local symbol libraries use `${KIPRJMOD}` paths. KiCad standard libraries are also required.

PCB placement is tracked separately in [the current placement review](pcb_placement_review.md). The active board is the experimental 110 × 80 mm front-SMT candidate, with a raised display, organized circuit groups, evenly spaced top LEDs, a shared passive ambient/IR-receiver cluster below the display with a separately isolated transmitter and a left-open antenna shoulder. The NFC coil is a 10-turn B.Cu spiral. A rule area named `NFC_WINDOW` keeps zone copper off all four layers over the winding and down to the bottom board edge, a custom design rule rejects unrelated tracks and vias there, and `tools/check_nfc_window.py` measures the saved copper. The 10 November board did not have this clearance: its inner planes covered the coil. The [first routing pass](first_routing_pass_review.md) added the R2 tip, power/analog wiring, digital paths and inner ground planes. The design review then added the missing footprints, moved the SAO socket to the front and the battery connector to the rear, and completed the open connections (48 to 0); its results section lists the native check output. RF, flex, optical and assembled-board qualification remain. No board-release conclusion follows from schematic verification.

## Current build decisions

This section supersedes conflicting candidate choices in the earlier planning BOM. Source inventory and circuit calculations are linked from [project pinouts](../pinouts.md).

| Planning ID | Current reference | Decision |
|---|---|---|
| PWR-03 | U101 | TPS2121 with USB priority. Over-voltage supervisors unused (OV1/OV2 grounded); the charger's 28 V input rating and 10.5 V cut-off cover that case. Status output unused. |
| PWR-04 | D101, D102 | SMF6.0A input TVS replaces the unresolved SMF12A candidate. Sustained fault-current and surge testing remain open. |
| PWR-05 | U102, RT101, RT102 | PGOOD is unused (R115 removed). BQ24074 with charging enabled: CE tied low, about 270 mA (R113 3.3 kΩ), USB500 input limit for both sources (EN1 high, EN2 low). RT101 (10 kΩ) and RT102 (100 kΩ) are B3950 NTCs in parallel on the front of the board opposite the middle of the cell, 32 mm from the charger and 8–12 mm from the 3.3 V regulator and its inductor. Charge window 1.7–44.7 °C nominal, 0.0–48.4 °C over the charger's threshold and bias tolerance. |
| PWR-06 | U103, L101 | TPS63802 set to nominal 3.3 V, shared by logic and all eight LEDs. Feedback is 56 kΩ / 10 kΩ, 1%. L101 is Sunlord SWPA4020SR47NT. |
| PWR-07 | U104 | One TPS22918 switches the e-paper rail. Additional separate LED/NFC switches are not fitted. |
| PWR-08 / PWR-09 | J102 | Protected two-wire 1S, 4.2 V-charge LiPo pouch pack rated for at least 300 mA charge. J102 is a through-hole JST PH header on the rear, pin 1 positive. Exact pack and capacity pending; check polarity of every pack type. |
| PWR-14 | Q101, Q102, J103 | Independent USB/dock presence sensing uses AO3400A devices and resistor dividers. J103 is two rear 4 × 6 mm dock pads at 8 mm pitch. |
| PWR-15, retired | — | U106 TLV75733 and its dedicated C110/C111 are removed by the single-rail decision. Earlier analyses are retained only as design history. |
| PWR-16, retired | — | TMUX1511 ADC isolation removed. R127/R128 are a 1 MΩ / 1 MΩ divider with 100 nF (C116) straight to the ADC; ratio 2:1. |
| MCU-01 / MCU-03 | U201, TP201–TP206 | Exact ESP32-S3-WROOM-1-N16R8, native USB, EN/BOOT/UART recovery pads. GPIO35–37 are unavailable. No everyday power switch. |
| DISP-01 / DISP-03 | J301, L301 | ED037TC1-associated raw-panel interface on a Hirose FH34SRJ-24S-0.5SH(50), a top-and-bottom-contact equivalent of the panel's named Panasonic connector. It is centred on the glass at y = 137.45 and its pads are numbered in panel order for the folded flex; see [the component record](../components/FH34SRJ-24S-0.5SH.md). Dry-fit a real panel before ordering. L301 is Bourns SRN4018-680M. |
| DISP-04 | Q301 | SI1308EDL-T1-GE3 follows the manufacturer's replacement notice for the older BE3 suffix. |
| DISP-06, retired | — | SN74LVC541 buffer and its bias resistors removed. The MCU drives the panel directly; firmware drives SPI/DC/RST low before EPD_EN goes low. |
| UI-02 | D401–D408 | Eight exact WS2812C-2020-V6 share nominal +3V3 with direct MCU data. The user accepted a first-prototype supply-tolerance experiment, with the tests below required. |
| PWR-13 / UI-03 | D409, SW401–SW403, R415 | Independent red/green status LED and three Alps SKSCLBE010 side-actuated, 2.2 N switches on the left edge: A (GPIO2), B (GPIO0, which is also BOOT) and a reset switch on EN through 330 Ω, meant to sit behind a pinhole. Hold B and tap reset for ROM download. Four physical switch terminals retain direct wake-capable MCU inputs. Footprint, enclosure and continuous-bias application qualification remain open. |
| EXP-02 | J502 | SAO socket on the front top edge between D402 and D403. The footprint carries the socket's true 12.7 × 6.0 mm body, its 3.7 × 1.0 mm key on the top-row side, and an 8.5 mm-tall model. |
| EXP-06 | U506 | TCA9534 P1 powers the IR receiver (IR_RX_EN). P4–P7 are unconnected (R514–R517 removed); firmware drives them low as outputs. Direction register 0x09. |
| EXP-03 | U505 | One shared TPS2553DBVR accessory switch. Combined normal accessory allowance is provisionally 50 mA; R508 200 kΩ sets roughly 115–160 mA. |
| EXP-06 | U506 | Added TCA9534PWR status/control expander, address 0x20, to preserve the N16R8 GPIO budget. |
| NFC-01 | U503, AE501, C507 | NT3H2111W0FHKH on 3.3 V. AE501 is a rear 18 × 13 mm, 10-turn coil, estimated 1.7 µH in free space; C507 27 pF is the starting tuning value and C508 is the unpopulated trim. The coil's inner end is LA and its outer end LB. The rear face is the tap face and is marked. |

Every fitted part carries an LCSC number and manufacturer part in the schematic, checked against JLCPCB stock on 10 November 2026 (new and changed lines on 11 November). The display connector now has an archived source record ([FH34SRJ-24S-0.5SH](../components/FH34SRJ-24S-0.5SH.md)). The inductors, JST PH header and the two NTCs were chosen from manufacturer catalogue data and KiCad library footprints without the archived-PDF step used for the earlier parts; add their source records before release.

## Single-rail prototype decision

The user chose the simpler, lower-cost **single nominal 3.3 V rail for the first prototype**, including the eight addressable LEDs. This choice is implemented in the schematic and contracts, not only in these notes. The former higher rail and logic LDO are removed. Local LED decoupling, chain bulk capacitance and regulator output capacitance remain.

The exact WS2812C-2020-V6 datasheet specifies **3.3 V minimum supply**. Regulator/feedback tolerance, distribution loss and load transients can put a nominal 3.3 V rail below that limit. The user accepts testing this boundary on prototypes; operation below 3.3 V is not a manufacturer-guaranteed pass. The static tolerance calculation and regulator capacity are in [power decisions](power.md).

Eight full-white pixels draw about **120 mA nominal**, before tolerance and controller overhead. The shared converter must also supply ESP32 radio peaks, display refresh, sensors, IR and accessories. Retain conservative brightness/load scheduling until the complete load envelope is measured. Removing the LDO reduces parts, dissipation and battery conversion loss, but puts LED current steps directly on the logic rail.

Test at the LED supply pins and MCU supply during cold startup, battery voltage sweep, Wi-Fi transmit activity, display refresh, all-black/full-white steps and source changes. Include low battery, the operating temperature range, intended simultaneous loads, repeated cycles and more than one LED lot. Check flicker, wrong colors, chain resets, ESP32 brownouts and recovery as well as voltage. Record board/BOM/firmware versions and scope setup. Bench success supports the tested prototype conditions; production qualification still needs a guaranteed rail/part envelope or explicit manufacturer acceptance. Revisit the rail or LED choice if behavior is unreliable.

## Battery and charging

Charging is autonomous and enabled in hardware. RT101 and RT102 sit on the front of the board opposite the middle of the cell and feed the BQ24074 TS input. In parallel they act as a 9.09 kΩ B3950 part: the charger stops below about 1.7 °C and above about 44.7 °C nominal, 0.0 °C and 48.4 °C at the charger's threshold and bias corners. The hot corner is above a typical cell's 45 °C charge limit; see the [review response](../review/response_2026-11-11.md). Charge current is about 270 mA and the safety timer about 6.3 hours. Use a protected pack rated for at least 300 mA charge.

Measure on a prototype: cell-to-NTC temperature offset with the pack taped down, the actual trip points, termination with the system running, and behaviour with no battery fitted.

## Firmware contract

- Keep LEDs black during storage and initially during high-current radio/display work. Schedule load peaks and measure complete battery current; the present provisional target is at most 1 A, not a verified connector rating.
- Hold panel reset low during rail enable, initialize after settling, then refresh. Stop SPI and send the panel's sleep command before removing its rail. GPIO40 may power the rail during ROM recovery; the panel remains reset by its local pulldown.
- The TCA9534 starts as inputs. Write the output latch 0x00, then the direction register **0x09**: P0 (CHARGER_CHG_N) and P3 (ACC_FAULT_N) are inputs; P1 (IR_RX_EN), P2 (ACC_EN) and the unused P4–P7 are outputs driven low. An MCU-only reset does not reset this expander, so write both registers on every boot.
- The IR receiver is powered from expander P1 through R507, not from the accessory rail. Drive P1 high to receive and low to save its 0.4–0.7 mA; leave GPIO18 without a pull while it is off.
- Button B is GPIO0. It works as a normal active-low button and deep-sleep wake source after boot; held through a reset it selects ROM download mode. GPIO4 is unused.
- Accessories are initially off. Make external I2C/GPIO pins high impedance and disable their internal pulls before switching accessory power off. This build does not support self-powered add-ons or live insertion.
- Respect NFC errata and recovery timing. Its standby current remains in the storage budget. Reconfigure sensors and motion wake deliberately for storage.
- Drive EPD SPI, DC and RST low before taking EPD_EN low; the panel has no isolation buffer.
- Use calibrated ADC1 measurements with the 2:1 divider ratio. The divider is 500 kΩ source impedance behind 100 nF: sample slowly and average. Voltage alone is not battery state-of-charge. Control low-voltage sleep/restart above the chosen pack's endpoint.

## Verification and remaining gates

The independent source reviews are in `review_power.md`, `review_mcu.md`, `review_display.md` and `review_peripherals.md`. Native capture is checked against those inputs using exported KiCad netlists, a separate endpoint parser, ERC, connectivity validators and inspected PNG/PDF renders. The completed review snapshot, check scope and artifact hashes are recorded in [verification.md](verification.md). The selected Alps button source/capture amendment is linked there.

Before a PCB can be released:

- Qualify pack, cable polarity, charge temperature window and all source transitions, including battery-free USB startup.
- Qualify the selected Alps buttons for the permanent-pull-up wake circuit: manufacturer KSC-701 p5 D11 cautions against continuously applied voltage. Preserve this prototype application gate, capacitive-load qualification and mechanical actuation/locating-hole checks; see [the component record](../components/SKSCLBE010.md).
- Check the display flex against J301 with a real panel, and the library footprints for L101, L301, J102 and U105 against the exact part drawings.
- Assign passive MPNs. Test regulator capacity/temperature, the shared dynamic rail, display boost overshoot/inrush, current scheduling and accessory faults.
- Validate radio/NFC antenna layout, panel flex, glass/battery/enclosure fit, USB/ESD layout and test access.
- Measure normal, idle and storage current, source sensing, wake, low-voltage behavior and unpowered leakage/backfeed.
- Human visual review and tidy-up of the routing in KiCad, then prototype validation on one pinned revision. The [JLCPCB release note](jlcpcb_release.md) lists the order settings, part numbers and the three checks to make before ordering.

C508 carries the native KiCad DNP flag. J103 and AE501 are PCB features and are excluded from the BOM.
