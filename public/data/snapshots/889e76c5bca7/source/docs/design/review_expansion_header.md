# Independent review: expansion header

Reviewer: independent review agent; it did not write the record. Date: 12 November 2026. Record reviewed: [expansion_header.md](expansion_header.md), SHA-256 `9ff3c2bbc59961e6a790189fff476f16d794c1c6b0f26d8752adfe58733a5ca0` (the hand-off revision `247efd9f…c1a3` was superseded during the review; only its Footprint and Placement paragraphs changed). PDFs reopened: `esp32-s3_datasheet_en.pdf` v2.2, SHA-256 `2d5a7cb7fd559d8d972bd88db32669c0196d23f22d7afaafb0f63d099b589a3f`; `esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf` v1.8, `27d71971da07c280c6068d08c74720d1a25b8f20cf8494dc1765bdd28d40d435`; `TPS2553.pdf` SLVS841G, `edd76d150b073ae8d4addbf85f6845b8c722fbd0b35ef025ac3c9e704a6a3385`. Also consulted for check 3: `esp32s3-hardware-design-guidelines.pdf` (9 November 2026 build), `4b3f3a5b3c18b04dd89b2bfce5f6a038cd7574ccd3d54c79c5b4924a8ad9c8ad`. Placement was measured with pcbnew 10.0.8, `LoadBoard` only, on `tinkerbadge.kicad_pcb` at commit `c008fbd` (SHA-256 `2ab108d4…2757`). No CAD, contract or record was modified.

"Rendered" below means the page was rendered to an image and read; "text" means text search only. Chip and module PDF page numbers equal the printed page numbers. Hardware-guide PDF page = printed page + 3.

## Outcome

**PASS WITH CORRECTIONS** for proceeding to schematic capture. Every module pin, GPIO and net in the pin table is correct. Three source facts are wrong as written (GPIO42 reset state, the accessory current limit, the deep-sleep claim), the footprint paragraph does not state that the numbering is mirrored against the KiCad library part, and three existing vias collide with the proposed pads.

## Findings

