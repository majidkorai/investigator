import { parseCurl } from '../shared/curl-parse';
import { collectPatternsFromOrigins } from '../shared/match-patterns';
import { loadConfig, parseImportedConfig, saveConfig } from '../shared/config-store';
import { findMatchingRule } from '../shared/matcher';
import type { InvestigatorConfig, Rule, UrlPatternMode } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';
import { resolveUrlPatternText } from '../shared/url-match';

const els = {
  interceptionEnabled: document.querySelector<HTMLInputElement>('#interceptionEnabled')!,
  interceptLog: document.querySelector<HTMLInputElement>('#interceptLog')!,
  appOrigins: document.querySelector<HTMLTextAreaElement>('#appOrigins')!,
  rules: document.querySelector<HTMLDivElement>('#rules')!,
  addRule: document.querySelector<HTMLButtonElement>('#addRule')!,
  save: document.querySelector<HTMLButtonElement>('#save')!,
  status: document.querySelector<HTMLSpanElement>('#status')!,
  permHint: document.querySelector<HTMLParagraphElement>('#permHint')!,
  dryMethod: document.querySelector<HTMLInputElement>('#dryMethod')!,
  dryBase: document.querySelector<HTMLInputElement>('#dryBase')!,
  dryUrl: document.querySelector<HTMLInputElement>('#dryUrl')!,
  dryHeaders: document.querySelector<HTMLTextAreaElement>('#dryHeaders')!,
  dryRun: document.querySelector<HTMLButtonElement>('#dryRun')!,
  dryResult: document.querySelector<HTMLPreElement>('#dryResult')!,
  exportConfig: document.querySelector<HTMLButtonElement>('#exportConfig')!,
  importConfig: document.querySelector<HTMLInputElement>('#importConfig')!,
  globalVars: document.querySelector<HTMLTextAreaElement>('#globalVars')!,
  curlInput: document.querySelector<HTMLTextAreaElement>('#curlInput')!,
  curlToTester: document.querySelector<HTMLButtonElement>('#curlToTester')!,
  curlToRule: document.querySelector<HTMLButtonElement>('#curlToRule')!,
};

let draft: InvestigatorConfig = structuredClone(DEFAULT_CONFIG);

function ruleUrlInputValue(rule: Rule): string {
  return rule.match.urlPattern ?? rule.match.urlContains ?? '';
}

function setStatus(text: string, kind: 'idle' | 'ok' | 'err') {
  els.status.textContent = text;
  els.status.classList.remove('ok', 'err');
  if (kind === 'ok') els.status.classList.add('ok');
  if (kind === 'err') els.status.classList.add('err');
}

