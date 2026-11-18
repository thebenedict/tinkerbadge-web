# Schematic verification

> The snapshot below describes the 9 November schematic. The [10 November design review](design_review_2026-11-10.md) changed the schematic and board; and the [11 November review fixes](../review/response_2026-11-11.md) changed them again. The check results and exports in `exports/design-review-2026-11-11/` are the current evidence. The pinned files under `exports/` root are kept as the earlier snapshot.

Pinned development review snapshot, 2026-11-09. Open `tinkerbadge.kicad_pro`; the complete six-page review PDF is [tinkerbadge-schematic.pdf](../../exports/tinkerbadge-schematic.pdf).

## Results

| Check | Result |
|---|---|
| Complete root endpoint comparison | PASS: 179 components, 576 physical pins, 30 explicit NCs |
| Cross-sheet connectivity | PASS: each contract net is one actual exported KiCad net; no split same-name local nets |
| Declared component properties | PASS: exact declared MPNs, values, ratings, population, library IDs and footprints |
| Root ERC | 0 errors; 1 reviewed address-strap warning below |
| Checker regression tests | PASS: 12 endpoint tests, 7 property tests and 5 Alps-button tests, including deliberate failures |
| Archived source hashes | PASS: 44 inventory entries |
| Native input stability | PASS: source files and contracts unchanged throughout exports |
| Native project opening | Shared-3.3 V hierarchy opened in KiCad 10.0.8; this graphics revision was reloaded by KiCad for fresh netlist, ERC, PDF and PNG exports |
| Graphics-only comparison | PASS: all 179 component records, 141 named nets and 32 library physical-pin definitions unchanged |
| Review exports | Six PDF pages and six 3500-pixel sheet PNGs |
| Footprint completion | 81 unassigned footprints remain; listed in property-check.json |
| PCB checks | Outside this schematic snapshot; PCB preparation proceeds separately |

Initial electrical capture used Konnect MCP 0.12.1. The user-approved outlined-block revision used a bounded, structure-aware native-file transformation, with untouched source sections preserved and complete exported electrical equivalence checked. Exports used KiCad 10.0.8 through Konnect. Older-format files load and export correctly; no GUI conversion was saved. See the [graphics revision review](outlined_blocks_review.md) for scope and independent visual evidence.

Exact file hashes and check summaries are in [manifest.json](../../exports/manifest.json). This pins the native sheets, project libraries, reviewed contracts, verification code, source inventories and delivered exports. The export-time [native-inputs.json](../../exports/native-inputs.json) records stable inputs before and after generation. A subsequent edit requires fresh checks and exports.

## Reviewed ERC warning

U502 pin 3, SDO/SA0, has a generic bidirectional electrical type and is tied to +3V3 from U103 VOUT. The LIS2DW12 is configured for I²C: CS pin 2 is high and SA0 pin 3 selects address 0x19. ST DocID029682 Rev 4, page 9, Table 2 and footnote 1 establish this mode and address input. The warning is retained in [erc.json](../../exports/erc.json), with no global suppression or weakened symbol type.

## Independent evidence

- [Power source revision](review_power_single_3v3.md) and [native capture](power_capture_review.md).
- [Processor source review](review_mcu.md) and [native capture](mcu_verification.md).
- [Display source review](review_display.md), [native capture](display_capture_review.md) and [package correspondence](../components/display_library_acceptance.md).
- [Peripheral source review](review_peripherals.md), [Alps button amendment](review_alps_buttons.md), [capture evidence](peripherals_capture_review.md) and [independent final capture](peripherals_independent_capture_review.md).
- [Endpoint checker review](contract_checker_review.md) and [property checker review](property_checker_review.md).
- [Outlined-block revision](outlined_blocks_review.md), including independent visual reviews of all five circuit sheets and full before/after electrical comparison.

The endpoint checker reads the independently exported KiCad netlist, not native source. It compares every physical reference/pin/net assignment and the actual identity of nets across sheets. It detects missing/extra components, missing/extra/duplicated pins, wrong connections, merged or split nets, and absent NC markers. It does not validate values or analog behavior.

The separate property checker compares only explicitly declared fields. Full hidden support-component specifications remain in the native files alongside readable displayed values. Power's trace, visible values and specifications also received 235 independent field comparisons. Generic passives, unassigned footprints and missing procurement decisions are not converted to passes by either checker.

Fresh sheet renders were inspected for legibility, field/wire collisions, labels, NC markers and block flow. The overview shows the actual single-rail decision; power and lighting notes preserve its bench-test gate. The five circuit sheets now contain 24 labeled Transit-style outlined functional groups. Titles, field positions and nearby branch geometry were adjusted for clearance and checked against the original electrical circuit. The final lighting revision identifies the selected Alps buttons. The PDF is derived from the same stable native snapshot.

## Decisions and remaining gates

The [implementation status](implementation_status.md) owns current decisions and release gates. In particular:

