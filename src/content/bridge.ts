import { DEFAULT_CONFIG, STORAGE_KEY, type InvestigatorConfig } from '../shared/types';

const CHANNEL = 'INVESTIGATOR_V1';

function sendConfig(config: InvestigatorConfig): void {
  window.postMessage(
    { channel: CHANNEL, type: 'config', payload: config },
    '*',
  );
}

async function readAndPush(): Promise<void> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const raw = data[STORAGE_KEY];
  const config: InvestigatorConfig =
    raw && typeof raw === 'object'
      ? (raw as InvestigatorConfig)
      : DEFAULT_CONFIG;
  sendConfig(config);
}

void readAndPush();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  const next = changes[STORAGE_KEY].newValue;
  sendConfig(
    next && typeof next === 'object'
      ? (next as InvestigatorConfig)
      : DEFAULT_CONFIG,
  );
});
