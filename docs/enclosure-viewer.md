# Enclosure exploration

The Overview opens in assembled mode. The Enclosure tab opens in exploded mode and includes construction notes and CAD downloads. Both use the same 3D viewer:

- **Assembled** shows the clear panels, printed frame, supports, diffuser inserts, display and battery allowance.
- **Board** hides the case and accessories for component inspection. Selecting a component switches to this mode.
- **Exploded** separates the parts; the slider controls their separation.
- Click a case part or select it from **Inspect enclosure parts** to highlight, focus or download its STL. Visibility checkboxes expose internal parts.
- Front, Back and Reset camera controls work in each mode. The `assembly` URL parameter preserves a shareable view choice.

Schematic and PCB tabs remain dedicated electrical views. Board feature callouts remain available under Overview.

## Refreshing the hardware

Build the CAD in `tinkerbadge-hardware/mechanical/enclosure` first, then run:

```sh
npm run export:badge
python3 scripts/render_feature_views.py
python3 scripts/render_enclosure.py
npm run check
```

The enclosure poster script additionally requires `trimesh`; it uses KiCad's renderer on a private board copy. The enclosure exporter rejects CAD whose PCB hash differs from the exported board. CAD source, STEP, STL, DXF and GLB files are copied into the immutable snapshot with hashes. The build verifies the assembly poster's snapshot and source hashes.

## Validation for A1

The current implementation passed all 110 automated tests, static page/link/hash checks, actual GLB node registration and component triangle raycast checks. The mechanical package includes independent nominal fit checks against the current native PCB.

Browser interaction verification is pending. This editing session could not start a local HTTP listener, and browser policy rejected file URLs. The prepared offline HTML under `.work/offline-preview` uses the production source with bundled scripts and embedded fetch assets; it was not browser-verified. Run `npm run dev` in an environment with local preview access and check view switching, the separation slider, part selection/focus/visibility, component inspection, camera controls, tabs, and downloads at desktop and mobile widths before publication.

Publication was authorized, but the GitHub connection rejected a blob write with HTTP 403 (resource not accessible by integration), and shell DNS cannot resolve github.com. The tested source and frozen assets are committed locally; no live site has been changed. The publication gate passes for snapshot `bf93f73b5ee5`.
