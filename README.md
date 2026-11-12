# Tinker Badge Web Viewer

A static KiCad project viewer with an interactive 3D assembly, searchable schematics, PCB layers, and source documentation. Project metadata and native CAD exports drive the pages. Tinker Badge is the current integration target; Harvest remains a separate regression example.

## Run locally

Requires Node 18+ and Python 3. CAD exports use KiCad 10.0.8.

```sh
npm ci
npm run build
npm run preview
```

Open **http://127.0.0.1:4173**. The preview serves `dist/` on loopback. Use HTTP rather than opening HTML through `file://`.

The included `public/data/` snapshot can rebuild the interface without KiCad. Its manifest identifies the actual project and snapshot. `npm run dev` builds and starts the preview. After editing files, rebuild and refresh the browser.

## Export a project

```sh
npm run export:badge
npm run check
```

For Harvest:

```sh
npm run export:harvest
npm run check
```

For another configuration or source location:

```sh
python3 scripts/export_assets.py \
  --config config/badge.json \
  --source ../tinkerbadge-hardware \
  --kicad-cli /Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
```

The exporter copies allowlisted native files, local libraries, and referenced models into a private working directory. It runs KiCad against those copies, checks source and dependency hashes again, and promotes the new manifest only after the export completes. Native downloads retain the original source bytes. Logs stay in `.work/`.

Export from a consistent CAD checkpoint. If a sheet, footprint, model, document, or dependency changes during export, the snapshot is rejected. The badge configuration also pins the approved board hash; update that pin only after reviewing a new hardware checkpoint. Before export, run the hardware repository’s `tools/refresh_publication.py` and commit the resulting snapshot. The web exporter verifies that its selected source files match one hardware commit, and that the manufacturing, electrical and enclosure evidence all match those files. It reads the hardware project without modifying it.

## Project metadata

`config/badge.json` and `config/harvest.json` use schema version 2. A project configuration names:

- The source directory, relative to this viewer project unless overridden with `--source`.
- The project name, description, revision, status, and maintained README.
- Explicit variant IDs and paths to the root schematic, PCB, and KiCad project.
- The native instance project name used by hierarchical schematics.
- Documents and CAD directories to include in the source bundle.
- Optional facts, named assembly accessories, and source-backed component-name inputs.

The schematic and PCB inputs are independent. A schematic-only project gets a schematic preview and no PCB tab. A board with an outline can have a 3D view before placement. Missing model geometry leaves the schematic, PCB layers, and available component metadata usable.

To adapt another KiCad project, add a configuration with its real filenames and metadata, export it, run the checks, and review the resulting pages. The current adapter targets KiCad 10's native file and export structures. Unfamiliar hierarchy or model conventions need validation and tests before release.

Interface copy lives in `config/presentation.json` and applies only to its matching `projectName`. It can override the landing product line, supply brief example interactions, and omit named README sections from the landing page. The full source README, its document page, and the native download remain unchanged.

## Views

- **Overview:** maintained README, source documents, assembly poster, optional interactive model, and downloads.
- **Schematic:** pan, zoom, fit, hierarchical sheet selection, project-wide name/reference/value search, source properties, and PDF/SVG/native downloads.
- **PCB:** all exported copper layers, fabrication and mask layers, mirrored back view, front/back presets, and name/reference/value/net search.

Each variant and view has a static URL. Sheet links use the full native sheet-instance identity. Searching for a component on another sheet opens that sheet and focuses its symbol. A component's 3D details link to the matching PCB reference and schematic sheet.

The model runtime, GLB, and component index load after **Explore in 3D**. Schematic and PCB drawings load on their own pages. All viewer assets use the same origin; no backend is required.

## Components and assembly accessories

Click a component to highlight it and read its descriptive name, reference, value, part number, supplier code, footprint, BOM inclusion, quantity, and nets. Datasheet links come from the source. The reference selector provides the same details without precise pointing. Parts without a separate model remain selectable in the list.