function originsFromTextarea(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function textareaFromOrigins(origins: string[]): string {
  return origins.join('\n');
}

function variablesFromTextarea(text: string): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    const colon = t.indexOf(':');
    if (eq > 0 && (colon < 0 || eq < colon)) {
      const k = t.slice(0, eq).trim();
      if (k) out[k] = t.slice(eq + 1).trim();
    } else if (colon > 0) {
      const k = t.slice(0, colon).trim();
      if (k) out[k] = t.slice(colon + 1).trim();
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function textareaFromVariables(vars: Record<string, string> | undefined): string {
  if (!vars || !Object.keys(vars).length) return '';
  return Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

function makeField(label: string, input: HTMLElement): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const lab = document.createElement('label');
  lab.textContent = label;
  wrap.append(lab, input);
  return wrap;
}

function renderRules() {
  els.rules.replaceChildren();

  if (draft.rules.length === 0) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'No rules yet. Add a rule to match request URLs and return mock JSON.';
    els.rules.append(p);
    return;
  }

  const sorted = [...draft.rules].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  for (const rule of sorted) {
    const card = document.createElement('div');
    card.className = 'rule-card';
    card.dataset.ruleId = rule.id;

    const titleRow = document.createElement('div');
    titleRow.style.display = 'flex';
    titleRow.style.alignItems = 'center';
    titleRow.style.gap = '0.75rem';
    titleRow.style.marginBottom = '0.5rem';

    const h3 = document.createElement('h3');
    h3.textContent = rule.name || 'Untitled rule';
    titleRow.append(h3);

    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = rule.enabled;
    enabled.title = 'Enabled';
    titleRow.append(enabled);

    card.append(titleRow);

    const nameIn = document.createElement('input');
    nameIn.type = 'text';
    nameIn.value = rule.name;
    nameIn.placeholder = 'Rule name';

    const priIn = document.createElement('input');
    priIn.type = 'number';
    priIn.value = String(rule.priority);
    priIn.title = 'Priority (lower runs first)';

    const topGrid = document.createElement('div');
    topGrid.className = 'grid';
    topGrid.append(makeField('Name', nameIn), makeField('Priority', priIn));
    card.append(topGrid);

    const urlPatternIn = document.createElement('input');
    urlPatternIn.type = 'text';
    urlPatternIn.value = ruleUrlInputValue(rule);
    urlPatternIn.placeholder = 'https://api.example.com/items or /api/* glob';

    const urlModeSel = document.createElement('select');
    const modes: { v: UrlPatternMode; label: string }[] = [
      { v: 'substring', label: 'Substring' },
      { v: 'regex', label: 'Regex' },
      { v: 'glob', label: 'Glob (full string)' },
    ];
    for (const { v, label } of modes) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = label;
      urlModeSel.append(o);
    }
    urlModeSel.value = rule.match.urlPatternMode ?? 'substring';

    const urlTargetSel = document.createElement('select');
    for (const [v, label] of [
      ['full', 'Match: full URL'],
      ['path', 'Match: path + query only'],
    ] as const) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = label;
      urlTargetSel.append(o);
    }
    urlTargetSel.value = rule.match.urlMatchTarget ?? 'full';

    const methodIn = document.createElement('input');
    methodIn.type = 'text';
    methodIn.value = rule.match.method ?? '';
    methodIn.placeholder = 'GET, POST, …';

    const hn = document.createElement('input');
    hn.type = 'text';
    hn.value = rule.match.headerName ?? '';
    hn.placeholder = 'Header name';

    const hv = document.createElement('input');
    hv.type = 'text';
    hv.value = rule.match.headerValueContains ?? '';
    hv.placeholder = 'Header value contains';

    const qp = document.createElement('input');
    qp.type = 'text';
    qp.value = rule.match.queryParam ?? '';
    qp.placeholder = 'Query param name';

    const qv = document.createElement('input');
    qv.type = 'text';
    qv.value = rule.match.queryValueContains ?? '';
    qv.placeholder = 'Query value contains';

    const matchGrid = document.createElement('div');
    matchGrid.className = 'grid';
    matchGrid.append(
      makeField('URL pattern', urlPatternIn),
      makeField('URL pattern mode', urlModeSel),
      makeField('URL match target', urlTargetSel),
      makeField('Method (optional)', methodIn),
      makeField('Header name (optional)', hn),
      makeField('Header value contains (optional)', hv),
      makeField('Query param (optional)', qp),
      makeField('Query value contains (optional)', qv),
    );
    card.append(matchGrid);

    const statusIn = document.createElement('input');
    statusIn.type = 'number';
    statusIn.value = String(rule.response.status);

    const delayIn = document.createElement('input');
    delayIn.type = 'number';
    delayIn.min = '0';
    delayIn.max = '120000';
    delayIn.placeholder = '0';
    delayIn.value =
      rule.response.delayMs !== undefined ? String(rule.response.delayMs) : '';

    const actionSel = document.createElement('select');
    for (const [val, lab] of [
      ['mock', 'Return mock JSON'],
      ['block', 'Block request (network error)'],
    ] as const) {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = lab;
      actionSel.append(o);
    }
    actionSel.value = rule.response.action === 'block' ? 'block' : 'mock';

    const bodyTa = document.createElement('textarea');
    bodyTa.className = 'rule-body-json';
    bodyTa.rows = 6;
    try {
      bodyTa.value = JSON.stringify(rule.response.body ?? {}, null, 2);
    } catch {
      bodyTa.value = String(rule.response.body ?? '');
    }

    const respGrid = document.createElement('div');
    respGrid.className = 'grid';
    respGrid.append(
      makeField('On match', actionSel),
      makeField('Response status', statusIn),
      makeField('Delay (ms, optional)', delayIn),
    );
    card.append(respGrid);
    card.append(
      makeField(
        'Response JSON ({{request.url}}, {{query.x}}, {{vars.name}}, {{now.iso}}, …; ignored when blocking)',
        bodyTa,
      ),
    );

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn danger';
    del.textContent = 'Delete rule';
    del.addEventListener('click', () => {
      draft.rules = draft.rules.filter((r) => r.id !== rule.id);
      renderRules();
    });

    const actions = document.createElement('div');
    actions.className = 'rule-actions';
    actions.append(del);
    card.append(actions);

    const sync = () => {
      const target = draft.rules.find((r) => r.id === rule.id);
      if (!target) return;
      target.name = nameIn.value.trim();
      target.enabled = enabled.checked;
      target.priority = Number(priIn.value) || 0;

      const p = urlPatternIn.value.trim();
      const mode = urlModeSel.value as UrlPatternMode;
      const t = urlTargetSel.value as 'full' | 'path';
      target.match = {
        ...(p ? { urlPattern: p, urlPatternMode: mode } : {}),
        urlMatchTarget: t === 'path' ? 'path' : undefined,
        method: methodIn.value.trim() || undefined,
        headerName: hn.value.trim() || undefined,
        headerValueContains: hv.value.trim() || undefined,
        queryParam: qp.value.trim() || undefined,
        queryValueContains: qv.value.trim() || undefined,
      };

      const code = Number(statusIn.value);
      target.response.status = Number.isFinite(code) ? code : 200;
      const d = delayIn.value.trim();
      if (!d) target.response.delayMs = undefined;
      else {
        const n = Number(d);
        target.response.delayMs =
          Number.isFinite(n) && n > 0 ? Math.min(120_000, Math.trunc(n)) : undefined;
      }
      target.response.action = actionSel.value === 'block' ? 'block' : 'mock';
      try {
        const parsed = JSON.parse(bodyTa.value || '{}');
        target.response.body = parsed;
      } catch {
        /* keep previous until save validates */
      }
      h3.textContent = target.name || 'Untitled rule';
    };

    card.addEventListener('change', sync);
    card.addEventListener('input', sync);

    els.rules.append(card);
  }
}

