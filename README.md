# Investigator

Chrome extension (Manifest V3) for **mocking or blocking** `fetch` and `XMLHttpRequest` on pages you list. You define **rules** (URL substring / regex / glob, optional method, headers, query); the **first matching rule** wins (**lower priority number** runs first). Matching requests can return **mock JSON** (with optional delay and `{{template}}` placeholders) or **fail like a network error**.

**End-user documentation** lives in the extension: open **Settings** → **Help & topics** (collapsible sections). This README is for building, testing, packing, and publishing.

## Requirements

- **Node.js** 20+ (recommended) and npm
- **Chrome** (or Chromium) for loading the unpacked build
- **`zip` CLI** (macOS/Linux usually have it) for `npm run pack`; on Windows use Git Bash, WSL, or [Info-ZIP](http://infozip.sourceforge.net/)

## Quick start

```bash
npm install
npm run build
```

In Chrome: **Extensions** → **Developer mode** → **Load unpacked** → choose the **`dist/`** folder. After code changes, run `npm run build` again and click **Reload** on the extension card.

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Typecheck + main Vite (CRX) build + `bridge.js` / `mainWorld.js` IIFE builds |
| `npm run dev` | Watch mode for all three Vite builds |
| `npm test` | Vitest (`tests/`) |
| `npm run pack` | `build`, then zip `dist/` → `releases/<name>-v<version>-chrome.zip` (see `scripts/pack-extension.mjs`) |
| `npm run pack:zip` | Zip only (expects `dist/` already built) |

Pack output is gitignored under **`releases/`**. The zip root must contain `manifest.json` at the top level (suitable for the Chrome Web Store upload).

## Project layout

| Path | Role |
|------|------|
| `manifest.json` | MV3 manifest (`version` drives pack filename) |
| `src/background/service-worker.ts` | Dynamic content scripts, toolbar badge, refresh queue |
| `src/content/bridge.ts` | Isolated world; `postMessage` config to main world |
| `src/content/main-world.ts` | MAIN world `fetch` / XHR hooks, templates, logging |
| `src/shared/` | Types, matcher, URL/glob, templates, config store, cURL parser, etc. |
| `src/options/` | Full settings UI, rule tester, import/export, in-app **Help & topics** |
| `src/popup/` | Quick interception toggle |
| `src/icons/` | Toolbar / manifest PNGs |
| `vite.config.ts` | CRXJS + main extension bundle |
| `vite.bridge.config.ts` / `vite.main-world.config.ts` | Standalone IIFE bundles |
| `scripts/pack-extension.mjs` | Store-ready zip from `dist/` |
| `AGENTS.md` | Deeper technical notes for contributors / automation |
| `PRIVACY.md` | Privacy summary for store listings and users |

## Publishing (Chrome Web Store)

Use **`RELEASE_CHECKLIST.md`** before each store upload or version tag.

1. Run **`npm run pack`**.
2. Upload the zip from **`releases/`** in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Complete the listing (screenshots, permission justifications, etc.). Host **`PRIVACY.md`** (or equivalent) at a public URL if the dashboard requires a privacy policy link.

Official flow: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish).

## License / version

See `package.json` and `manifest.json` for the current **version** (keep them aligned when you cut a release).