| Item | Result | Source page inspected | Note |
|---|---|---|---|
| Module pins 4, 9, 24, 34, 35, 36, 37 | confirmed | Module p. 10 diagram, pp. 11–12 Table 3-1 (rendered) | 4 IO4/GPIO4; 9 IO16/GPIO16; 24 IO47/GPIO47; 34 IO41/GPIO41; 35 IO42/GPIO42; 36 RXD0 = U0RXD = GPIO44; 37 TXD0 = U0TXD = GPIO43. Table and diagram agree. |
| GPIO4 supply, reset state, functions | confirmed | Chip p. 16 Table 2-1, p. 23 Table 2-6, p. 24 Table 2-8 (rendered) | VDD3P3_RTC; At Reset and After Reset both blank; RTC_GPIO4, TOUCH4, ADC1_CH3. |
| GPIO4 power-up glitch | confirmed | Chip p. 18 Table 2-2, p. 19 note 1 (rendered) | Low-level output, 60 µs typical. |
| GPIO42 reset state | **corrected** | Chip p. 17 Table 2-1 (rendered) | MTMS: At Reset is blank; IE is in After Reset only. Supply VDD3P3_CPU is correct. |
| GPIO47 reset state and supply | confirmed, incomplete | Chip p. 17, p. 22 Table 2-4, notes 2–3 pp. 17–18 (rendered) | SPICLK_P = GPIO47, IE at and after reset. Supply is VDD_SPI/VDD3P3_CPU; the record omits it. |
| 1.8 V caveat, N16R8 at 3.3 V | confirmed | Chip p. 18 note 4, p. 13 Table 1-1; module p. 3 Table 1-1, p. 4 note 7, p. 12 note c (rendered) | Chip: R8V and R16V. Module: 1.8 V "for N16R16VA only". N16R8 has 8 MB octal PSRAM; ESP32-S3R8 is 3.3 V. |
| U0TXD/U0RXD reset state | confirmed | Chip p. 17, p. 22 (rendered) | WPU, IE in both columns. |
| ROM message default | confirmed | Chip p. 34 Section 3.3 (rendered) | UART0 and USB Serial/JTAG. |
| Strapping pins | confirmed | Chip p. 32 Table 3-1 (rendered) | GPIO0, 3, 45, 46. None of GPIO4, 16, 41, 42, 43, 44, 47. |
| JTAG source default | confirmed | Chip p. 35 Table 3-5 (rendered) | USB Serial/JTAG with all three eFuses 0; GPIO3 matters only with EFUSE_STRAP_JTAG_SEL = 1. |
| VIH max, absolute maximum | confirmed | Chip p. 64 Table 5-1, p. 65 Table 5-4 (rendered) | VDD + 0.3 V; power pins −0.3 to 3.6 V. |
| Drive strength, IOH, IOL, pulls | confirmed | Chip p. 18 note 5, p. 65 Table 5-4 (rendered) | 20 mA default; 40 mA and 28 mA typical at PAD_DRIVER = 3; 45 kΩ typical. |
| "GPIO4 is the only header pin that can wake" | **corrected** | Chip p. 17 (pin 22), p. 23 Table 2-6; module p. 11 (rendered) | GPIO16 (pin 5, SDA) is RTC_GPIO16 on VDD3P3_RTC. |
| TPS2553 reverse-voltage comparator | confirmed | TPS2553 p. 7 (rendered) | 95/135/190 mV; 3/5/7 ms, specified at VIN = 5 V. |
| TPS2553 limit, "109–152 mA" | **corrected** | TPS2553 pp. 16–17 equations 1–3, p. 7 (rendered); Table 9-2 pp. 20–21 (text) | 109.18–152.25 mA is 210 kΩ ±1 %. R508 is 200 kΩ (schematic, contract, implementation status): 114.7–159.4 mA, 135.3 mA nominal. Equations reproduced against the 226 kΩ table row. |
| 10 mA short or contention | confirmed | arithmetic | 3.3 V / 330 Ω = 10.0 mA; 11.0 mA at 3.6 V and −1 %. |
| "inside the default 20 mA drive strength" | confirmed, qualified | Chip p. 18, p. 64, p. 65 | Fair as a comparison. 20 mA is a drive setting, not a rating; the datasheet has no per-pin current maximum, only 1500 mA cumulative (Table 5-1). |
| ≈4 mA at 5 V | confirmed | arithmetic; chip text search for injection or clamp ratings found none | (5 − 3.6) / 330 = 4.2 mA. Applies to pins 2, 4, 6, 8, 9 only; SDA and SCL have no resistor. |
| ≈8 mA back-feed | confirmed | arithmetic | (3.3 − 0.65) / 330 = 8.0 mA with one diode drop; 10 mA is the hard bound. |
| Pins 1, 3, 5, 7 in Qwiic order | confirmed | `SM04B-SRSS-TB(LF)(SN).md`; contract J501; `pinouts.md` | J501 is 1 GND, 2 ACC_3V3, 3 EXT_SDA, 4 EXT_SCL. |
| 180° rotation | confirmed, incomplete | arithmetic | Pin n lands on pin 11 − n. Grounds 1 and 10 swap. Plug-in pin 3 lands on badge pin 8. See additional facts for the other pins. |
| Odd/even numbering, drill, pad | confirmed; handedness **corrected** | `PinHeader_2x05_P2.54mm_Vertical.kicad_mod`; `Conn_02x05_Odd_Even` | Library: pad 1 (0, 0) square, pad 2 (2.54, 0), pad 3 (0, 2.54); drill 1.0 mm, pad 1.7 mm. Pins 1 and 2 share a column. The record's front view is the mirror image of this footprint. |
| MCU net and module pin columns | confirmed | `mcu_contract.json`, `peripherals_contract.json`, `pinouts.md`, `mcu.kicad_sch`, `peripherals.kicad_sch` | U201.9 EXT_SDA, .34 EXT_SCL, .35 SAO_GPIO1, .24 SAO_GPIO2, .37 UART_TX, .36 UART_RX, .4 no-connect. |
| J503, R518–R522 unused | confirmed | all schematics, board, contracts, `pinouts.md` | R514–R517 were removed earlier and are not reused. |
| R415 part | confirmed | `mcu.kicad_sch`, `production/jlcpcb/bom-jlcpcb.csv` | Value 330, MPN 0603WAF3300T5E, LCSC C23138. Manufacturer name not checked. |
| Header body to D402, C403 | confirmed | pcbnew | 1.585 mm to the D402 courtyard (1.885 mm to its pads); 1.375 mm to the C403 courtyard (1.675 mm to its pads). |
| Board top edge | confirmed | pcbnew | Edge at y 100.00. Body 3.86 mm, pad copper 4.28 mm. J502 centre was y 105.0, so 1.4 mm lower is correct. |
| Glass edge "y 109.94" | corrected (minor) | pcbnew, `Review_Panel_Raised_4p5` | Glass rectangle top edge is y 110.00; 109.94 is the outer edge of its 0.12 mm drawing line. Body to glass 1.06 mm; pad copper to glass 1.48 mm. |
| Antenna "46 mm" | corrected (minor) | pcbnew, U201 | Module outline right edge x 139.00. Pad copper 45.07 mm, fitted body 44.65 mm; 45.92 mm is from the column 1 centre. Module keep-out rule area ends at x 154.00, 29.65 mm from the body. |
| NFC_WINDOW | confirmed | pcbnew | Rule area y 165.20–180.00; 56.3 mm below the body. |
| Rear probe-pad row "8 mm below" | confirmed | pcbnew | Row at y 116.00. 8.33 mm centre to centre from the bottom header row; 6.98 mm copper to copper. No rear footprint is nearer. |
| Battery allowance | confirmed | pcbnew, MECH_BATTERY courtyard | Right edge x 172.545, top edge y 118.955: 11.1 mm left of and 10.0 mm below the fitted body. |
| Footprints overlapping the ten pads | confirmed | pcbnew, all 173 footprints, both sides, courtyard and pad boxes | J502 only, which is being removed. |
| R518–R522 row at y 110.75 | confirmed | pcbnew | No footprint courtyard or pad overlaps. Courtyard top y 109.27: 0.33 mm from the fitted-header body, 0.08 mm from a ±0.25 mm header courtyard. Top resistor pad to bottom-row header pad copper 1.005 mm. Bodies span y 109.95–111.55, under the first 1.55 mm of the glass, whose underside is 4.5 mm above the board. |
| Vias near the new pads | **not confirmed** | pcbnew, 503 vias | Three conflicts; see corrections. |
| UART vias "within 2 mm" | confirmed | pcbnew | UART_TX via (183.318, 111.800) is 1.92 mm from the R518 centre. UART_RX via (187.411, 112.914) is 2.17 mm from the R519 centre and 1.34 mm from its lower pad centre. |

