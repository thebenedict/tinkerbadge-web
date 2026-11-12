# Tinker Badge hardware

Open **tinkerbadge.kicad_pro** in KiCad 10. The root schematic links to power, processor, display, lighting and peripheral sheets.

- [Specification](docs/spec.md)
- [Current schematic decisions and remaining gates](docs/design/implementation_status.md)
- [Design review, 10 November 2026](docs/design/design_review_2026-11-10.md)
- [Independent review, 11 November 2026](docs/review/design_review_2026-11-11.md) and [the response with the revision 0.3 fixes](docs/review/response_2026-11-11.md)
- [JLCPCB release package and order settings](docs/design/jlcpcb_release.md); order files in `production/jlcpcb/`
- [Reviewed physical-pin assignments](docs/pinouts.md)
- [Verification results](docs/design/verification.md)
- [Enclosure CAD, assembly and fit checks](mechanical/enclosure/README.md); STEP, STL and panel DXF files in `mechanical/enclosure/exports/`
- [Planning BOM and source history](docs/AI_Tinkerers_Badge_Design_BOM_Draft_2026-11-09.md)

The first prototype uses a single nominal 3.3 V rail for logic and the eight RGB LEDs. Regulator tolerance can fall below the LED datasheet minimum, so startup, low-battery, radio and full-white load-step tests are required.

This is a development design. The battery is a two-wire protected pouch cell on a rear JST PH header; charging is enabled at about 270 mA with on-board thermistors. The [review response](docs/review/response_2026-11-11.md) lists what changed in board revision 0.3 and what still needs hardware in hand, starting with a dry-fit of the display flex.

## Repeat the electrical check

Export the complete root schematic netlist using KiCad CLI or the installed Konnect MCP, then run:

```
python3 tools/check_schematic_contracts.py path/to/export.net --output path/to/endpoint-result.json
python3 tools/check_schematic_properties.py path/to/export.net --output path/to/property-result.json
python3 tools/test_contract_checker.py
python3 tools/test_property_checker.py
python3 tools/test_alps_buttons.py
```

The checker compares every physical pin and intentional NC with the separately maintained reviewed block contracts. The separate property checker covers explicitly declared values, part numbers, ratings, population and library associations. Run root ERC and inspect fresh sheet renders as well. Current outputs are in `exports/`, with a six-page PDF and a pinned verification manifest. The one-time capture scripts are not idempotent rebuild commands; rerunning them blindly can duplicate objects. Initial electrical capture used Konnect MCP. The user-approved [outlined-block revision](docs/design/outlined_blocks_review.md) uses bounded native edits, independent visual review and complete before/after exported-netlist comparison.

## Licensing

- Original hardware and mechanical designs: **CERN-OHL-P-2.0**.
- Original software, tools and firmware: **Apache-2.0**.
- Original documentation and artwork: **CC-BY-4.0**.

See [the licensing map](LICENSE.md) and [full license texts](LICENSES/README.md). Generated exports retain their source licenses. [Third-party notices](docs/THIRD_PARTY_NOTICES.md) cover KiCad libraries and manufacturer material.