- All eight WS2812C-2020-V6 LEDs share nominal +3V3 with logic. Regulator tolerance and transients can fall below the LED's 3.3 V minimum. This is the user-approved first-prototype experiment; startup, low battery, radio/display activity, load steps and temperature/lot tests remain mandatory.
- The two-wire protected LiPo interface is retained; its exact pack, cable polarity and connector remain to be qualified. J104 optional cell-contact thermistor is unpopulated. Fitted R120 keeps onboard charging disabled until compatible hardware temperature limits and charging behavior are qualified.
- SW401/SW402 use the selected Alps SKSCLBE010 side-actuated switches as prototype candidates. KSC-701 page 5 D11 cautions against continuously applied voltage, while the badge has permanent pull-ups. Manufacturer clarification or biased-life qualification, exact footprint acceptance and enclosure actuation fit remain open; see the [component record](../components/SKSCLBE010.md).
- Finish unassigned footprints, exact passive and inductor choices, display flex mating, antenna/layout, power/thermal/fault tests and human schematic/placement review.
- DNP options use explicit values and `Populate`/`Population` metadata because native DNP control is unavailable in the installed MCP. Reconcile those fields before generating any assembly BOM.

No board-placement, routing, manufacturing or production-qualification conclusion is included in this schematic review.

## Expansion header change, 12 November 2026 (placement stage)

Revision 0.4 in progress: SAO socket J502 replaced by the unpopulated expansion header J503 and R518–R522. Design input: [expansion header record](expansion_header.md) and its [independent review](review_expansion_header.md). The review's addendum checked the applied footprint, netlist, board and contracts against record SHA-256 `dab70c3f…e798` and netlist `2d5c2568…e26b` and passed them. Its four minor items were then applied: three wording corrections in the record (now SHA-256 `b3142a2b…4b75`) and the J503 symbol's position-file flag, which changes the exported netlist to SHA-256 `faf92b35…76ba` without changing any connection. The checks below were rerun after that. Tools: KiCad 10.0.8 (`kicad-cli` and bundled Python). Inputs: `tinkerbadge.kicad_pcb` SHA-256 `3d141235…5283`; footprint `Expansion_Header_2x05_P2.54mm` SHA-256 `a3adabfc…e345`.

Passed:

| Check | Result |
|---|---|
| ERC, all severities | 0 errors; 1 warning, the documented LIS2DW12 SDO/SA0 pin-type warning, unchanged from revision 0.3 |
| Netlist against the four block contracts (`check_schematic_contracts.py`) | PASS: 167 components, 523 endpoints, 23 intentional no-connects |
| Schematic properties (`check_schematic_properties.py`) | PASS |
| Netlist difference from the revision 0.3 publication netlist | J502 removed; J503 and R518–R522 added; U201.4, .24, .35, .36, .37 and TP205/TP206 renamed to EXP_IO4, EXP_IO47, EXP_IO42, UART_RX, UART_TX; no other endpoint changed |
| Expansion sheet content, compared without regard to item order | Only the J502 items removed and the header block, its labels, notes and one library symbol added |
| DRC with schematic parity | 0 errors; schematic parity 0; 18 warnings, of which 12 are the revision 0.3 set and 6 are the ends of tracks cut back at the header area |
| Footprint against KiCad `PinHeader_2x05_P2.54mm_Vertical` | Same pattern rotated a quarter turn, not mirrored; 1.0 mm drill, 1.7 mm pads, pin 1 square |
| Board pad nets against the netlist | 538 pads, 0 mismatches |
| Silkscreen label nearest each header pad | Matches the pin's signal: top row on the front, all ten on the rear |
| Fresh exports inspected | Processor and expansion schematic pages; front and rear renders, header close-ups and the annotated group views in `exports/pcb-review/expansion-header/` |

At the 12 November placement checkpoint there were 14 unrouted connections, all on the header group nets (ACC_3V3, EXT_SDA twice, EXT_SCL, EXP_IO4, EXP_IO42, EXP_IO47, UART_TX, UART_RX and the five HDR nets). The Qwiic SDA line ran through the old socket pad, so Qwiic SDA is among them.

Failed, expected: `check_export_chain.py` reports `Stale or invalid export input: tinkerbadge.kicad_pcb`. The publication exports, manufacturing package, enclosure CAD and web viewer still describe revision 0.3 and are not regenerated until the board is routed.

The routed revision below supersedes this placement checkpoint.


## Routed PCB 0.4

18 November 2026. Board SHA-256 `44f608c40e300433a0e9ac7ee12a7b88d5a3f78d628f41213fa0e5182326d3d4`. The routing request approved the existing placement. The board adds 58 straight or 45° segments and six 0.60/0.30 mm through vias. No footprints moved. The accessory supply trace is 0.30 mm wide and the new signals are 0.20 mm wide.

Independent KiCad 10.0.8 checks found zero ERC errors, DRC errors, unconnected items or schematic-parity findings. The one ERC warning and twelve DRC warnings match revision 0.3. All 167 schematic components, 523 contracted endpoints and 23 deliberate no-connects passed the contract check. The native connectivity graph confirmed all ten header pin groups, the five MCU-to-resistor paths, both UART probes and Qwiic SDA/SCL. The ground-plane fills and new copper clear the RF and NFC windows. Independent review of the front and rear copper and silkscreen plots confirmed the header labels are legible.

Machine-readable reports are in [the publication snapshot](../../exports/publication/manifest.json). The [header bench tests](expansion_header.md#bench-tests) and assembled prototype checks remain open.