## Corrections required before capture

1. Source facts, GPIO42 row. Replace with: "GPIO42 is MTMS on VDD3P3_CPU with no input enable or pull at reset and input enabled after reset; GPIO47 is SPICLK_P on VDD_SPI/VDD3P3_CPU (selected by EFUSE_PIN_POWER_SELECTION and IO_MUX_PAD_POWER_CTRL), input enabled at and after reset." Source: chip Table 2-1 p. 17 and notes 2–3 pp. 17–18.
2. TPS2553 sentence. Replace "R508 sets a 109–152 mA fault limit" with "R508 (200 kΩ 1 %) sets a 115–160 mA fault limit (114.7 mA minimum, 135.3 mA nominal, 159.4 mA maximum)". In the electrical contract replace "about 110–150 mA" with "about 115–160 mA". Source: TPS2553 equations 1–3, pp. 16–17, with 202 kΩ and 198 kΩ.
3. Electrical contract, deep-sleep bullet. Replace with: "GPIO4 (RTC_GPIO4) and SDA/GPIO16 (RTC_GPIO16) are in the RTC domain; GPIO4 is the only one free of the I2C bus. GPIO41, GPIO42, GPIO43, GPIO44 and GPIO47 are digital only." Source: chip Table 2-1 pp. 16–17, Table 2-6 p. 23.
4. Electrical contract, power-up bullet. Add that SDA/GPIO16 (XTAL_32K_N) has the same 60 µs low-level glitch as GPIO4. Source: chip Table 2-2 p. 18.
5. Footprint paragraph. Add: "Seen from the front, this numbering is the mirror image of KiCad `PinHeader_2x05_P2.54mm_Vertical`; it equals that footprint fitted on the rear. A keyed or shrouded header fitted on the front has its own pin-1 mark at badge pin 2 or badge pin 9, not at the square pad." The library part on the front can only give pin 1 bottom left with the odd row at the bottom, or pin 1 top right with the odd row running right to left. `tools/create_expansion_header_footprint.py` describes its layout as the library part "turned"; it is mirrored.
6. Placement. Replace "1.0 mm from the glass edge at y 109.94" with "1.06 mm from the glass edge at y 110.00", and "46 mm from the module antenna" with "45 mm from the module antenna".
7. Placement. Record that three existing vias must be removed or moved when the socket connections are cut back: ACC_3V3 via at (189.600, 108.300), 0.60 mm, overlaps header pad 6 by 0.40 mm; SAO_GPIO2 via at (187.400, 108.850), 0.48 mm, is 0.09 mm from header pad 4; EXT_SCL via at (190.750, 111.800), 0.48 mm, is 0.035 mm from the lower pad of R520 and inside its courtyard.

