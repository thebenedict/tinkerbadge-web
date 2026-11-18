# Third-party notices and source documents

## Manufacturer documents

Manufacturer datasheets, package drawings, extracted text, and page images are used as design evidence. Public source URLs, revision notes, and SHA256 hashes are retained in `docs/datasheets/*_inventory.json`, `docs/datasheets/*.source.json`, and the corresponding component records. The downloaded documents and their full-text/image derivatives are not included in the public repository because redistribution permission has not been established. Obtain them from the recorded sources and verify the hash before repeating an exact-revision review. A current download may be a newer revision.

Project-authored component summaries, pin assignments, verification reports, schematics, and schematic/PCB review exports remain available. Historical review records describe the inputs present when those checks ran; they do not imply that every archived supplier document is redistributed.

## KiCad libraries and 3D models

The native design uses symbols, footprints, and models from the standard KiCad libraries. Those libraries are authored by the KiCad community and licensed under CC-BY-SA 4.0 with the electronic-design exception reproduced below. The public viewer may include selected model files as dependencies. Their original bytes and embedded attribution are retained; the snapshot manifest identifies their source paths and hashes. This notice does not apply a license to the original Tinker Badge design.

The local `models/*.wrl` files are project-generated clearance envelopes, identified in their headers as not vendor component CAD. They are visual and clearance aids rather than manufacturing approval.

### Referenced KiCad model files

