# Publish the hardware viewer

## Repository layout

Keep website source, its export adapter, tests, and GitHub Pages workflows in `tinkerbadge-web`. Keep authoritative CAD, component libraries, hardware specifications, and design verification in the sibling `tinkerbadge-hardware` repository. A separate infrastructure repository would add coordination without adding an independent service.

The current delivery path uses an exported snapshot checked into `public/data/`:

```text
Reviewed hardware files → local KiCad export → reviewed web snapshot
→ web commit → GitHub Actions checks → manual GitHub Pages deployment
```

The viewer build does not need KiCad or the hardware checkout. It installs locked npm dependencies and packages the included snapshot. The workflows use Ubuntu 24.04, exact action commit IDs, and Node 24.22.2 from `.node-version`. Run `npm ci` after changing Node versions. GitHub-hosted runner images still receive system updates.

## Prepare a snapshot

Keep sibling checkouts named `tinkerbadge-web` and `tinkerbadge-hardware`. From `tinkerbadge-web`:

```sh
npm ci
npm run export:badge
npm run check
node -p "JSON.parse(require('fs').readFileSync('public/data/manifest.json')).snapshot.id"
npm run check:publish -- --snapshot REVIEWED_SNAPSHOT_ID
```

Replace `REVIEWED_SNAPSHOT_ID` with the printed identifier. Inspect the rendered pages and the source/native downloads before publishing. The public bundle includes the hardware documents and native files listed by the export configuration. Check third-party redistribution rights, secrets, and local-only references in both source repositories and generated content.

The exporter records source-file hashes, output hashes, pipeline hashes, and tool versions. Badge snapshots require `sourceCommit` and verify every selected source file against that commit. The bound `exports/publication/manifest.json` connects the native electrical checks, manufacturing package and enclosure to the same PCB. Publishing is not a hardware manufacturing-release approval. The viewer preserves the current design status and validation warnings.

## GitHub setup

The public repositories are [tinkerbadge-hardware](https://github.com/thebenedict/tinkerbadge-hardware) and [tinkerbadge-web](https://github.com/thebenedict/tinkerbadge-web), both on `main`. The web repository uses **GitHub Actions** as its Pages build/deployment source.

The snapshot directory is ignored by default so old HARVEST experiments are not added by a broad `git add`. After the publication checks pass, explicitly stage only the active snapshot:

```sh
git add public/data/manifest.json
git add -f public/data/snapshots/REVIEWED_SNAPSHOT_ID/
```

When replacing a snapshot, remove the previously tracked snapshot from the Git index with `git rm -r --cached public/data/snapshots/PREVIOUS_SNAPSHOT_ID/` after confirming the new snapshot is complete. The old files stay in the local checkout and Git history; the deployed build includes only the active snapshot.

Push reviewed web source and the active snapshot to `main`. The **Check viewer** workflow runs on pushes and pull requests. Publishing remains manual: open **Actions → Publish GitHub Pages → Run workflow**, select `main`, enter the exact reviewed snapshot identifier, and confirm that the snapshot and native downloads are public.

The build refuses a sample project, an unreviewed snapshot identifier, invalid provenance hashes, unexpected files, or a bundle over 1 GB. It runs the full viewer checks before uploading the artifact. The deployment job has only the Pages and OIDC permissions it needs; checkout does not persist credentials. Only `dist/` is deployed. `release.json` records the web commit and export provenance.

The verified site is [www.thebenedict.com/tinkerbadge-web](https://www.thebenedict.com/tinkerbadge-web/). The default address, `https://thebenedict.github.io/tinkerbadge-web/`, redirects to the account's existing `www.thebenedict.com` Pages domain. The project's own custom-domain field is empty. No domain purchase or DNS change was needed for the first publication.

After each deployment, verify the successful workflow and the hosted `release.json`, manifest, artifact hashes, downloads and navigation. A successful upload alone does not verify the public site.

## Add a custom domain later

The viewer uses relative links and assets, so it can move from the project subpath to a custom domain without rewriting the application. Buy a domain when ready. Then verify ownership in GitHub, add the domain in the repository's Pages settings, set the DNS records provided by GitHub, and enable HTTPS when the certificate is ready. Do not add a domain or DNS record before ownership is established.

For a `www` subdomain, GitHub normally requests a CNAME to `thebenedict.github.io`, without `/tinkerbadge-web/`. Use GitHub's current instructions for apex records. Keep the custom-domain configuration in Pages settings for this Actions deployment; a `CNAME` file in the output is not required.

[GitHub Pages custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

## Roll back

The complete viewer snapshot and source live in Git. Revert the web change or restore the desired snapshot in a new commit on `main`, wait for checks, then run the publishing workflow with that snapshot's identifier. The site remains on the prior successful deployment if a new check or build fails. Uploaded build artifacts are retained for seven days; they are not the durable release archive.

## Automate hardware-triggered builds next

The eventual pipeline should start from a hardware commit, use a validated KiCad container pinned by digest and exact model/library inputs, and call the web build at a pinned commit. The hardware workflow should own the CAD trigger; web implementation and deployment logic should remain here.

Before enabling that flow:

- Keep the source-commit and publication-chain checks enabled when moving CAD export to CI.
- Validate the current KiCad 10.0.8 export/render behavior on the selected Linux container, including schematic hierarchy, component models, and licensing notices.
- Package a snapshot as a versioned artifact with its hardware/web commit IDs and content hashes.
- Choose a least-privilege cross-repository handoff. A normal repository `GITHUB_TOKEN` cannot dispatch work in another repository. A reusable workflow can keep work in the calling repository; deploying the web repository's Pages site requires a separate, approved delivery design.
- Run an end-to-end test before turning on automatic publication. Keep public deployment manual while these checks are being established.

No cross-repository token, automatic hardware-push trigger, or cloud KiCad exporter is configured by the initial workflows.
