import { loadConfig, saveConfig } from '../shared/config-store';

const toggle = document.querySelector<HTMLInputElement>('#toggle')!;
const hint = document.querySelector<HTMLParagraphElement>('#hint')!;
const openOptions = document.querySelector<HTMLAnchorElement>('#openOptions')!;

void (async () => {
  const config = await loadConfig();
  toggle.checked = config.interceptionEnabled;
  hint.textContent = config.interceptionEnabled
    ? 'Matching fetch/XHR calls return mock responses.'
    : 'All requests pass through to the network.';
})();

toggle.addEventListener('change', async () => {
  const config = await loadConfig();
  config.interceptionEnabled = toggle.checked;
  await saveConfig(config);
  void chrome.runtime.sendMessage('investigator:refreshScripts');
  hint.textContent = config.interceptionEnabled
    ? 'Matching fetch/XHR calls return mock responses.'
    : 'All requests pass through to the network.';
});

openOptions.addEventListener('click', (e) => {
  e.preventDefault();
  void chrome.runtime.openOptionsPage();
});
