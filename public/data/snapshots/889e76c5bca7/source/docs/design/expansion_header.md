# Expansion header

12 November 2026. The SAO socket (J502, EXP-02) is removed. An unpopulated 2 × 5, 2.54 mm header footprint (J503, EXP-05) takes its place on the front top edge, and Qwiic (J501) remains the plug-in accessory port. This record holds the pin order, the source facts behind it and the placement. Connections are maintained in the [peripheral contract](peripherals_contract.json) and the [MCU contract](mcu_contract.json).

The [independent review](review_expansion_header.md) checked the first version of this record against the original PDFs and passed it with corrections. Those corrections are applied below; the largest was the pin numbering, which was a mirror image of a standard header. The review's addendum then checked the applied footprint, netlist, board and contracts against this record and passed them.

## Why

Qwiic and SAO shared one I2C bus and one switched 3.3 V supply. The socket added two GPIOs, an 8.5 mm tall hand-fitted through-hole part, a split in the role-light window and an open mating check. Bare header holes keep the two GPIOs, add a third with analog and wake capability, add the serial console, and need no fitted part.

## Pin order

Pin numbers are those of a standard 2 × 5 header fitted on the front: the hole pattern is the KiCad `PinHeader_2x05_P2.54mm_Vertical` footprint rotated a quarter turn, not mirrored. Seen from the front, pin 1 is top right on a square pad, odd pins are the row nearer the top board edge, and numbers rise to the left.

Front view:

| | Column 1 (left) | 2 | 3 | 4 | 5 (right) |
|---|---|---|---|---|---|
| Top row | 9 IO4 | 7 SCL | 5 SDA | 3 3V3 | 1 GND |
| Bottom row | 10 GND | 8 IO47 | 6 IO42 | 4 RX | 2 TX |

| Pin | Silkscreen | Header net | Series part | MCU net | Module pin | GPIO |
|---|---|---|---|---|---|---|
| 1 | GND | GND | | | | |
| 2 | TX | HDR_TX | R518 330 Ω | UART_TX | 37 | 43 |
| 3 | 3V3 | ACC_3V3 | | | | |
| 4 | RX | HDR_RX | R519 330 Ω | UART_RX | 36 | 44 |
| 5 | SDA | EXT_SDA | | EXT_SDA | 9 | 16 |
| 6 | IO42 | HDR_IO42 | R520 330 Ω | EXP_IO42 | 35 | 42 |
| 7 | SCL | EXT_SCL | | EXT_SCL | 34 | 41 |
| 8 | IO47 | HDR_IO47 | R521 330 Ω | EXP_IO47 | 24 | 47 |
| 9 | IO4 | HDR_IO4 | R522 330 Ω | EXP_IO4 | 4 | 4 |
| 10 | GND | GND | | | | |

- Pins 1, 3, 5, 7 follow Qwiic order (GND, 3V3, SDA, SCL), the same as J501 pins 1–4.
- Ground is on opposite corners. A plug-in board fitted rotated by 180° keeps ground on ground. Its supply pin lands on badge pin 8, a series-limited GPIO. The badge's supply pin lands on the plug-in board's pin 8, and the badge's SDA and SCL on its pins 6 and 4; the badge is not overstressed, and what happens to the plug-in board depends on that board.
- GND, TX and RX are adjacent at pins 1, 2 and 4 for a three-wire serial adapter. TX and RX are named from the badge: TX is the badge's output.
- SAO_GPIO1 and SAO_GPIO2 are renamed EXP_IO42 and EXP_IO47. GPIO4 was an intentional no-connect and becomes EXP_IO4.
- TP205 and TP206 stay on UART_TX and UART_RX directly. The header is a 330 Ω branch, so the rear probe pads win any contention with a header accessory.
- A keyed header fitted on the rear uses the same holes, but its own pin numbers are then mirrored: its pin 1 falls on badge pin 2 or pin 9. The silkscreen names are correct on both sides.

## Source facts

ESP32-S3 Series Datasheet v2.2 (`esp32-s3_datasheet_en.pdf`, SHA-256 `2d5a7cb7…9a3f`), the module datasheet v1.8 recorded in [the module facts](../components/ESP32-S3-WROOM-1-N16R8.md), and the ESP32-S3 hardware design guidelines (`esp32s3-hardware-design-guidelines.pdf`):

