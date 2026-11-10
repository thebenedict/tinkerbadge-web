# Schematic implementation

9 November 2026. Native KiCad 10 development schematic, with five circuit sheets and an overview. The project has 179 electrical components, including support passives and explicit unpopulated options. The source contracts contain 576 physical-pin assignments.

## Open the project

Open `tinkerbadge.kicad_pro` in KiCad 10, then its root schematic. Double-click a sheet box to enter a block. Project-local symbol libraries use `${KIPRJMOD}` paths. KiCad standard libraries are also required.

PCB placement is tracked separately in [the current placement review](pcb_placement_review.md). The active board is the experimental 110 × 80 mm front-SMT candidate, with a raised display, organized circuit groups, evenly spaced top LEDs, a shared passive ambient/IR-receiver cluster below the display with a separately isolated transmitter and a left-open antenna shoulder. The selected NFC plan is a B.Cu coil with front/inner clearance and front-side tag/tuning components; no coil geometry exists yet. It is unrouted and awaits human placement review and RF/flex/part qualification. No board-release conclusion follows from schematic verification.

## Current build decisions

This section supersedes conflicting candidate choices in the earlier planning BOM. Source inventory and circuit calculations are linked from [project pinouts](../pinouts.md).

| Planning ID | Current reference | Decision |
|---|---|---|
| PWR-04 | D101, D102 | SMF6.0A input TVS replaces the unresolved SMF12A candidate. Sustained fault-current and surge testing remain open. |
| PWR-05 | U102, R120, J104 | BQ24074 power path retained. CE is held high by fitted R120, so onboard charging is disabled. J104 optional cell-contact thermistor connection is initially unpopulated. |
| PWR-06 | U103 | TPS63802 set to nominal 3.3 V, shared by logic and all eight LEDs. Feedback is 56.0 kΩ / 10.0 kΩ, both 0.1%. |
| PWR-07 | U104 | One TPS22918 switches the e-paper rail. Additional separate LED/NFC switches are not fitted. |
| PWR-08 / PWR-09 | J102 | Protected ordinary two-wire 1S, 4.2 V-charge LiPo pouch pack. Exact pack, connector, polarity, ratings and capacity pending. Former LP603450/three-pin Molex combination is reference evidence only. |
| PWR-14 | Q101, Q102 | Independent USB/dock presence sensing uses AO3400A devices and resistor dividers. Q103 also inverts mux status for the charger input-current mode. |
| PWR-15, retired | — | U106 TLV75733 and its dedicated C110/C111 are removed by the single-rail decision. Earlier analyses are retained only as design history. |
| PWR-16 | U107 | Added TMUX1511PWR to isolate the protected battery ADC divider when MCU power is absent. Full loaded divider ratio is 3.2:1. |
| MCU-01 / MCU-03 | U201, TP201–TP206 | Exact ESP32-S3-WROOM-1-N16R8, native USB, EN/BOOT/UART recovery pads. GPIO35–37 are unavailable. No everyday power switch. |
| DISP-01 / DISP-02 | J301 | ED037TC1-associated raw-panel interface. AYF532435 remains a physical connector candidate only; J301 has no footprint until mating orientation is proven. |
| DISP-04 | Q301 | SI1308EDL-T1-GE3 follows the manufacturer's replacement notice for the older BE3 suffix. |
| DISP-06 | U301 | Added SN74LVC541APWR Ioff-rated buffer for five MCU-to-panel signals. Exact TSSOP20 mapping verified. |
| UI-02 | D401–D408 | Eight exact WS2812C-2020-V6 share nominal +3V3 with direct MCU data. The user accepted a first-prototype supply-tolerance experiment, with the tests below required. |
| PWR-13 / UI-03 | D409, SW401, SW402 | Independent red/green status LED and two Alps SKSCLBE010 side-actuated, 2.2 N buttons. Four physical switch terminals retain direct wake-capable MCU inputs. Footprint, enclosure and continuous-bias application qualification remain open. |
| EXP-03 | U505 | One shared TPS2553DBVR accessory switch. Combined normal accessory allowance is provisionally 50 mA; fault-current budget 155 mA. |
| EXP-06 | U506 | Added TCA9534PWR status/control expander, address 0x20, to preserve the N16R8 GPIO budget. |
| NFC-01 | U503, AE501 | NT3H2111W0FHKH remains on 3.3 V; PCB antenna and tuning require layout and RF validation. |

The status of an electrical decision is separate from procurement and footprint approval. All newly selected exact active parts have archived source PDFs and component records. Routine passive values/packages are specified; exact MPNs, DC-bias capacitance, magnetic saturation and assembly availability are not complete.

## Single-rail prototype decision

The user chose the simpler, lower-cost **single nominal 3.3 V rail for the first prototype**, including the eight addressable LEDs. This choice is implemented in the schematic and contracts, not only in these notes. The former higher rail and logic LDO are removed. Local LED decoupling, chain bulk capacitance and regulator output capacitance remain.

