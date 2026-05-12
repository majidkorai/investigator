import type { Rule } from './types';
import { globToRegExp } from './glob-regex';

export function resolveUrlPatternText(rule: Rule['match']): string | undefined {
  const p = rule.urlPattern?.trim() || rule.urlContains?.trim();
  return p || undefined;
}

export function urlConstraintMatches(rule: Rule, parsedUrl: URL): boolean {
  const patternStr = resolveUrlPatternText(rule.match);
  if (!patternStr) return true;

  const mode = rule.match.urlPatternMode ?? 'substring';
  const target =
    (rule.match.urlMatchTarget ?? 'full') === 'path'
      ? `${parsedUrl.pathname}${parsedUrl.search}`
      : parsedUrl.href;

  try {
    if (mode === 'substring') return target.includes(patternStr);
    if (mode === 'regex') return new RegExp(patternStr).test(target);
    if (mode === 'glob') return globToRegExp(patternStr).test(target);
  } catch {
    return false;
  }
  return false;
}
