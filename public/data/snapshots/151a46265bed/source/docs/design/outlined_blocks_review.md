# Outlined circuit-sheet revision

9 November 2026. **Accepted for schematic visual review, not fabrication release.**

All five circuit sub-sheets now use the user's Seattle Transit Live reference style: thin dashed magenta unfilled outlines, with blue functional titles above each block. The root overview alone was not sufficient.

| Sheet | Outlined functional groups |
|---|---:|
| Power | 6 |
| Processor | 4 |
| Display | 4 |
| Lighting and buttons | 3 |
| Sensors and expansion | 7 |
| Total | 24 |

Some nearby branch geometry, headings and component fields were moved to create whitespace. No component, value, property, physical pin, net membership or library-pin definition changed. Existing prototype notes remain, including the single nominal 3.3 V LED experiment and disabled initial charging.

## Verification

- The saved native files were exported afresh through KiCad 10.0.8. Their hashes were stable during export.
- Complete before/after exported-netlist comparison passed: 179 component records, 141 actual named nets and 32 library physical-pin definitions match. Only export timestamps and numeric net codes are ignored.
- Independent contract checking passed all 576 physical endpoints and 30 intentional NCs. Declared property checking passed.
- Root ERC reports zero errors and the same one reviewed LIS2DW12 address-strap warning. No new suppression was added.
- All 24 existing endpoint/property/Alps regression tests passed.
- Independent visual reviews accepted power/display and MCU/lighting/peripherals. Two spacing corrections and an intermediate candidate's misplaced ADC grounds were caught and corrected before any candidate replaced the main sheets. Final reviewed candidate renders exactly match the exported saved sheets.
- The refreshed six-page PDF and six sheet PNGs come from this same saved revision.

## Editing and preservation

The user explicitly permits direct native edits when appropriate. This change used a bounded, structure-aware transformation of a frozen baseline. It preserves untouched source text, existing UUIDs and all non-geometric component tokens; its selectors also assert intended component groups. These safeguards do not replace netlist validation. The candidate was only applied after electrical comparison and independent visual review passed. Hash checks verified that the saved project had not changed in the meantime. The editor was closed without a stale save before file changes.

The baseline is retained in `history/2026-11-09-before-outlined-blocks/`. The post-format snapshot is retained in `history/2026-11-09-outlined-blocks/`, so subsequent footprint/layout work can be distinguished from this graphics-only change. Re-running the formatting helper uses its frozen baseline and is not a general-purpose rebuild command; never apply it over later electrical or footprint edits without rebasing and repeating review.

[Machine-readable evidence](outlined_blocks_review.json) records exact native/render hashes and independent reviews. [Verification](verification.md) and the export manifest pin the complete schematic snapshot. PCB preparation and later footprint assignments are a separate revision and must preserve these formatting changes.
