# Web viewer checks

Checked on November 10, 2026. The local review build is snapshot `2c5ce291da26`, exported with KiCad 10.0.8 from the checked first routing pass. It runs at **http://127.0.0.1:4173/**. The routed snapshot and homepage examples are prepared together for the second publication.

## Build and source checks

`npm run check` passes **99 tests** under Node 24.22.2. Reproduce it with `npm ci` followed by `npm run check` under the pinned Node version.

- All 29 generated pages and local links validate.
- All 137 artifact hashes match. The exporter verified 94 source files and 20 model dependencies before and after export. A final independent read rechecked all 94 source hashes against the hardware project.
- Native PCB SHA256: `dafa93e938c3cc8b44d3bd1bc96028d27d44f320e9012c124e3212df88432e70`.
- Six schematic sheets contain 179 symbols. Native hierarchy, filenames and visible references verify each exported drawing.
- F.Cu, In1.Cu, In2.Cu and B.Cu are present. All eleven exported PCB layers share one viewport.
- The board is 110 × 80 × 1.6 mm, with the left-open antenna shoulder, R2 convex notch tip, 186 footprints, 1,258 tracks, 328 through vias and two filled inner GND planes. There are 164 front electrical footprints, six rear test points and nine unplaced schematic references.
- The 3D index has 184 component records and two separate native assembly accessories. Real triangle-raycast tests verify all 165 selectable model identities. Nineteen records have no separate body.
- Optimization preserves all 533,807 triangles and reduces 24,048 primitive groups to 411. The bound model is 19,298,180 bytes; the component index is 455,836 bytes. Both load on request. The increased size includes routed copper, vias and inner planes.
- The native ZIP includes LICENSE, LICENSE.md, all four full SPDX license texts, LICENSES/README.md and third-party notices. Their bytes match the frozen sources. Viewer licenses and dependency notices are included separately in the built site.

The exporter used private copies and did not modify hardware. Historical snapshots are retained locally but excluded from the built site.

## Example interactions

The homepage now has seven concise, unnumbered examples beneath the viewer. “Proposed meetup flow” provides the context. The contact-exchange example preserves opt-in BLE/IR detection and adds an intentional badge-tap option. The final item, “Make something new,” covers custom firmware and Qwiic/SAO add-ons. The speaker gift remains a possibility, not a promise.

The list is static HTML with a section heading, seven subheadings and decorative, non-focusable SVG sketches. It has no controls, working QR code or JavaScript dependency. Copy lives in the project-scoped presentation configuration rather than the CAD snapshot.

Final browser checks passed on desktop, 390 px and 320 px. Text contrast is 6.33:1. With a reserved scrollbar, the root width matches the usable viewport at 375 px and 305 px; no horizontal scrolling or clipping remains. The existing 3D model still loads and component picking works. Temporary QA tabs were closed and the original viewport was restored.

## Shared readable names

The exporter supplies names for 163 component records and 167 schematic symbols. It uses the BOM Description tables with verified reference-to-BOM contracts and exact current part numbers, plus narrowly allowed embedded descriptions for standard passive symbols. The same name and provenance reach the 3D, PCB and schematic inspectors.

The current BOM supplies the three later-added parts: U107 “Battery voltage isolation switch,” U301 “Display signal buffer,” and U506 “Status/control GPIO expander.” Source-to-export regressions check exact descriptions and identical provenance across all three inspectors. The prior focused browser pass verified all three names in the 3D picker and details, PCB name search and selection, and schematic inspector. This routing refresh preserves their names, references, part numbers and source-sheet associations.

U504 is **Infrared receiver**, with IRM-H638T/TR2 retained as its native value and part number. Shared MPNs do not inherit unrelated circuit roles: Q501's IR-driver name is not spread to every AO3400A. Missing or ambiguous names retain native metadata. Tests cover conflicting associations, absent BOM rows, shared parts, source hashes and propagation across verified identities.

## Feature callouts

Front has six labels, Components has three, and Back has three. Every label has one leader. Mobile retains every label and shows the selected leader. All anchors are generated from frozen native coordinates.

- Front: exposed processor U201, IR U504, ambient U501, role D402, Qwiic J501 and affinity D406.
- Components: processor U201, motion U502 and NFC controller U503.
- Back: SAO reserve RES_J502, battery accessory MECH_BATTERY and planned coil region MECH_NFC.

U501 is at (143.5,170.5) mm, rotated 90°. U504 remains at (137.75,168.5) mm, below the glass. The new Front “Unlocked ESP32-S3” leader uses (130,103.5) mm, the exposed antenna-section center from native fabrication bounds and the pinned STEP model. Its local offset follows footprint rotation and fails validation if the footprint/model identity changes. The rear NFC leader projects the documented all-layer reservation at (191,172.5); it does not represent existing antenna copper. The battery leader uses the native B.Cu accessory at (154,147.5).

Six mounting holes calibrate each image transform, with maximum residual **0.066 px**. Asymmetric shoulder transparency probes verify front/back orientation. Tests reject stale hashes, changed image dimensions, ambiguous references, multiple leaders, wrong-side component anchors and undocumented/model-backed through-board regions. Image URLs carry the verified render hash to prevent stale pixels across later publications.

## Current interface

