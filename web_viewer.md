# Web viewer requirements and architecture

Working proposal · 9 November 2026

Companion to the [project specification](../tinkerbadge-hardware/docs/spec.md) and [datasheet-first design workflow](../tinkerbadge-hardware/docs/design_workflow.md).

## Goal and scope

Publish an approachable, read-only view of the badge project. The front page combines the project README with an attractive, interactive 3D render. Visitors can open schematic and PCB viewers through separate tabs or linked pages. The deployed site should run entirely in the browser from static files, without a custom application server, database, account, or runtime CAD conversion service.

This document defines the intended behavior and recommended implementation. The project currently contains design documentation but no root README, native KiCad design, or viewer implementation. Those inputs must exist before the actual badge can be exported and tested.

## Functional behavior

### Front page: README and interactive 3D

- Put the badge's 3D view prominently beside or above the project README. On narrow screens, stack them while keeping the introduction and navigation readily reachable.
- Render the project's maintained `README.md` into HTML at build time. Include purpose, current design status, major features, getting started, and links to the specification, hardware documentation, source, BOM, and downloads. Keep one README source rather than a separately maintained website copy.
- Start with a composed three-quarter view, clear lighting, readable display content, and considered materials for the PCB, components, enclosure, and diffuser. Use a matching static poster while the model loads.
- Let visitors rotate/orbit and zoom with mouse and touch. Provide **Reset view**, **Front**, and **Back** controls and accessible equivalents for essential actions. The visitor must be able to inspect the back and edges, not merely watch a turntable animation.
- Keep the interactive model on the front page. Loading it progressively or through an explicit **Explore in 3D** button on constrained devices is acceptable; a static image or a link to another page alone does not fulfill the interaction requirement.
- Avoid continuous automatic rotation by default. If added, provide pause and respect reduced-motion preferences. Do not capture ordinary page scrolling until the visitor intentionally interacts with the viewer.
- Show a useful loading state and a recoverable error with **Retry**. Keep the poster, README, navigation, and downloads usable when JavaScript, WebGL, model loading, or GPU resources fail.

The final assembly is the preferred hero when enclosure and display CAD are available. Until then, identify a PCB-only or conceptual view accurately. Enclosure visibility and exploded views are optional later enhancements.

### Schematic viewer

- Open from a clear **Schematic** navigation item. Provide pan, zoom, fit-to-page, and a sheet selector with meaningful sheet names and hierarchy context.
- Keep symbols, pin numbers, reference designators, labels, and wires readable at close zoom. Include links to relevant block documentation.
- Provide the same revision's PDF, SVG sheets, and native KiCad files as downloads. A lightweight SVG viewer can supply the core pan/zoom/sheet experience if a richer viewer fails compatibility checks.
- Add reference search and symbol/property inspection where the selected viewer supports them reliably. Cross-highlighting between schematic and PCB is a later enhancement, not a dependency for the first release.

### PCB viewer

- Open from a clear **PCB** navigation item. Provide pan, zoom, fit-to-board, front/back views, and named layer visibility controls, including internal copper on the working four-layer board.
- Distinguish front/back viewing direction from individual layer visibility; label mirrored views so connector orientation is unambiguous.
- Preserve the visible board outline, holes, pads, traces, zones, text, and silkscreen. Offer native files and clearly labeled layer SVGs when the interactive renderer cannot display a feature correctly.
- Prefer reference search, footprint selection, and inspection of component/net properties when supported. A component-linked BOM or assembly checklist is an optional complementary view.

### Navigation and shared state

Use **Overview**, **Schematic**, and **PCB** as the primary navigation. Recommend separate generated pages (`/`, `/schematic/`, `/pcb/`) styled as a consistent tab bar: each has a shareable URL, survives refresh and Back/Forward, and does not require the other viewers to initialize. Actual in-page tabs are also acceptable if they lazy-mount only the active viewer, update the URL, and provide correct keyboard/focus behavior.

Show the design revision or snapshot ID and fitted variant consistently on every page. Keep the chosen revision when moving between views. Do not silently combine a new schematic, old PCB, and unrelated hero render. Distinguish a working design from a released hardware revision.

## Recommended architecture

### Static HTML with isolated viewer modules

Use a small static-site build with Markdown support, such as Astro in static-output mode, or the project's eventual documentation generator. The framework is secondary to these boundaries:

