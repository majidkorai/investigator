import type { InvestigatorConfig, Rule, RuleMatch, UrlPatternMode } from './types';
import { CONFIG_SCHEMA_VERSION, DEFAULT_CONFIG, STORAGE_KEY } from './types';

export async function loadConfig(): Promise<InvestigatorConfig> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const raw = data[STORAGE_KEY];
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_CONFIG);
  return normalizeConfig(raw as InvestigatorConfig);
}

export async function saveConfig(config: InvestigatorConfig): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: normalizeConfig(config) });
}

function normalizeRuleMatch(m: RuleMatch | undefined): RuleMatch {
  const pattern = optString(m?.urlPattern) ?? optString(m?.urlContains);
  const mode: UrlPatternMode =
    m?.urlPatternMode === 'regex' || m?.urlPatternMode === 'glob'
      ? m.urlPatternMode
      : 'substring';

  const out: RuleMatch = {
    method: optString(m?.method)?.toUpperCase(),
    headerName: optString(m?.headerName),
    headerValueContains: optString(m?.headerValueContains),
    queryParam: optString(m?.queryParam),
    queryValueContains: optString(m?.queryValueContains),
  };

  if (pattern) {
    out.urlPattern = pattern;
    out.urlPatternMode = mode;
  }
  if (m?.urlMatchTarget === 'path') out.urlMatchTarget = 'path';
  else if (m?.urlMatchTarget === 'full') out.urlMatchTarget = 'full';

  return out;
}

function normalizeConfig(input: InvestigatorConfig): InvestigatorConfig {
  return {
    interceptionEnabled: Boolean(input.interceptionEnabled),
    interceptLog: Boolean(input.interceptLog),
    variables: normalizeVariables(input.variables),
    appOrigins: Array.isArray(input.appOrigins)
      ? input.appOrigins.map((x) => String(x).trim()).filter(Boolean)
      : [],
    rules: Array.isArray(input.rules)
      ? input.rules.map((r) => ({
          id: String(r.id),
          name: String(r.name ?? ''),
          enabled: Boolean(r.enabled),
          priority: Number.isFinite(Number(r.priority)) ? Number(r.priority) : 1000,
          match: normalizeRuleMatch(r.match),
          response: {
            status: clampStatus(
              Number.isFinite(Number(r.response?.status)) ? Number(r.response?.status) : 200,
            ),
            body: r.response?.body ?? {},
            delayMs: clampDelay(r.response?.delayMs),
            action: r.response?.action === 'block' ? 'block' : 'mock',
            headers:
              r.response?.headers && typeof r.response.headers === 'object'
                ? (r.response.headers as Record<string, string>)
                : undefined,
          },
        }))
      : [],
    configSchemaVersion: CONFIG_SCHEMA_VERSION,
  };
}

function normalizeVariables(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const key = String(k).trim();
    if (!key) continue;
    out[key] = val === undefined || val === null ? '' : String(val);
  }
  return Object.keys(out).length ? out : undefined;
}

function optString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

function clampStatus(code: number): number {
  if (!Number.isFinite(code)) return 200;
  return Math.min(599, Math.max(100, Math.trunc(code)));
}

function clampDelay(ms: unknown): number | undefined {
  if (ms === undefined || ms === null) return undefined;
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(120_000, Math.max(0, Math.trunc(n)));
}

export function parseImportedConfig(raw: unknown): InvestigatorConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.rules)) return null;
  return normalizeConfig({
    interceptionEnabled: Boolean(o.interceptionEnabled),
    interceptLog: Boolean(o.interceptLog),
    variables: o.variables as InvestigatorConfig['variables'],
    appOrigins: Array.isArray(o.appOrigins) ? (o.appOrigins as string[]) : [],
    rules: o.rules as Rule[],
  });
}