- The one-row header has the lowercase tinkerbadge wordmark and view tabs. The repeated large heading is visually hidden while retaining a semantic page heading.
- The product line is: “Open hardware designed with agents, built for professional networking and ready to extend”. Presentation copy is scoped to its matching project.
- Download KiCad project is below the viewer. Explore in 3D remains click-to-load and is larger, with a minimum 46 px target. Text contrast is 12.17:1 normally and 8.26:1 on hover; its focus outline has 3.40:1 contrast against the panel.
- The raised-display/provisional caption is removed. The IR + Bluetooth description is “Detect conversation partners and share credentials”. Qwiic and SAO wording edits are retained.
- The prominent placement card is absent from Overview. A plain PCB note reports 48 unconnected items and nine unplaced components, with a link to the schematic. The counts come from the frozen native DRC report and exact remaining endpoints, checked against the source board hash and schematic population; neither count notice appears on the homepage.
- Repeat the electrical check is omitted only from the landing page. Its complete instructions remain in the frozen README, rendered source document and native ZIP. Markdown-aware filtering preserves other sections, code and reference definitions.
- The obsolete PCB-preparation paragraph is removed from the maintained hardware README and frozen source.

HTTP checks verify the Overview, PCB, schematic, Licensing, full README and native ZIP return 200. The served manifest identifies the correct board and snapshot.

## Browser checks

The current routed snapshot passed Chrome checks at desktop, 390 px and 320 px without horizontal overflow. All three versioned static renders show the new copper and rounded R2 notch tip. The 19.3 MB interactive model loads and remains responsive at the narrow viewport; accessories start off. Focus and an actual canvas click select U504 correctly, and U107/U301/U506 retain their names and part numbers.

Both inner-layer controls reveal their filled GND planes independently. Back mirrors the drawing left to right and preserves the selected layers. Rear copper is visible. The incomplete-routing status and modest remaining-work note fit at 320 px; the note uses 6.33:1 text contrast, while the homepage retains all seven examples without a count notice. Temporary tabs were closed and the original viewport was restored.

Current routed-view evidence:

- [Exposed components and routed copper](docs/qa/routing-final-desktop-components.jpg)
- [Front PCB layers](docs/qa/routing-final-pcb-front.jpg)
- [First inner GND plane](docs/qa/routing-final-pcb-in1.jpg)
- [Second inner GND plane, mirrored](docs/qa/routing-final-pcb-in2-mirrored.jpg)
- [Narrow PCB page and progress note](docs/qa/routing-final-mobile320-pcb.jpg)
- [Narrow 3D component selection](docs/qa/routing-final-mobile320-3d-pick.jpg)

The preceding complete Chrome UI pass covered 1604 px desktop, 390 × 844 and 320 px widths. It verified the compact header, semantic-only heading, exact product line, enlarged button and keyboard focus, default-off accessories, U504's readable name and part number, PCB/schematic cross-links and name searches, native download, landing-only electrical-section omission and PCB-only placement note. No horizontal overflow was found.

A focused pre-routing ALS pass verified the new six-label Front view at desktop and 390 px. The ESP32 leader lands on the exposed antenna section; the relocated ambient sensor and unchanged IR receiver each have one distinct correct endpoint. All twelve labels and hash-versioned images are present. Unchanged interaction flows were not all repeated after this geometry-only refresh; the aggregate check verifies the new GLB and every model identity.

Earlier ALS render evidence:

- [Desktop Front, including final IR wording](docs/qa/als-final-desktop-front.jpg)
- [Mobile Front](docs/qa/als-final-mobile390-front.jpg)
- [Mobile ambient-sensor endpoint](docs/qa/als-final-mobile390-ambient.jpg)
- [Mobile IR endpoint](docs/qa/als-final-mobile390-ir.jpg)

The mobile geometry captures precede the last text-only IR description edit. The desktop capture includes it. `final-*.jpg` screenshots cover the preceding complete UI pass; older `badge-*.jpg` files document historical revisions.

Earlier integration passes covered graphics-context loss and retry, delayed/failed/mismatched component indexes, accessory-choice persistence, no-JavaScript fallback, subpath hosting, mirrored focused PCB selection and both inner copper controls. The unchanged recovery code remains covered by aggregate tests; not every earlier browser failure fixture has been repeated for this refresh.

## Source limitations

This remains an incomplete first routing pass. The display is 3.5 mm behind the antenna versus the recommended 15 mm clearance. The rear NFC coil is planned but has no copper or tuning. Display flex, optical windows, part heights, supports, battery/dock selection and production fit remain open. The source review records four existing USB hole-clearance errors, one radio silkscreen-edge warning, 48 unconnected items and nine missing footprints. No new geometric finding was introduced in the source review. The viewer export validates the frozen DRC report against the checkpoint and remaining endpoints; it does not claim a new ERC or DRC run.

The ALS and IR receiver are grouped for a proposed shared passive window. The emitter needs a separate optical segment, and visible LEDs need isolation from the sensors. Glass and barriers can narrow angular coverage; assembled optical qualification remains open. This report applies only to the pinned dafa93e9 routing checkpoint. Six ordinary digital connections remain unfinished in addition to missing-part and intentionally held interfaces; the source routing review lists the exact open work.

SW401's source properties still contain an UNASSIGNED footprint-status note and a KSC-701p5D11 application-status reference despite its current SKSCLBE010 footprint/part number. The discrepancy is preserved and reported for hardware review rather than silently corrected.

Remaining platform coverage includes physical phones, sustained memory/performance, Safari, Firefox, unusual model structures and repeated child-sheet instances. Current checks do not establish universal KiCad compatibility.

See [publishing setup](docs/publishing.md). The user has approved publication of the finished placement viewer, followed by a routing pass and a second refreshed publication. The homepage changes are held for that post-routing release; no publication was performed during this UI task.
