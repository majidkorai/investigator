import type { InvestigatorConfig, Rule } from './types';
import { urlConstraintMatches } from './url-match';

export type MatchOptions = {
  /** Pretend interception is on (options page dry-run) */
  forceInterception?: boolean;
  /** Base URL for resolving relative request URLs (e.g. page location href) */
  pageBaseHref?: string;
};

export function findMatchingRule(
  config: InvestigatorConfig,
  url: string,
  method: string,
  headerPairs: Array<[string, string]>,
  options?: MatchOptions,
): Rule | undefined {
  if (!options?.forceInterception && !config.interceptionEnabled) return undefined;

  const sorted = [...config.rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  const upperMethod = method.toUpperCase();
  const base =
    options?.pageBaseHref ??
    (typeof window !== 'undefined' && window.location?.href
      ? window.location.href
      : 'https://example.com/');

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url, base);
  } catch {
    return undefined;
  }

  const headerLookup = new Map<string, string>();
  for (const [k, v] of headerPairs) {
    headerLookup.set(k.toLowerCase(), v);
  }

  for (const rule of sorted) {
    const m = rule.match;
    if (!urlConstraintMatches(rule, parsedUrl)) continue;
    if (m.method && m.method.toUpperCase() !== upperMethod) continue;

    if (m.headerName) {
      const val = headerLookup.get(m.headerName.toLowerCase());
      if (val === undefined) continue;
      if (m.headerValueContains && !val.includes(m.headerValueContains)) {
        continue;
      }
    }

    if (m.queryParam) {
      const q = parsedUrl.searchParams.get(m.queryParam);
      if (q === null) continue;
      if (m.queryValueContains && !q.includes(m.queryValueContains)) {
        continue;
      }
    }

    return rule;
  }

  return undefined;
}
