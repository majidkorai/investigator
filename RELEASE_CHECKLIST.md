# Investigator — release checklist

Use this before tagging a version or uploading to the Chrome Web Store.

## Version and metadata

- [ ] Bump **`version`** in `manifest.json` (source of truth for the store package name in `npm run pack`).
- [ ] Bump **`version`** in `package.json` to match (keeps tooling and docs consistent).
- [ ] Update **`PRIVACY.md`** “Last updated for extension version **x.x.x**” if permissions, storage, or behavior changed.
- [ ] If **`manifest.json` `description`** or permissions changed, plan updated store listing text and **permission justifications**.

## Code and quality

- [ ] **`npm test`** — all Vitest tests pass.
- [ ] **`npm run build`** — completes with no errors; load **unpacked** `dist/` locally and smoke-test: options save, popup toggle, one mock rule on a dev origin.
- [ ] If you changed user-facing behavior, update **Help & topics** in `src/options/options.html` and skim **`README.md`** / **`AGENTS.md`** for stale statements.

## Package for upload

- [ ] **`npm run pack`** — produces `releases/<slug>-v<version>-chrome.zip`; confirm zip root contains **`manifest.json`** (not nested under `dist/`).
- [ ] Optional: keep the zip filename or a checksum in release notes for your own records.

## Chrome Web Store (each submission)

- [ ] Upload the new zip to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
- [ ] **Release notes** (what changed for users).
- [ ] **Privacy policy URL** — public page reflecting `PRIVACY.md` (or equivalent).
- [ ] **Screenshots** — update if UI changed meaningfully.
- [ ] Submit for review; address any rejection feedback and resubmit.

## After publication

- [ ] Git: commit version bumps and checklist-driven doc updates; **tag** the release (e.g. `v0.4.0`) if you use tags.
- [ ] If the repo is public, ensure the store listing links to it (per `PRIVACY.md` suggestion).

See **`README.md`** for script details and publishing links.
