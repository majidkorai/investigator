# Investigator — Privacy

Last updated for extension version **0.3.x** (see `manifest.json` / `package.json`).

## What Investigator does

Investigator is a developer tool. On **websites you explicitly allow** (the “App pages” list in settings), it injects scripts that can **replace** some `fetch` and `XMLHttpRequest` responses with **mock data you configure**. It helps debug frontends without relying on a live API.

## Data collection and transmission

- Investigator **does not** send your rules, URLs, or page content to a vendor server.
- Your configuration is stored locally in the browser using **`chrome.storage.local`** (on your device, associated with your Chrome profile).
- Mock responses are computed **entirely inside the browser** using your rules.

## Permissions

- **`storage`** — Save and load your settings and rules.
- **`scripting`** — Register content scripts on the origins you approve.
- **Optional host access (`http://*/*`, `https://*/*`)** — Requested **only when you save** app-page patterns; Chrome prompts you. Investigator **cannot** read or modify sites you have not granted access to.

## Limitations (what is not intercepted)

Mocking applies to **`fetch` / `XMLHttpRequest` in the page’s main JavaScript context**. Traffic initiated from **service workers**, **web workers**, or other APIs (e.g. **`sendBeacon`**, **WebSockets**) is **not** covered unless you add future, separate support.

## Contact / updates

Publishers should replace this section with a **support URL** or **contact email** before listing on the Chrome Web Store.

## Open source

If you distribute source code, link to your repository from the store listing so users can review behavior.