function addRule() {
  const rule: Rule = {
    id: crypto.randomUUID(),
    name: 'New rule',
    enabled: true,
    priority: (draft.rules.reduce((m, r) => Math.max(m, r.priority), 0) || 0) + 10,
    match: { urlPattern: 'https://api.example.com/', urlPatternMode: 'substring' },
    response: { status: 200, body: { mock: true }, action: 'mock' },
  };
  draft.rules.push(rule);
  renderRules();
}

function parseHeaderLines(text: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const i = t.indexOf(':');
    if (i <= 0) continue;
    const name = t.slice(0, i).trim();
    const value = t.slice(i + 1).trim();
    if (name) pairs.push([name, value]);
  }
  return pairs;
}

function runDryTest() {
  for (const card of Array.from(els.rules.querySelectorAll('.rule-card'))) {
    card.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const url = els.dryUrl.value.trim();
  const method = els.dryMethod.value.trim() || 'GET';
  const base = els.dryBase.value.trim() || `${window.location.origin}/`;

  if (!url) {
    els.dryResult.textContent = 'Enter a request URL.';
    return;
  }

  const headers = parseHeaderLines(els.dryHeaders.value);
  const previewConfig: InvestigatorConfig = {
    ...draft,
    interceptionEnabled: true,
  };

  const matched = findMatchingRule(previewConfig, url, method, headers, {
    forceInterception: true,
    pageBaseHref: base,
  });

  if (!matched) {
    els.dryResult.textContent = 'No enabled rule matched this request (with interception forced on).';
    return;
  }

  const p = resolveUrlPatternText(matched.match);
  const action =
    matched.response.action === 'block' ? 'block (fetch: AbortError, XHR: error)' : 'mock JSON';
  els.dryResult.textContent = [
    `Matched rule: “${matched.name}” (priority ${matched.priority}, id ${matched.id})`,
    `URL pattern: [${matched.match.urlPatternMode ?? 'substring'}] ${p ?? '(none)'} — target: ${matched.match.urlMatchTarget ?? 'full'}`,
    `Action: ${action}`,
    `HTTP status (mock only): ${matched.response.status}`,
    `Delay ms: ${matched.response.delayMs ?? 0}`,
    `Response body (stored JSON, templates not expanded in tester):\n${JSON.stringify(matched.response.body, null, 2)}`,
  ].join('\n');
}

async function refreshPermHint() {
  const patterns = collectPatternsFromOrigins(draft.appOrigins);
  if (patterns.length === 0) {
    els.permHint.textContent =
      'Add at least one app page and save so the extension can inject on those origins.';
    return;
  }
  const has = await chrome.permissions.contains({ origins: patterns });
  els.permHint.textContent = has
    ? `Host access is granted for ${patterns.length} pattern(s).`
    : 'After saving, approve the prompt so Investigator can run on your app pages.';
}

async function loadUi() {
  draft = await loadConfig();
  els.interceptionEnabled.checked = draft.interceptionEnabled;
  els.interceptLog.checked = Boolean(draft.interceptLog);
  els.globalVars.value = textareaFromVariables(draft.variables);
  els.appOrigins.value = textareaFromOrigins(draft.appOrigins);
  renderRules();
  void refreshPermHint();
}

function validateBeforeSave(): string | null {
  for (const card of Array.from(document.querySelectorAll('.rule-card'))) {
    const ta = card.querySelector('.rule-body-json') as HTMLTextAreaElement | null;
    if (!ta) continue;
    try {
      JSON.parse(ta.value || '{}');
    } catch {
      return 'Fix invalid JSON in a rule response body before saving.';
    }
  }

  for (const r of draft.rules) {
    const mode = r.match.urlPatternMode ?? 'substring';
    const p = resolveUrlPatternText(r.match);
    if (mode === 'regex' && p) {
      try {
        void new RegExp(p);
      } catch {
        return `Rule "${r.name || r.id}" has an invalid regular expression.`;
      }
    }
    try {
      JSON.stringify(r.response.body);
    } catch {
      return `Rule "${r.name || r.id}" has a response body that cannot be serialized.`;
    }
  }
  for (const r of draft.rules) {
    const m = r.match;
    const hasAny =
      resolveUrlPatternText(m) ||
      m.method ||
      m.headerName ||
      m.queryParam;
    if (!hasAny) {
      return `Rule "${r.name || r.id}" needs at least one match field (URL pattern, method, header, or query).`;
    }
  }
  return null;
}

async function onSave() {
  draft.interceptionEnabled = els.interceptionEnabled.checked;
  draft.interceptLog = els.interceptLog.checked;
  draft.variables = variablesFromTextarea(els.globalVars.value);
  draft.appOrigins = originsFromTextarea(els.appOrigins.value);

  for (const card of Array.from(els.rules.querySelectorAll('.rule-card'))) {
    card.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const err = validateBeforeSave();
  if (err) {
    setStatus(err, 'err');
    return;
  }

  const patterns = collectPatternsFromOrigins(draft.appOrigins);
  if (patterns.length > 0) {
    const allowed = await chrome.permissions.contains({ origins: patterns });
    if (!allowed) {
      const granted = await chrome.permissions.request({ origins: patterns });
      if (!granted) {
        setStatus('Permission not granted; config saved but injection may not run on those pages.', 'err');
        await saveConfig(draft);
        void chrome.runtime.sendMessage('investigator:refreshScripts');
        void refreshPermHint();
        return;
      }
    }
  }

  await saveConfig(draft);
  void chrome.runtime.sendMessage('investigator:refreshScripts');
  setStatus('Saved.', 'ok');
  void refreshPermHint();
}

function exportJson() {
  for (const card of Array.from(els.rules.querySelectorAll('.rule-card'))) {
    card.dispatchEvent(new Event('input', { bubbles: true }));
  }
  draft.variables = variablesFromTextarea(els.globalVars.value);
  const payload = {
    ...draft,
    exportedAt: new Date().toISOString(),
    extension: 'investigator',
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `investigator-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus('Exported.', 'ok');
}

function curlApplyToTester() {
  const p = parseCurl(els.curlInput.value);
  if (!p) {
    setStatus('Could not parse cURL. Start with “curl” and include a URL.', 'err');
    return;
  }
  els.dryMethod.value = p.method;
  els.dryUrl.value = p.url;
  els.dryHeaders.value = p.headers.map(([a, b]) => `${a}: ${b}`).join('\n');
  setStatus('Rule tester filled from cURL.', 'ok');
}

function curlCreateRule() {
  const p = parseCurl(els.curlInput.value);
  if (!p) {
    setStatus('Could not parse cURL.', 'err');
    return;
  }
  const rule: Rule = {
    id: crypto.randomUUID(),
    name: 'From cURL',
    enabled: true,
    priority: (draft.rules.reduce((m, r) => Math.max(m, r.priority), 0) || 0) + 10,
    match: {
      urlPattern: p.url,
      urlPatternMode: 'substring',
      method: p.method,
    },
    response: { status: 200, body: { mock: true }, action: 'mock' },
  };
  if (p.headers.length === 1) {
    const [k, v] = p.headers[0]!;
    rule.match.headerName = k;
    rule.match.headerValueContains = v;
  }
  draft.rules.push(rule);
  renderRules();
  setStatus('Rule added — review match fields and Save.', 'ok');
}

els.addRule.addEventListener('click', addRule);
els.save.addEventListener('click', () => void onSave());
els.dryRun.addEventListener('click', runDryTest);
els.exportConfig.addEventListener('click', exportJson);
els.curlToTester.addEventListener('click', curlApplyToTester);
els.curlToRule.addEventListener('click', curlCreateRule);

els.importConfig.addEventListener('change', () => {
  const file = els.importConfig.files?.[0];
  els.importConfig.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result ?? '');
      const raw = JSON.parse(text) as unknown;
      const parsed = parseImportedConfig(raw);
      if (!parsed) {
        setStatus('Import failed: not a valid Investigator config.', 'err');
        return;
      }
      if (!window.confirm('Replace the current settings in this editor with the imported file? (You still need Save.)')) {
        return;
      }
      draft = parsed;
      els.interceptionEnabled.checked = draft.interceptionEnabled;
      els.interceptLog.checked = Boolean(draft.interceptLog);
      els.globalVars.value = textareaFromVariables(draft.variables);
      els.appOrigins.value = textareaFromOrigins(draft.appOrigins);
      renderRules();
      setStatus('Imported into editor. Click Save to apply.', 'ok');
    } catch {
      setStatus('Import failed: could not read JSON.', 'err');
    }
  };
  reader.readAsText(file);
});

void loadUi();
