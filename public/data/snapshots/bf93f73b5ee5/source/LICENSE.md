# Tinker Badge licensing

Original Tinker Badge material is licensed by its copyright holders under the licenses below. These licenses apply by material type, not as a choice of interchangeable licenses for the whole repository. Existing third-party licenses and notices take precedence for their material.

## Hardware: CERN-OHL-P-2.0

Original electronic and mechanical designs are licensed under the **CERN Open Hardware Licence Version 2 – Permissive** (SPDX: `CERN-OHL-P-2.0`). See [the complete license](LICENSES/CERN-OHL-P-2.0.txt).

This covers the original content of the root KiCad schematic, PCB, project and library files; original footprints in `Tinkerbadge.pretty/`; project-generated clearance envelopes in `models/`; design-defining pin maps, electrical contracts and placement data under `docs/`; and corresponding native designs in `docs/design/history/`. Fabrication, netlist, drawing and model exports carry the licenses of the design and incorporated material from which they were generated.

KiCad-origin symbols, footprints and models, including modified library portions and cached copies, retain the KiCad library license and electronic-design exception. See [third-party notices](docs/THIRD_PARTY_NOTICES.md).

## Software and firmware: Apache-2.0

Original software, scripts, generators, tests and supporting software configuration are licensed under the **Apache License, Version 2.0** (SPDX: `Apache-2.0`). See [the complete license](LICENSES/Apache-2.0.txt).

This includes executable source in `tools/`, `tests/`, and document-rendering helpers such as `docs/datasheets/render_peripheral.swift`. Design data used as fixtures retain their hardware license. A generator's software license does not change the license of the generated hardware design or document. Apache-2.0 is also the selected license for original Tinker Badge firmware; no firmware implementation is included in this repository yet.

## Documentation and artwork: CC-BY-4.0

Original explanatory documentation, prose, diagrams and artwork are licensed under **Creative Commons Attribution 4.0 International** (SPDX: `CC-BY-4.0`). See [the complete license](LICENSES/CC-BY-4.0.txt).

This includes the README, original documentation under `docs/`, guides, review reports, and original explanatory illustrations. Design-defining CAD, pin maps and manufacturing data remain under the hardware license above. When sharing or adapting the documentation or artwork, credit “Tinker Badge contributors,” link to the source and license, retain supplied attribution, and indicate changes.

## Third-party material and redistribution

Manufacturer datasheets, package drawings, their extracted text and page images, external artwork and trademarks, dependencies, and copied or adapted third-party library material are not relicensed by this document. Source and attribution records remain authoritative for those items. Local vendor-document copies are excluded from public Git content because redistribution permission has not been established.

Keep this map, the relevant full license texts, and [third-party notices](docs/THIRD_PARTY_NOTICES.md) with source and native-design distributions. Other projects, including Harvest regression inputs used by the separate viewer, retain their own licenses.