1. **Build machine:** Reads reviewed CAD and documentation, runs exporters and validation, optimizes preview assets, and emits a complete static site.
2. **Static host:** Serves HTML, CSS, JavaScript, fonts, models, drawings, and downloads over HTTPS. No per-visitor rendering or design processing.
3. **Browser:** Loads the selected view's assets and handles interaction locally.

Keep the README and navigation as pre-rendered HTML. Split the 3D, schematic, and PCB modules into independent entry points. Prefer same-origin, version-pinned assets to runtime dependencies on a public CDN or GitHub API. Serving static files does not mean opening `index.html` through `file://`; local preview should use a small HTTP server so module and asset loading behave like deployment.

The public viewer is separate from the badge check-in and fleet systems described in the specification. Those may need services; this documentation site does not inherit that backend requirement.

### 3D: pre-export GLB, then render in the browser

Start by evaluating **`<model-viewer>`** for the hero. It supplies an established interactive glTF/GLB presentation component without requiring a custom scene framework. Its documented loading examples include posters and compressed asset support. Defer its JavaScript as well as the model; a deferred model alone does not remove the runtime's startup cost. [Component](https://modelviewer.dev/), [loading examples](https://modelviewer.dev/examples/loading/)

Use **Three.js with GLTFLoader and OrbitControls** instead if the desired assembly controls, picking, lighting, or exploded views warrant custom scene code. This gives more control but requires explicit loading, accessibility, camera, resize, disposal, and error handling. Choose one 3D path for the hero rather than bundling both. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)

Generate a GLB from the native PCB at build time. Combine it with separately generated enclosure/display CAD using a reproducible assembly transform and material recipe when those parts exist. Optional Blender processing may improve materials and lighting. Do not ship STEP files or a CAD kernel to the landing page for runtime tessellation.

