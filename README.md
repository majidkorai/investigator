# Investigator

Chrome extension (Manifest V3) for **mocking or blocking** `fetch` and `XMLHttpRequest` on pages you list. You define **rules** (URL substring / regex / glob, optional method, headers, query); the **first matching rule** wins (**lower priority number** runs first). Matching requests can return **mock JSON** (with optional delay and `{{template}}` placeholders) or **fail like a network error**.

**Repository:** [github.com/majidkorai/investigator](https://github.com/majidkorai/investigator)

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

## Publishing (Chrome Web Store — unlisted)

This extension is meant to be distributed as an **unlisted** item: it does **not** appear in store search, but anyone with the **direct listing link** can install it (after Google review).

1. Follow **`RELEASE_CHECKLIST.md`** (version bump, `npm test`, `npm run pack`).
2. In the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole), create or update the item and upload the zip from **`releases/`**.
3. In the left sidebar, open **Distribution** and set **Visibility** to **Unlisted** (not in store search; install via direct link). If you only see **email / web** fields, that is usually **support or privacy**, not visibility—use **Distribution** for Public / Unlisted / Private.
4. **Privacy policy URL** (required for listing):  
   `https://github.com/majidkorai/investigator/blob/main/PRIVACY.md`
5. Complete the rest of the form (screenshots, permission justifications, descriptions). Submit for review.
6. After approval, copy the **Chrome Web Store listing URL** and share it with your team. Add that link here in the README in a follow-up commit if you want it documented next to the repo.

**Note:** `manifest.json` **`description`** must be **≤132 characters** for the package upload to succeed (Chrome Web Store limit).

Official guide: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish).

## Repository & contact

- **Source:** [github.com/majidkorai/investigator](https://github.com/majidkorai/investigator)  
- **Contact:** [majidkorai@gmail.com](mailto:majidkorai@gmail.com)

## License / version

See `package.json` and `manifest.json` for the current **version** (keep them aligned when you cut a release).
