# Website branding

The site uses the approved name-tag wordmark and three-light hardware-badge symbol in deep forest green, `#20563d`.

The original wordmark remains embedded unchanged inside `wordmark.svg`. An sRGB color transform maps black to the chosen green and preserves white, alpha, lettering, spacing and silhouette. The image remains 720 × 151 px. The original transparent artwork is retained as `wordmark.png` for future edits.

Source filenames and SHA-256 hashes:

- `Tinkerbadge black-and-white wordmark.png`: `ec26bf2a0ec7adc8d3137f33fd383e7af365be0987aa04ad83279c46758e565f`
- `Three-light black hardware badge.png`: `71be87a7d7a8780b88a689bf82abc86c8fa6e6af39789ebe6b020414722a762d`

## Favicon readability

`favicon.svg` is a scalable, simplified drawing of the selected hardware-badge symbol: clipped upper-right corner, rounded other corners, three lights and a display. Its shorter screen leaves a five-unit green lower bezel in a 32-unit viewBox. At 16 px, the lower bezel has two fully opaque green rows at the center, rather than depending on a thin antialiased edge.

The icon keeps white lights and a white screen. A pale green keyline (`#c7e2cd`) appears in dark mode to separate the badge silhouette from a dark browser tab. Light and dark PNG fallbacks are supplied at 16, 32 and 48 px. The 180 px touch icon uses the site's cream canvas. To regenerate PNGs on macOS, run `swift scripts/render_branding_icons.swift` from the repository root. Keep the Swift and SVG geometry synchronized.

The green has 7.69:1 contrast against the actual site background (`#f5f3ec`) and 8.54:1 against white. The keyline has 11.64:1 contrast against the dark-tab test background (`#202124`). These colors are checked in `tests/branding.test.mjs`, alongside the solid lower-bezel pixels and three visible lights in the small PNGs.

`public/branding/` contains the assets. `scripts/branding.mjs` copies the nine deployable files under content-hashed URLs, generates relative icon links for every page depth, and records hashes in `build-info.json`. This branding applies only to the Tinker Badge project. `npm run check` verifies asset geometry, palette contrast, copied bytes, generated links and output hashes.