## Additional facts the record should carry

- Rotated plug-in board, badge pin to plug-in pin: 1–10, 2–9, 3–8, 4–7, 5–6, 6–5, 7–4, 8–3, 9–2, 10–1. Badge ACC_3V3 (pin 3, limited only by U505) lands on the plug-in board's pin 8 signal while that board's supply pin sits on IO47 behind 330 Ω. Badge SDA and SCL, which have no series resistor, land on its pins 6 and 4. No combination exceeds a badge-side limit; the plug-in board's pin 8 circuit can see up to the 115–160 mA limit through its input protection.
- SDA and SCL are not current-limited against a short to pin 3 or an external driver. R512 and R513 limit only the pull-up path. Pins 3 and 5 are adjacent.
- GPIO41, GPIO42 (JTAG) and GPIO43, GPIO44 (UART0) are priority 3, "use with caution", in chip Section 2.3.5 p. 26 (rendered).
- In USB-OTG download boot the ROM sets MTMS/GPIO42 and MTDI/GPIO41 as inputs and drives GPIO40 high, GPIO39 and GPIO38 low. No header pin is driven. Hardware guide Table 12, PDF p. 22 (rendered).
- The hardware guide recommends a 499 Ω series resistor on U0TXD to suppress harmonics (Section 1.3.7, PDF p. 16, rendered). R518 is 330 Ω and is only in the header branch; TP205 has none.
- GPIO42 and GPIO47 have input enabled and no pull after reset. With a wire attached and nothing driving, they float; the guide recommends a pull or internal pull (Section 1.3.10, PDF p. 18, rendered). The same page states that only VDD3P3_RTC GPIOs can be controlled in deep sleep.
- GPIO4 is ADC1_CH3, so the ADC2/Wi-Fi restriction (chip p. 59, text) does not apply to it; it applies to SDA/GPIO16 (ADC2_CH5). The guide asks for a 0.1 µF capacitor at the pin for ADC accuracy and gives 0–2900 mV as the widest calibrated range (Section 1.3.11, PDF p. 21, text). No capacitor is planned.
- Which supply powers the GPIO47 pad on the N16R8 is not established by the PDFs. Read EFUSE_PIN_POWER_SELECTION on a prototype.
- The chip datasheet's only injected-current figure is the ±200 mA latch-up qualification in Table 5-13 p. 69 (text). It is a test condition, not an operating rating.
- `peripherals_contract.json` (U505 note, `accessory_calculated_fault_max_mA` 152.25, reserve 155 mA) and `TPS2553DBVR.md` ("Use RILIM 210 kΩ") still carry the 210 kΩ figures. With the fitted 200 kΩ the maximum is 159.4 mA, above the 155 mA reserve.

## Not checked