**Focus** moves the camera toward the selected model. **Clear** or Escape removes the selection. Dragging and multi-pointer gestures do not select a component. Visible PCB and accessory geometry blocks picking through it.

The badge's **Show display and battery** checkbox controls separate assembly objects. It starts off in 3D; enable it to show the source-derived assembly geometry. An explicit choice is retained for that model in the current tab, including retries and browser Back navigation. The display is a source-derived glass envelope with a proposed 4.5 mm underside clearance. The battery is a 35 × 55 × 7 mm size allowance; the pack, cable, and mounting are still open. These objects are excluded from the electrical BOM.

Accessory metadata names an exact native board-only footprint and source model. When KiCad omits the review WRL from GLB, the exporter can reconstruct its verified cuboids and calibrate placement against native component transforms on both board sides. Unsupported geometry or inconsistent anchors disables that fallback. The interactive viewer does not invent mounting hardware, cables, or flex routing.

## Identity and provenance

Each PCB record keeps its footprint UUID and native schematic instance path. The exporter resolves a root-relative path only against the known schematic root, then checks the reference. It compares values, footprints, BOM fields, and assembly flags. Unplaced symbols and board-only items remain explicit; conflicting properties are reported and details use the PCB values.

The GLB binder verifies KiCad's reference-named assembly parents and adds variant-qualified UUIDs in node extras. `components.json` records source hashes, model hash, metadata, and exact mesh ownership. Ambiguous identities stop binding. Missing bodies are recorded as missing rather than assigned to a nearby part.

For reviewed routing checkpoints, optional `routingReview` inputs identify the checkpoint manifest, native DRC report, exact remaining endpoints, and review document. The exporter binds them to the board hash and validates report counts and endpoint agreement. Their source hashes accompany the PCB-only progress note; inconsistent reports stop export.

The browser validates the index before enabling inspection. Picking follows UUID ancestry from actual mesh hits. The model optimizer merges compatible primitives within each mesh and verifies triangle attributes, winding, materials, names, transforms, and bounds. The original native GLB is included as a download.

Readable names come from the planning BOM's Description tables, joined through reviewed reference-to-BOM contracts and exact current part numbers. A unique part-number match is allowed only when it identifies one current reference. Shared parts do not inherit another circuit's role. Standard resistor, capacitor, and inductor names can use their embedded native library descriptions. Missing or ambiguous names keep the native value instead.

The same `displayName` and `displayNameSource` fields reach the 3D index, verified PCB records, and schematic symbols. Source paths, hashes, table rows, and association evidence remain available for audit. Names are searchable in both drawing views.

BOM quantity is the populated count of the exact part in the selected board snapshot. Historical BOM CSVs, stock, and prices are not used.

## Controls

**3D:** drag to orbit. Focus the canvas before scrolling to zoom. Keyboard arrows rotate, +/− zoom, and Home resets. On touch screens, use two fingers to orbit and zoom. Rendering runs when the view changes and pauses in background tabs.

**2D:** drag to pan, scroll or pinch to zoom. Keyboard arrows pan, +/− zoom, and Home/0 fit. Search results focus symbol or footprint origins.

On the PCB, **Back** mirrors the viewing direction. **Back set** selects the rear layers. These controls are independent.

## Verify changes

```sh
npm run check
```

This runs unit tests, builds the static pages, checks local links and artifact hashes, validates hierarchy and component identities, probes real model triangles, and checks that PCB layers share a coordinate system. Browser checks and remaining coverage are recorded in `QA.md`.

For an isolated fixture, set `VIEWER_PUBLIC` and `VIEWER_DIST` to separate directories inside this project. `VIEWER_PUBLIC` contains `data/manifest.json`; `VIEWER_DIST` is the generated site. Build, check, and preview scripts honor these paths. `PORT` changes the loopback preview port.

Read `docs/style_guide/writing.md` before changing copy. Use descriptive labels and omit decorative numbering. Native sheet names and source documents retain their maintained text.