The exact WS2812C-2020-V6 datasheet specifies **3.3 V minimum supply**. Regulator/feedback tolerance, distribution loss and load transients can put a nominal 3.3 V rail below that limit. The user accepts testing this boundary on prototypes; operation below 3.3 V is not a manufacturer-guaranteed pass. The static tolerance calculation and regulator capacity are in [power decisions](power.md).

Eight full-white pixels draw about **120 mA nominal**, before tolerance and controller overhead. The shared converter must also supply ESP32 radio peaks, display refresh, sensors, IR and accessories. Retain conservative brightness/load scheduling until the complete load envelope is measured. Removing the LDO reduces parts, dissipation and battery conversion loss, but puts LED current steps directly on the logic rail.

Test at the LED supply pins and MCU supply during cold startup, battery voltage sweep, Wi-Fi transmit activity, display refresh, all-black/full-white steps and source changes. Include low battery, the operating temperature range, intended simultaneous loads, repeated cycles and more than one LED lot. Check flicker, wrong colors, chain resets, ESP32 brownouts and recovery as well as voltage. Record board/BOM/firmware versions and scope setup. Bench success supports the tested prototype conditions; production qualification still needs a guaranteed rail/part envelope or explicit manufacturer acceptance. Revisit the rail or LED choice if behavior is unreliable.

## Initial battery and charging behavior

The optional sensor is not fitted, and a fixed resistor does not impersonate a cell-temperature sensor. A fitted 0 Ω link holds CE high. The badge can use the battery or external power path, but **cannot charge the battery onboard in this initial variant**.

Adding a thermistor alone is insufficient. The chosen pack's temperature window must be enforced by qualified hardware, including tolerance, attachment, missing/shorted sensor and reset/failure cases. Charge current and input-current limits also require verification before removing the disable. A typical 0–45 °C pack is not automatically protected by the charger's wider native TS window.

## Firmware contract

- Keep LEDs black during storage and initially during high-current radio/display work. Schedule load peaks and measure complete battery current; the present provisional target is at most 1 A, not a verified connector rating.
- Hold panel reset low during rail enable, initialize after settling, then refresh. Stop SPI and send the panel's sleep command before removing its rail. GPIO40 may power the rail during ROM recovery; the panel remains reset by its local pulldown.
- The TCA9534 starts as inputs. Set the output latch low before changing P2 to output; direction mask 0xFB. MCU-only reset does not reset this expander.
- Accessories are initially off. Make external I2C/GPIO pins high impedance and disable their internal pulls before switching accessory power off. This build does not support self-powered add-ons or live insertion.
- Respect NFC errata and recovery timing. Its standby current remains in the storage budget. Reconfigure sensors and motion wake deliberately for storage.
- Use calibrated ADC1 measurements with the 3.2:1 divider ratio and settling delay. Voltage alone is not battery state-of-charge. Control low-voltage sleep/restart above the chosen pack's endpoint.

## Verification and remaining gates

The independent source reviews are in `review_power.md`, `review_mcu.md`, `review_display.md` and `review_peripherals.md`. Native capture is checked against those inputs using exported KiCad netlists, a separate endpoint parser, ERC, connectivity validators and inspected PNG/PDF renders. The completed review snapshot, check scope and artifact hashes are recorded in [verification.md](verification.md). The selected Alps button source/capture amendment is linked there.

Before a PCB can be released:

- Qualify pack, cable polarity, charging safety hardware and all source transitions, including battery-free USB startup limits.
- Qualify the selected Alps buttons for the permanent-pull-up wake circuit: manufacturer KSC-701 p5 D11 cautions against continuously applied voltage. Preserve this prototype application gate, capacitive-load qualification and mechanical actuation/locating-hole checks; see [the component record](../components/SKSCLBE010.md).
- Finish exact footprint/pad/pin1 and connector mating acceptance. Power/peripheral footprints are deliberately blank where the physical checks are incomplete; selected MCU/display associations have separate acceptance records.
- Select inductors and passive MPNs. Test regulator capacity/temperature, the shared dynamic rail, display boost overshoot/inrush, current scheduling and accessory faults.
- Validate radio/NFC antenna layout, panel flex, glass/battery/enclosure fit, USB/ESD layout and test access.
- Measure normal, idle and storage current, source sensing, wake, low-voltage behavior and unpowered leakage/backfeed.
- Obtain human schematic/placement review before routing. Perform board connectivity/DRC and prototype validation on a pinned revision afterward.

Population fields need special care: the installed MCP cannot set KiCad's native DNP flag. Optional parts are identified in visible values, `Populate`/`Population` fields and source contracts. Do not export an assembly BOM without reconciling these fields and excluding unpopulated parts.
