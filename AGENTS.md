# Investigator — agent context

## What this is

**Investigator** is a Manifest V3 Chrome extension that mocks developer HTTP responses. It injects only on **user-listed app origins** (where the frontend runs). **Rules** match outgoing `fetch` / `XMLHttpRequest` (substring, regex, or glob on full URL or path+query), optional method, headers, and query. With the master switch on, matched requests return a synthetic response (with optional delay and `{{template}}` placeholders) and **do not hit the network**.

## Commands

- **`npm run build`** — `tsc --noEmit`, main Vite + CRX build, then IIFE builds for `bridge.js` and `mainWorld.js`.
- **`npm run dev`** — `concurrently` runs all three Vite builds in **watch** mode.
- **`npm test`** — Vitest unit tests (`tests/`).
- **`npm run pack`** — Runs **`build`**, then `scripts/pack-extension.mjs` zips **`dist/`** contents into **`releases/<manifest-name>-v<manifest-version>-chrome.zip`** (manifest at zip root; for Web Store upload). Requires **`zip`** on `PATH`.
- **`npm run pack:zip`** — Pack only; **must** run **`npm run build`** first if `dist/` is stale.

## Documentation map

- **`README.md`** — Human-oriented: install, scripts, layout, pack, publish links.
- **`RELEASE_CHECKLIST.md`** — Pre-release and Chrome Web Store submission checklist.
- **`PRIVACY.md`** — Privacy / permissions text for listings; update version line when shipping.
- **`src/options/options.html`** — In-app **Help & topics** (`<details>`); keep accurate when behavior changes.

## Load in Chrome

**Load unpacked** → `dist/`. Reload the extension after each production build.

## Publish (store)

Run **`npm run pack`**, upload the zip from **`releases/`**. See `README.md` and [Chrome Web Store publish](https://developer.chrome.com/docs/webstore/publish).

## Layout

| Path | Role |
|------|------|
| `manifest.json` | MV3 manifest |
| `src/background/service-worker.ts` | Dynamic content scripts, badge, refresh queue |
| `src/content/bridge.ts` | Isolated world → `postMessage` config |
| `src/content/main-world.ts` | MAIN world hooks, delays, templates, optional `[Investigator]` console log |
| `src/shared/types.ts` | `InvestigatorConfig`, `Rule`, schema version |
| `src/shared/matcher.ts` | `findMatchingRule` |
| `src/shared/url-match.ts` | URL constraint (substring / regex / glob), path vs full |
| `src/shared/glob-regex.ts` | Glob → `RegExp` |
| `src/shared/templates.ts` | `{{request.*}}`, `{{query.*}}`, `{{vars.*}}`, `{{now.*}}` |
| `src/shared/curl-parse.ts` | Paste-a-cURL parser (options UI) |
| `src/shared/config-store.ts` | Normalize / import |
| `src/shared/match-patterns.ts` | App origin → Chrome match patterns |
| `src/options/` | Settings, rule tester, import/export, cURL, in-app Help, privacy copy |
| `tests/` | Vitest |
| `scripts/pack-extension.mjs` | Web Store zip from `dist/` → `releases/` |
| `README.md` | Contributor / pack / publish overview |
| `RELEASE_CHECKLIST.md` | Version bump, test, pack, store submission |
| `PRIVACY.md` | Store-oriented privacy summary |
| `vite.bridge.config.ts` / `vite.main-world.config.ts` | IIFE content script bundles |

**Rule actions:** `response.action === 'mock'` (default) returns synthetic JSON; `block` makes `fetch` reject with `AbortError` and completes XHR with `status 0` + `error` event. **Global `variables`** feed template placeholders `{{vars.key}}`.

## Critical implementation details

1. **Content scripts** must be **IIFE** files at `dist/bridge.js` and `dist/mainWorld.js` (not ESM).
2. **Config hydration** — Main world waits for the first config `postMessage` (or 3s timeout) before resolving `fetch` / async XHR.
3. **Refresh serialization** — Promise chain for `registerContentScripts`; script IDs derived from origin hash.
4. **Storage** — `chrome.storage.local` → **`investigatorConfig`**.
5. **IPC** — Channel **`INVESTIGATOR_V1`**; runtime **`investigator:refreshScripts`**.

## Out of scope (by design)

**Service worker / web worker** fetches, **`sendBeacon`**, **WebSockets**, **`<img src>`**-style loads, and **Declarative Net Request** (different model; not bundled here). **Per-tab** toggles are not implemented.

## Editing guidelines

Keep diffs focused. After `src/` changes: **`npm run build`** (or `npm test` when touching shared logic). Mention extension reload for manual verification.

When you add user-facing behavior, update **Help & topics** in `src/options/options.html` if applicable, and mention new scripts or flows in **`README.md`** / **`AGENTS.md`**. Bump **PRIVACY.md** version line if permissions or data handling changes.
