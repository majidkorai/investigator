import { loadConfig } from '../shared/config-store';
import { collectPatternsFromOrigins } from '../shared/match-patterns';
import { STORAGE_KEY, type InvestigatorConfig } from '../shared/types';

const SCRIPT_PREFIX = 'investigator';

/** Built entry names from vite `rollupOptions.input` — must match filenames in `dist/` */
const BRIDGE_FILE = 'bridge.js';
const MAIN_WORLD_FILE = 'mainWorld.js';

/** Chain refreshes — concurrent calls caused duplicate ID registration errors. */
let refreshChain: Promise<void> = Promise.resolve();

function stableScriptId(kind: 'b' | 'm', matchPattern: string): string {
  let h = 0;
  for (let i = 0; i < matchPattern.length; i++) {
    h = (Math.imul(31, h) + matchPattern.charCodeAt(i)) | 0;
  }
  const tag = (h >>> 0).toString(36);
  return `${SCRIPT_PREFIX}-${kind}-${tag}`;
}

function refreshContentScripts(): Promise<void> {
  refreshChain = refreshChain.then(() => refreshContentScriptsInner());
  return refreshChain;
}

async function syncToolbarBadge(config: InvestigatorConfig): Promise<void> {
  try {
    if (config.interceptionEnabled) {
      await chrome.action.setBadgeText({ text: '●' });
      await chrome.action.setBadgeBackgroundColor({ color: '#1d4ed8' });
      await chrome.action.setTitle({
        title: 'Investigator — intercepting matching requests',
      });
    } else {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({
        title: 'Investigator — interception off',
      });
    }
  } catch {
    /* ignore */
  }
}

async function refreshContentScriptsInner(): Promise<void> {
  const config = await loadConfig();
  await syncToolbarBadge(config);

  const patterns = collectPatternsFromOrigins(config.appOrigins);

  await unregisterOurScripts();

  if (patterns.length === 0) {
    return;
  }

  const registrations = patterns.flatMap((matches) => {
    const idB = stableScriptId('b', matches);
    const idM = stableScriptId('m', matches);
    return [
      {
        id: idB,
        matches: [matches],
        js: [BRIDGE_FILE],
        runAt: 'document_start' as const,
        world: 'ISOLATED' as const,
      },
      {
        id: idM,
        matches: [matches],
        js: [MAIN_WORLD_FILE],
        runAt: 'document_start' as const,
        world: 'MAIN' as const,
      },
    ];
  });

  try {
    await chrome.scripting.registerContentScripts(registrations);
  } catch (err) {
    console.error('Investigator: failed to register content scripts', err);
  }
}

async function unregisterOurScripts(): Promise<void> {
  const existing = await chrome.scripting.getRegisteredContentScripts();
  const ours = existing
    .filter((s) => s.id.startsWith(SCRIPT_PREFIX))
    .map((s) => s.id);
  if (ours.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: ours });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void refreshContentScripts();
});

chrome.runtime.onStartup.addListener(() => {
  void refreshContentScripts();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  void refreshContentScripts();
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (message === 'investigator:refreshScripts') {
    void refreshContentScripts().then(() => sendResponse({ ok: true }));
    return true;
  }
  return undefined;
});
