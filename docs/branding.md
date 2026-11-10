# Website branding

The site uses the approved black-and-white name-tag wordmark and three-light hardware-badge symbol. These are web-sized copies of the supplied transparent artwork, with excess transparent margins trimmed and the original proportions preserved.

Source filenames and SHA-256 hashes:

- `Tinkerbadge black-and-white wordmark.png`: `ec26bf2a0ec7adc8d3137f33fd383e7af365be0987aa04ad83279c46758e565f`
- `Three-light black hardware badge.png`: `71be87a7d7a8780b88a689bf82abc86c8fa6e6af39789ebe6b020414722a762d`

The header image is 720 × 151 px. Favicons are 16, 32 and 48 px transparent PNGs. The 180 px touch icon has a white canvas for home-screen display. The approved shapes and black-and-white colors are unchanged.

`public/branding/` contains the deployable files. `scripts/branding.mjs` copies those assets under content-hashed URLs, generates relative icon links for every page depth, and records their hashes in `build-info.json`. This branding applies only to the Tinker Badge project. `npm run check` verifies the images, generated links and copied asset hashes.