- Routing, ERC and DRC: nothing is implemented. Existing tracks, board-level silkscreen and graphics near the site.
- Label legibility, silkscreen clearances, enclosure fit, mating heights of fitted headers or housings against the glass, the 8.5 mm socket height in the record's rationale.
- ESP32-S3 Technical Reference Manual content (not in the repository): deep-sleep wake sources, pad hold, eFuse defaults.
- The Qwiic reference schematic and JST drawing were not reopened; Qwiic order was checked against the component record and contract only.
- "Uniroyal" as manufacturer of C23138; JLCPCB stock and hole or annular-ring capability.
- Firmware sequencing, bench tests, 800 kHz and SPI signal integrity through 330 Ω.
- Overlap tests used courtyard and pad bounding boxes, not exact polygons.

## Addendum: check of the applied change

12 November 2026, same reviewer. The corrections above were applied and the header was renumbered; this addendum checks the applied files. SHA-256 of the files checked: record `dab70c3f19b4019a6a38132862fc7323871901e21769991dfc73345c9adbe798`; `Tinkerbadge.pretty/Expansion_Header_2x05_P2.54mm.kicad_mod` `a3adabfc…e345`; `tinkerbadge.kicad_pcb` `3d141235…5283`; `.build/expansion_header.net` `2d5c2568…e26b`; `mcu.kicad_sch` `b24a5b6c…95e5`; `peripherals.kicad_sch` `6ee36f49…e825`; `peripherals_contract.json` `65e25e18…b393`; `mcu_contract.json` `aac6e5cb…cbdd`. Tools: pcbnew 10.0.8 with `LoadBoard` only on the working file; kicad-cli 10.0.8 netlist export, ERC and DRC on copies in a scratch directory. Only this file was written in the repository.

**Outcome: PASS.** The footprint, netlist, board and contracts match the record. No electrical discrepancy. Six minor items are listed below; none blocks placement approval.