| Fact | Source |
|---|---|
| GPIO4 is powered from VDD3P3_RTC, has no input enable or pull at reset, and carries RTC_GPIO4, TOUCH4 and ADC1_CH3 | Table 2-1 p. 16; Tables 2-6 and 2-8 pp. 23–24 |
| GPIO4 and GPIO16 (SDA, XTAL_32K_N) each drive low for about 60 µs during chip power-up | Table 2-2 p. 18 |
| GPIO16 is also in the RTC domain (RTC_GPIO16, ADC2_CH5) | Table 2-1 p. 17; Table 2-6 p. 23; Table 2-8 p. 24 |
| GPIO42 is MTMS on VDD3P3_CPU. Its input is not enabled at reset and is enabled after reset, without a pull | Table 2-1 p. 17 |
| GPIO47 is SPICLK_P, input enabled at and after reset without a pull, on VDD_SPI or VDD3P3_CPU as selected by eFuse and IO MUX | Table 2-1 p. 17; notes pp. 17–18; Table 2-4 p. 22 |
| GPIO47 and GPIO48 run at 1.8 V only on R8V and R16V chips; the N16R8 module keeps them at 3.3 V | Chip p. 13 and note p. 18; module pp. 3, 4, 12 |
| GPIO43 is U0TXD and GPIO44 is U0RXD, both with input and weak pull-up enabled at and after reset | Table 2-1 p. 17; Table 2-4 p. 22 |
| GPIO41 and GPIO42 (JTAG) and GPIO43 and GPIO44 (UART0) are listed as pins to use with caution | Section 2.3.5 p. 26 |
| ROM boot messages print on UART0 and USB Serial/JTAG by default | Section 3.3 p. 34 |
| Strapping pins are GPIO0, GPIO3, GPIO45 and GPIO46; none is on the header | Section 3 p. 32 |
| JTAG uses the USB Serial/JTAG controller by default; MTMS is a JTAG pad only when eFuses or the GPIO3 strap select pad JTAG | Table 3-5 p. 35 |
| In USB-OTG download boot the ROM makes GPIO41 and GPIO42 inputs and drives GPIO38–40; no header pin is driven | Hardware guidelines Table 12 |
| Input high level is at most VDD + 0.3 V; supply pins are rated to 3.6 V absolute. No per-pin current maximum is given | Tables 5-1 and 5-4 pp. 64–65 |
| Default drive strength setting is 20 mA; source current is typically 40 mA and sink current 28 mA at the strongest setting | p. 18; Table 5-4 p. 65 |
| Internal weak pull-up and pull-down are typically 45 kΩ | Table 5-4 p. 65 |
| Only VDD3P3_RTC pins can be controlled in deep sleep. ADC accuracy wants 0.1 µF at the pin; the widest calibrated range is 0–2900 mV | Hardware guidelines |
| The guidelines suggest 499 Ω in series with U0TXD to reduce harmonics | Hardware guidelines |

TPS2553DBVR (`TPS2553.pdf`, SLVS841G): the reverse-voltage comparator trips with OUT 95–190 mV above IN after 3–7 ms (p. 7). With the fitted R508 of 200 kΩ 1 %, equations 1–3 (pp. 16–17) give a current limit of 114.7 mA minimum, 135.3 mA nominal and 159.4 mA maximum. [The component record](../components/TPS2553DBVR.md) now leads with these figures. The 152 mA maximum and 155 mA reserve in the peripheral contract's rail interface were calculated for 210 kΩ and are stale; the contract lists this as unresolved.

Derived, not from a manufacturer table:

- A 330 Ω series resistor limits a 3.3 V pin shorted to ground, or two outputs in contention, to 10 mA, inside the default 20 mA drive setting.
- 5 V on a header signal pin exceeds the VDD + 0.3 V input limit. The resistor would hold the clamp current near (5 − 3.3 − 0.3) / 330 ≈ 4 mA, but the datasheet gives no injection-current rating, so 5 V signals are not supported. The rear silkscreen says `EXP 3V3 ONLY`.
- The resistor adds 330 Ω to the GPIO4 analog source impedance and limits a directly connected LED to a few milliamps.
- SDA and SCL have no series resistor, as on Qwiic: the bus needs its low level. A short from SDA to the adjacent supply pin, or an external driver on the bus, is limited only by the GPIO driver and the U505 current limit. Qwiic has the same exposure.
- GPIO42 and GPIO47 float after reset once a wire is attached; firmware or the accessory must define their level.
- The archived PDFs do not say which supply feeds the GPIO47 pad on this module. Both candidates are 3.3 V on the N16R8.

## Support parts

R518–R522 are 330 Ω 1 % 0603, the same part as R415 (0603WAF3300T5E, LCSC C23138), so the bill of materials gains no new line. J503 has no fitted part and is excluded from the bill of materials.