**Local capability check:** KiCad **10.0.8** is installed on the Mac. Its CLI help confirms `pcb export glb`, `pcb export svg`, `sch export svg`, and `sch export pdf`. The [KiCad 10 CLI manual](https://docs.kicad.org/10.0/en/cli/cli.html) documents these exports. Actual badge exports have not been run because native design files do not yet exist. Pin the exporter and libraries used by the eventual build, and inspect its exact flags rather than relying on defaults for layer inclusion, origins, models, or fitted variants.

### 2D: trustworthy exports, enhanced by a tested viewer

Always generate schematic SVG/PDF and PCB layer SVGs with KiCad. They provide a stable fallback, downloadable documentation, and reference images against which to check an alternative renderer.

**KiCanvas is the leading candidate for richer schematic/PCB inspection.** It reads KiCad files directly in the browser and supports embedded project sources. Package a tested build and serve all required files alongside the site, preserving project/sheet names. Its current documentation describes early-alpha status and incomplete rendering features; it does not establish full KiCad 10 compatibility. Test the actual project's symbols, fonts, hierarchical sheets, zones, and layers before adopting it. [Overview and known issues](https://kicanvas.org/home/), [embedding API](https://kicanvas.org/embedding/)

Do not build essential navigation around speculative APIs: the embedding documentation marks deep linking and event interfaces as unimplemented or incomplete. Page-level links and SVG fallback navigation should work independently. If compatibility is inadequate, ship the exported SVG viewer first and add KiCanvas later.

**InteractiveHtmlBom** is a useful optional PCB/BOM assembly page. Its generated HTML is self-contained, with component lookup and optional net highlighting. It is not a substitute for the schematic or a complete layer-inspection experience. Generate it at build time, test its KiCad/plugin combination, and link it from the PCB page only if it adds value. [Project and capabilities](https://github.com/openscopeproject/InteractiveHtmlBom/blob/master/README.md), [real demo boards](https://openscopeproject.org/InteractiveHtmlBomDemo/)

## Keeping a heavy viewer responsive

The expensive resources are renderer code, CAD parsing, geometry, textures, decoding, and GPU memory. A static deployment removes backend operations but does not make these costs disappear.

- Deliver the HTML, small stylesheet, and appropriately sized poster first. Defer the 3D module until the hero is visible and the initial page is usable. Offer explicit loading on data-saving or constrained devices.
- Do not fetch schematic/PCB runtimes or designs on the home page. Load only the selected sheet or layer group where practical. Hidden canvases or iframes still consume resources if already mounted; initialize them on demand.
- Stop rendering when a view is hidden or the document is backgrounded. Release listeners, textures, geometries, and viewer instances on teardown. Guard against stale asynchronous loads after rapid navigation or retries. Use a worker for expensive parsing/decoding only where the selected tool supports it; do not assume an embedded viewer is worker-ready.
- Use a lightweight hero model and offer higher detail separately if useful. Remove unseen detail only from preview derivatives. Preserve the board outline, openings, connector positions, and recognizable component proportions. Preserve node identities needed for future picking when optimizing.
- Inspect geometry, textures, and draw calls before applying optimization. Deduplicate reusable assets, reduce oversized textures, and test material/mesh consolidation. Evaluate Meshopt or Draco and KTX2 only when transfer and memory savings justify their decoder costs. Host required decoders locally and test the chosen renderer's extension support. [glTF Transform inspection and optimization](https://gltf-transform.dev/cli)
- Cap pixel density and use modest lighting/shadow settings on phones. Transparent enclosures can be expensive and visually ambiguous; compare the final material treatment on real mobile hardware.
- Give immutable assets content-hashed URLs and long-lived caching. Keep HTML and the release manifest revalidated, and publish a coherent asset set together so an old page cannot point to a half-updated release. A service worker is unnecessary for v1.

**Proposed initial budgets, to validate with the first model:** aim for at most 500 KB transferred for the initial HTML/CSS/poster/small bootstrap, no schematic or PCB payload on the landing page, and a hero GLB of 5 MB or less. Measure viewer JavaScript and decoder bytes separately. Target usable README/navigation within 2.5 seconds on an agreed throttled mobile profile and roughly 30 fps during orbiting on the representative phone. Record cold-load time, interaction latency, draw calls, and memory where measurable. These are tuning targets, not measured results or fixed hardware constraints; revise them explicitly if visual quality or target devices require it.

## Reproducible assets and provenance

Build one publication bundle from one reviewed design snapshot:

1. Read the README, spec, native KiCad files, fitted variant, libraries/models, and mechanical source from pinned inputs. Follow the hardware workflow's validation gates before labeling a release approved.
2. Export schematic sheets/PDF, PCB layers, GLB, downloads, and any optional assembly page. Check missing component models and fonts. Model omissions must be reported rather than silently producing an apparently complete badge.
3. Create the hero assembly, optimized preview, and matching poster. Preserve units, board thickness, transforms, connector orientation, and component placement through conversion. Keep original CAD and unoptimized exports separate from web derivatives; the preview mesh is not the manufacturing or dimensional authority.
4. Emit a manifest with source commit when available, input/output hashes, design revision, fitted variant, tool/dependency versions, build settings, and licenses/source provenance for incorporated models and textures. Until version control exists, use a named snapshot plus hashes instead of inventing a commit ID.
5. Validate files and links, compare exports with native KiCad views, inspect the final model, and publish the complete static directory. Keep release-specific URLs available when replacing the site's default revision.

Only allowlisted public design/documentation assets belong in the bundle. Do not copy local configuration, private attendee information, tokens, or unrelated files. Render Markdown with an explicit HTML policy, preserve dependency/model attribution, and use fictional display content for the hero. Any external link or third-party viewer request should be deliberate rather than an incidental asset dependency.

## Implementation sequence and acceptance checks

1. **Establish inputs:** Create the maintained README and native design; select the first public snapshot and its model/asset licenses.
2. **Prove exports:** Produce SVG/PDF and GLB, check fidelity and missing models, and benchmark the first hero on a phone.
3. **Build the static shell:** Overview with README, poster and working interactive 3D; linked schematic and PCB pages with SVG viewing and downloads.
4. **Evaluate richer inspection:** Test a pinned KiCanvas build against the actual KiCad 10 files. Adopt it only for the views that pass; add an assembly BOM page if useful.
5. **Verify the published bundle:**
   - Rotate, zoom, reset, and inspect front/back on desktop and touch devices.
   - Read README/navigation with JavaScript disabled; test slow/failed model requests, retry, missing sheets, unsupported WebGL, and context loss where practical.
   - Test direct page URLs, refresh, Back/Forward, keyboard navigation, reduced motion, and repeated switches without accumulating viewers.
   - Confirm a cold landing-page network trace contains no schematic/PCB modules or files; measure the stated budgets and background rendering behavior.
   - Compare all sheet labels, PCB layers, component visibility, orientations, and fitted variants against native KiCad. Verify revision/manifest consistency and every download.
   - Serve the production build from a static HTTP host with no application backend or authenticated design API; verify subpath deployment and same-origin asset URLs if the chosen host requires them.

Choose the static host and richer viewer versions after this proof. No viewer has been built or deployed as part of this documentation update.