## Deployment

`dist/` is the complete static site and uses relative URLs for subpath hosting. Deploy it as a unit only after checking its manifest and project identity. Content-hashed scripts, styles, and immutable snapshot assets can be cached independently of entry pages.

See [publishing setup](docs/publishing.md) for release checks and deployment configuration. Review third-party model licenses before public redistribution.

## Current limits

- PCB revision 0.3 has zero open connections or error-severity ERC/DRC findings in the bound publication evidence. The enclosure is an A2 fit prototype; battery, display, RF and physical qualification remain open.
- Component selection marks real model bodies; 2D reference markers mark symbol or footprint origins. Live cross-highlighting between separate open views is future work.
- The maintained README is rendered from its source, with configured landing-page omissions. Links outside the snapshot allowlist appear as dotted text.
- Arbitrary STEP assemblies, unusual nested model exports, and unsupported accessory meshes need adapter work and tests.
- Physical-phone performance, sustained memory use, Safari, and Firefox still need testing.

## Files

- `config/`: explicit project metadata and source allowlists
- `src/`: browser modules and styles
- `scripts/export_assets.py`: frozen snapshots and native KiCad exports
- `scripts/kicad_source.py`: source parsing, hierarchy, models, and metadata
- `scripts/component_names.py`: BOM and native-description names with provenance
- `scripts/presentation.mjs`: landing-page README filtering
- `scripts/interactions.mjs`: static example-interaction lists with decorative sketches
- `scripts/bind_components.mjs`: component and accessory bindings
- `scripts/optimize_glb.mjs`: checked per-mesh primitive consolidation
- `scripts/build.mjs`: static pages and browser bundles
- `scripts/check.mjs`: artifact and integration checks
- `scripts/qa-serve.mjs`: local error and loading fixtures
- `tests/`: JavaScript and Python regression tests
- `public/data/`: immutable exports and active manifest
- `dist/`: generated static site
- `.work/`: copied inputs, export logs, and local fixtures

See `web_viewer.md` for the longer-term specification.

## Feature callouts

The badge front page starts with Front, Components, and Back KiCad renders and labeled hardware features. Desktop shows all leader lines. On phones, every label stays visible and selecting one shows its leader line. Keyboard users can select a view and move through the labels. The 3D model still loads only after **Explore in 3D**.

Feature copy and one representative reference per feature live in `config/features/badge.json`. Each label has a single leader. Anchors come from the snapshot’s native PCB coordinates, including the mirrored back view. `public/features/badge/renders.json` records the source snapshot, board hash, render hashes, and calibrated pixel transforms. A build refuses stale renders, missing or wrong-side references, unmarked board-only reservations, or changed image dimensions.

The labels describe proposed interactions. The Components render hides the display to expose front electronics. The Back render includes the battery allowance and the routed rear NFC coil. The SAO socket is on the front. NFC tuning remains open. Accessory leaders use their native assembly positions. These presentation exports do not change the source board or interactive assembly.

To regenerate these three presentation images from the reviewed snapshot, run `python3 scripts/render_feature_views.py`, then `npm run check`. The render recipe is intentionally pinned to the reviewed badge source; review its snapshot and source-hash binding when replacing the hardware layout. Calibration uses six native mounting holes. An independent shoulder transparency check verifies front/back orientation; the full outline stays in frame.

## Licensing

- Original viewer software and tools: **Apache-2.0**.
- Original documentation and artwork: **CC-BY-4.0**.
- Original Tinker Badge hardware in snapshots: **CERN-OHL-P-2.0**.

See [the licensing map](LICENSE.md), [full license texts](LICENSES/README.md), and [third-party notices](docs/THIRD_PARTY_NOTICES.md). Generated assets retain their source licenses; imported projects and dependencies retain their own terms.

## Enclosure viewer

The [enclosure exploration guide](docs/enclosure-viewer.md) describes assembly views, CAD refresh, and validation.