Paths below are relative to the standard KiCad model library. Original source: [KiCad packages3D](https://gitlab.com/kicad/libraries/kicad-packages3D). Hashes identify the installed model files reviewed for this development snapshot.

- `Capacitor_SMD.3dshapes/C_0402_1005Metric.step`: Copyright (C) 2017, kicad StepUp. SHA256 `03e44c4b2b727b8d4b6b1fd598cbd12dd5e614f1dfeefa96a92a07e3a3b312a2`.
- `Capacitor_SMD.3dshapes/C_0603_1608Metric.step`: Copyright (C) 2017, kicad StepUp. SHA256 `4857b3dc717675bf1fb22edda622ac3b3ae03cf44d81eefaf3fa3ba3a86d84c1`.
- `Capacitor_SMD.3dshapes/C_0805_2012Metric.step`: Copyright (C) 2017, kicad StepUp. SHA256 `9a669c1a2f1ea25b88b401acef6efeaa80a067bd7da9db6993de719a7fbe155c`.
- `Capacitor_SMD.3dshapes/C_1206_3216Metric.step`: Copyright (C) 2017, kicad StepUp. SHA256 `11e948c72c90e2b6322436b72745f40ff4e8ba0da64fb2a0df943dfa61e89c1a`.
- `Capacitor_SMD.3dshapes/C_1210_3225Metric.step`: Copyright (C) 2017, kicad StepUp. SHA256 `f8510481c5044113cf49b0fa6dd54ddab9224508bd6808e1afab8ef0cefdefc9`.
- `Connector_JST.3dshapes/JST_SH_SM04B-SRSS-TB_1x04-1MP_P1.00mm_Horizontal.step`: Copyright (C) 2025, KiCAD. SHA256 `4b0f89a75d3758add0041ca9e5ded3a780c23ef4e3e99bcc398b41177dff5d0f`.
- `Connector_USB.3dshapes/USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal.step`: KiCad community; original file metadata retained. SHA256 `6338ce740fa231c2d3dcc6384e0576994a47240a312a21413cb85d76990a69a0`.
- `Diode_SMD.3dshapes/D_SMF.step`: Copyright (C) 2022, kicad StepUp. SHA256 `975744dfb68222ac12c4526a1d1a96cde7f8c71c46bcd23a886ac44532259021`.
- `Diode_SMD.3dshapes/D_SOD-123.step`: Copyright (C) 2025, KiCAD. SHA256 `b3dc4065573abc72e3d5b4cca0e908f72a24205a41b6284b1f75ccacbe99adf8`.
- `Package_LGA.3dshapes/LGA-12_2x2mm_P0.5mm.step`: Copyright (C) 2018, kicad StepUp
. SHA256 `5e6c16287491528f89c09590e0d5dace14debf478226f74b45504eb906119145`.
- `Package_SO.3dshapes/TSSOP-14_4.4x5mm_P0.65mm.step`: Copyright (C) 2025, KiCAD. SHA256 `3ee5786aae56190997aa793ba3cfc003fd616782770e29719b4562f012982245`.
- `Package_SO.3dshapes/TSSOP-16_4.4x5mm_P0.65mm.step`: Copyright (C) 2025, KiCAD. SHA256 `6ad5e98224d02a427d9a6b929a28dbc158b9925fba5adec12db05079f1016948`.
- `Package_SO.3dshapes/TSSOP-20_4.4x6.5mm_P0.65mm.step`: Copyright (C) 2025, KiCAD. SHA256 `97339947f3a7196470ec2f1d9f9b92bb2fc2ab66ad53be0cf105192585ef3c9a`.
- `Package_TO_SOT_SMD.3dshapes/SOT-23-6.step`: Copyright (C) 2025, KiCAD. SHA256 `c9fe686b4d1b56927a41fa84a9bc1efb61d8a45a123a3db43bcaa05c2891d635`.
- `Package_TO_SOT_SMD.3dshapes/SOT-23.step`: Copyright (C) 2025, KiCAD. SHA256 `dd5d1711204e1d8d26cd11490923bd84340820baa69538c385a4300ec2539bc0`.
- `Package_TO_SOT_SMD.3dshapes/SOT-323_SC-70.step`: Copyright (C) 2025, KiCAD. SHA256 `acbf75a28fe41aa90efb38cd2b78220968d6eb6ebae1625dfd532dbeb268fece`.
- `RF_Module.3dshapes/ESP32-S3-WROOM-1.step`: KiCad community; original file metadata retained. SHA256 `3e35bb7ba7d030d88855fcf968398c8670934c7dca08b4e30b2c578bc1e13954`.
- `Resistor_SMD.3dshapes/R_0402_1005Metric.step`: Copyright (C) 2018, kicad StepUp. SHA256 `91507e5af4251cb4ef38e04889c9b98da29904432bd83786bba13ae9b605eacb`.
- `Resistor_SMD.3dshapes/R_0603_1608Metric.step`: Copyright (C) 2018, kicad StepUp. SHA256 `1875571c326d0d9e96f36b4efeb8094068ef7619f0a449c781caf0b49c2e5861`.
- `Resistor_SMD.3dshapes/R_0805_2012Metric.step`: Copyright (C) 2018, kicad StepUp. SHA256 `ded342cdb394fb45395227beaaa75cc390613cf2581b29cd6d22c12abd6103b2`.

## Upstream KiCad license

Source: [KiCad packages3D LICENSE.md](https://gitlab.com/kicad/libraries/kicad-packages3D/-/raw/master/LICENSE.md), retrieved 2026-11-09. The text below is reproduced without changes.

### KiCad Libraries License

The KiCad libraries are licensed under the [Creative Commons CC-BY-SA 4.0 License](https://creativecommons.org/licenses/by-sa/4.0/legalcode), with the following exception:

---------

_To the extent that the creation of electronic designs that use 'Licensed Material' can be considered to be 'Adapted Material', then the copyright holder waives article 3 of the license with respect to these designs and any generated files which use data provided as part of the 'Licensed Material'._

---------

You can read more about KiCad library licensing [here](http://kicad.org/libraries/license).

**What does this mean?**

KiCad libraries are licensed in such a way to ensure free use of library data for commercial, closed, and non-commercial projects without restriction. KiCad does not wish to exert any control over designs produced using the library data, or force users to reveal proprietary information contained in their designs. Neither do we wish to force users to attribute the KiCad libraries _within their design_.

Use of the library data in a project does not (by itself) require that the design or any files generated from the design are licensed under the CC-BY-SA 4.0 License. You are free to use the library data in your own projects without the obligation to share your project files under this or any other license agreement.

However, if you wish to redistribute the KiCad libraries, or parts thereof (including in modified form) as a collection then the exception above does not apply. Redistributed library collections must be shared under the same license agreement. Under these circumstances, the libraries must also retain attribution information, including the license documents which are distributed with the library files.

----------------------

**Warranty**

The KiCad libraries are provided in the hope that they will be useful, but are provided without warranty of any kind, express or implied.

The KiCad libraries are compiled by the KiCad community - if you find an error in the library data, please help the community and contribute a fix!

## Project licensing and library adaptations

Original project material is licensed as described in [LICENSE.md](../LICENSE.md). This does not replace the notices above. The complete [CC-BY-SA 4.0 text](../LICENSES/CC-BY-SA-4.0.txt) accompanies the KiCad electronic-design exception reproduced here.

KiCad-origin library material retains these terms when cached in native files or adapted in project libraries. Modifications to a footprint or symbol do not erase its upstream attribution or turn the underlying library material into original CERN-OHL-P content. Original project-generated clearance envelopes remain separately licensed hardware designs.