| Item | Result | Note |
|---|---|---|
| 1. Handedness | confirmed | Project pads = R × library pads + t with R = [[0, −1], [1, 0]], determinant +1, t = (5.08, −1.27), residual 0 on all ten pads. That is a quarter turn clockwise seen from the front (KiCad Y down). Pad shapes, 1.7 mm pad and 1.0 mm drill are identical; pad 1 is square. |
| 2. Grid, pin table, pads, silkscreen | confirmed | Board coordinates, +x right, +y down: pad 1 (195.08, 105.13) top right; pad 2 (195.08, 107.67) bottom right; pad 9 (184.92, 105.13) top left; pad 10 (184.92, 107.67) bottom left. Front silkscreen: IO4, SCL, SDA, 3V3, GND above pads 9, 7, 5, 3, 1, no bottom-row labels, pin-1 triangle right of pad 1. Rear silkscreen: the same five, plus GND, IO47, IO42, RX, TX below pads 10, 8, 6, 4, 2, mirrored text, and `EXP 3V3 ONLY`. The record's grid and pin table agree with each other and with these. |
| 3. Netlist | confirmed | J503: 1 GND, 2 HDR_TX, 3 ACC_3V3, 4 HDR_RX, 5 EXT_SDA, 6 HDR_IO42, 7 EXT_SCL, 8 HDR_IO47, 9 HDR_IO4, 10 GND. R518 UART_TX to HDR_TX, R519 UART_RX to HDR_RX, R520 EXP_IO42 to HDR_IO42, R521 EXP_IO47 to HDR_IO47, R522 EXP_IO4 to HDR_IO4; pin 1 is the MCU side in each. U201.4 EXP_IO4, .24 EXP_IO47, .35 EXP_IO42, .36 UART_RX, .37 UART_TX, .9 EXT_SDA, .34 EXT_SCL. TP205 is on UART_TX and TP206 on UART_RX. Each HDR net has exactly two nodes. J502 is absent and no SAO net remains. A netlist re-exported from copies of the current schematics is identical (125 nets, 523 nodes). ERC: no errors, one unrelated warning (U502.3 with U103.6). |
| 4. Board | confirmed | J503: front, (190.000, 106.400), 0°, flagged DNP, excluded from BOM and from position files. R518–R522: front, 90°, y 110.750, x 195.08, 192.54, 190.00, 187.46, 184.92, each under the pin it serves, R522 under the pin 9/10 column; pad 2 at y 109.925 faces the header. Every pad net on the board equals the netlist, all footprints; DRC schematic parity reports 0 issues. No courtyard overlap: header to resistor courtyards 0.08 mm, nearest rear courtyard 5.8 mm (probe pads). No via, foreign-net track or foreign pad within 0.2 mm of any new pad on a layer it occupies. The three conflicting vias are gone (503 to 500). Inner ground planes are refilled: fill starts 0.20–0.30 mm from the eight non-ground holes. DRC: no clearance, short or courtyard violation; 14 open connections; 18 warnings, of which 6 are new dangling stubs from the cut-back (ACC_3V3, EXT_SCL, EXT_SDA twice, EXP_IO42, EXP_IO47) and 12 are already present at commit `c008fbd`. |
| 4. Distances | measured | Header body outline to the D402 courtyard 1.63 mm (pads 1.885 mm), to the C403 courtyard 1.42 mm (pads 1.675 mm), to the glass edge at y 110.00 1.06 mm. Nearest foreign copper to resistor pads: R520 pad 1, 0.325 mm (EXT_SCL track, F.Cu); R521 pad 1, 0.639 mm (UART_RX via); R522 pad 1, 0.827 mm (UART_TX via); R518 pad 1, 1.54 mm; R519 pad 1, 1.59 mm; pad 2 of each, 1.0–1.58 mm (header pads). Nearest foreign copper to a header pad: 0.99 mm (EXT_SDA stub on B.Cu, pad 9). |
| 5. Corrections 1–4 and 6 | confirmed | 1: GPIO42 "not enabled at reset and is enabled after reset", GPIO47 supply stated. 2: 114.7, 135.3, 159.4 mA and "115–160 mA". 3: GPIO4 and GPIO16 both stated as RTC domain; see item 1 below for one word. 4: GPIO16 glitch stated in the source table and the contract. 6: glass 1.06 mm at y 110.00, 45 mm to the module outline, 30 mm to the keep-out. The new rear-fitted statement is also right: a keyed header on the rear has its pin 1 on badge pin 2 or pin 9. The rotation bullet still holds (pin n lands on pin 11 − n). |
| 6. Contracts | confirmed | `peripherals_contract.json`: J503 pins and R518–R522 pins as the record; J502 removed; SAO appears only in the revision note. `mcu_contract.json`: U201.4 EXP_IO4, .24 EXP_IO47, .35 EXP_IO42; GPIO map 4, 42, 47 likewise; pin 4 removed from the unused list. |

Still wrong or open:

1. Record, electrical contract: "GPIO41–44 and GPIO47 are digital only and cannot be held in deep sleep". The archived guide says only that VDD3P3_RTC GPIOs "can be controlled" in deep sleep (PDF p. 18). Nothing archived says digital pads cannot be held. Write "cannot be controlled in deep sleep".
2. Record, source table: ADC2_CH5 for GPIO16 comes from Table 2-8 p. 24, which the row does not cite.
3. Record, TPS2553 paragraph: it calls the component record stale, but `TPS2553DBVR.md` now leads with the 200 kΩ figures. `peripherals_contract.json` is still stale: U505 note "152.26mA", `accessory_calculated_fault_max_mA` 152.253332 and reserve 155 beside R508 "200k 1%". The record's open item covers the budget.
4. Schematic symbol J503 has `in_pos_files yes` while the board footprint is excluded from position files. KiCad's parity check does not flag it.
5. The 14 open connections are the 13 new ones plus a second EXT_SDA stub at pad 5: the removed socket pin joined two EXT_SDA segments, so MCU SDA does not reach Qwiic until pad 5 is routed. The record expects open connections.
6. Erratum to the review above: its courtyard distances came from pcbnew's courtyard bounding box, which is 0.05 mm larger than the courtyard polygon. Correct values are 1.63 mm (D402), 1.42 mm (C403), 11.15 mm and 10.06 mm (battery allowance). Pad, glass, via and antenna figures are unaffected. No conclusion changes.

Not checked in this pass: routing, label legibility, and the other documents changed in the working tree (BOM draft, implementation status, placement records, `pinouts.md` beyond the header rows).