## Electrical contract

- Supply pin 3 is ACC_3V3 from U505, shared with Qwiic: 50 mA normal combined budget, 115–160 mA fault limit. No battery voltage or USB 5 V is on the header.
- SDA and SCL are the Qwiic bus. Their pull-ups go to ACC_3V3, so the bus is unusable while the accessory supply is off.
- All signals are 3.3 V. No self-powered accessories and no live insertion, as for Qwiic.
- Before ACC_EN goes low, firmware sets GPIO4, GPIO42 and GPIO47 low or high impedance without pulls, releases the external I2C pins, and stops driving UART0 TX if a header accessory uses it. TX idles high and would otherwise feed an unpowered accessory through R518, about 8 mA and at most 10 mA.
- TX carries the ROM boot log after every reset, and GPIO4 and SDA pulse low at power-up. An accessory on those pins must tolerate both.
- GPIO4 and SDA (GPIO16) are in the RTC domain. GPIO4 is the header's deep-sleep wake pin because it is free of the I2C bus. GPIO41–44 and GPIO47 are digital only and cannot be controlled in deep sleep.
- GPIO4 is on ADC1, so analog readings do not conflict with Wi-Fi.
- Firmware that keeps UART0 as a console should leave GPIO43 and GPIO44 on that function; they can be reassigned.

## Footprint

`Tinkerbadge:Expansion_Header_2x05_P2.54mm` is project-local: ten plated holes on a 2.54 mm grid, 1.0 mm drill, 1.7 mm pads, pin 1 square. These are the dimensions and the numbering of the KiCad library `PinHeader_2x05_P2.54mm_Vertical`, rotated so the rows run along the top edge. It accepts standard 0.64 mm square-pin headers, sockets and solid wire.

Labels are 1.0 mm text. The rear names all ten pins and carries `EXP 3V3 ONLY`. The front names the top row and marks pin 1; there is no room for bottom-row labels between the header and the display glass, so the rear is the complete legend.

## Placement

J503 is centred at (190.0, 106.4) on the front top edge between role LEDs D402 and D403, 1.4 mm lower than the socket it replaces so that the top-row labels clear the board edge. Rows are at y 105.13 and 107.67; columns at x 184.92, 187.46, 190.00, 192.54 and 195.08.

- A fitted 2.54 mm header body would span x 183.65–196.35 and y 103.86–108.94: 1.6 mm from the D402 courtyard, 1.4 mm from the C403 courtyard and 1.06 mm from the glass edge at y 110.00.
- The header pads are 45 mm from the module outline and 30 mm from the module keep-out area. The NFC window is 56 mm away.
- The nearest rear feature is the probe-pad row, 8.3 mm below. The rear battery allowance starts 11 mm to the left and 10 mm below the header, so header tails or a rear-fitted header do not reach the cell; wires routed across the rear need to be kept off it.
- R518–R522 sit in one row at y 110.75, each directly below the bottom-row pin it serves, under the top edge of the raised display glass. R522 (IO4) takes the free column under pins 9 and 10. The resistor courtyards clear a fitted header body by 0.33 mm.
- The UART_TX and UART_RX vias that feed TP205 and TP206 are at the left of the group; RX and TX are the two right-hand columns, so TX needs one layer change to pass RX when routed.

## Routing

On 18 November the user requested routing of the recorded placement. All 14 open connections are complete, including both halves of the Qwiic SDA path. The pads and existing probe points retain their assignments. See [electrical verification](verification.md#routed-pcb-04).

## Open items

- The A3 front plate provides access to the ten holes. Test wire exit and plug insertion on a physical assembly.
- No ESD parts are fitted on header or Qwiic signals; port ESD qualification stays open.
- The 330 Ω value is a first choice. Check WS2812-style 800 kHz data and any fast SPI use on a prototype before promising them.
- Accessory power budget: the 159.4 mA worst-case limit is above the 155 mA upstream reserve recorded for 210 kΩ. Restate the budget or change R508.

## Bench tests

- Short each header GPIO to ground and to ACC_3V3 while driven to the opposite level; confirm about 10 mA and no reset.
- With ACC_EN low and an accessory attached to TX, measure the current into the accessory rail and the rail voltage.
- Hold a header accessory on RX low and confirm the rear probe pads still reach the ROM downloader.
- Measure GPIO4 analog readings through R522 against a known source, with and without 0.1 µF at the pin.
- Confirm a fitted header and Dupont housings clear the display glass and the chosen enclosure.
