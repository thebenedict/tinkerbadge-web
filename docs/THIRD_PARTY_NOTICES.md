# Third-party notices

## Software dependencies

The versions below are pinned by `package-lock.json`. Their licenses remain separate from the viewer's Apache-2.0 license. Complete installed notices are preserved without modification in `LICENSES/third-party/`.

- `three` 0.180.0: MIT; [complete notice](../LICENSES/third-party/three.txt).
- `@gltf-transform/core` 4.2.1: MIT; [complete notice](../LICENSES/third-party/gltf-transform-core.txt).
- `esbuild` 0.25.10: MIT; [complete notice](../LICENSES/third-party/esbuild.txt).
- `marked` 15.0.12: MIT; [complete notice](../LICENSES/third-party/marked.txt).
- `property-graph` 3.0.0: MIT; [complete notice](../LICENSES/third-party/property-graph.txt).

Three.js is included in the browser bundle. The build also preserves its complete notice as `assets/three-LICENSE.txt`. glTF Transform and property-graph support asset processing; esbuild and marked support the build. Keep dependency notices current when upgrading.

## Hardware snapshots and models

Native CAD, rendered board geometry, library models and imported documentation retain their source terms. Each Tinker Badge snapshot includes the hardware licensing map and its `docs/THIRD_PARTY_NOTICES.md`; the latter records KiCad library attribution and the CC-BY-SA 4.0 electronic-design exception. The full CC-BY-SA text is included in `LICENSES/CC-BY-SA-4.0.txt`.

Manufacturer datasheets and their text/image derivatives are not covered by the project's permissive licenses. The hardware repository excludes local copies from publication where redistribution permission has not been established. Other imported designs, including Harvest regression examples, are not relicensed by this viewer.
