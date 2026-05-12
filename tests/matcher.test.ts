import { describe, expect, it } from 'vitest';
import { findMatchingRule } from '../src/shared/matcher';
import type { InvestigatorConfig, Rule } from '../src/shared/types';

const baseRule = (over: Partial<Rule> = {}): Rule => ({
  id: '1',
  name: 'r',
  enabled: true,
  priority: 10,
  match: { urlPattern: 'api.example.com', urlPatternMode: 'substring' },
  response: { status: 200, body: {} },
  ...over,
});

describe('findMatchingRule', () => {
  const config: InvestigatorConfig = {
    interceptionEnabled: true,
    appOrigins: [],
    rules: [],
    interceptLog: false,
  };

  it('matches substring on full URL', () => {
    const c = {
      ...config,
      rules: [baseRule()],
    };
    const r = findMatchingRule(
      c,
      'https://api.example.com/items',
      'GET',
      [],
      { pageBaseHref: 'https://app.test/' },
    );
    expect(r?.id).toBe('1');
  });

  it('matches path-only target', () => {
    const c = {
      ...config,
      rules: [
        baseRule({
          match: {
            urlPattern: '/v1/items',
            urlPatternMode: 'substring',
            urlMatchTarget: 'path',
          },
        }),
      ],
    };
    const r = findMatchingRule(
      c,
      'https://other.example/v1/items?x=1',
      'GET',
      [],
      { pageBaseHref: 'https://app.test/' },
    );
    expect(r?.id).toBe('1');
  });

  it('respects regex mode', () => {
    const c = {
      ...config,
      rules: [
        baseRule({
          match: { urlPattern: '^https://api\\.example\\.com/v\\d+/items$', urlPatternMode: 'regex' },
        }),
      ],
    };
    expect(
      findMatchingRule(c, 'https://api.example.com/v2/items', 'GET', [], {
        pageBaseHref: 'https://app.test/',
      })?.id,
    ).toBe('1');
    expect(
      findMatchingRule(c, 'https://api.example.com/other', 'GET', [], {
        pageBaseHref: 'https://app.test/',
      }),
    ).toBeUndefined();
  });

  it('forceInterception bypasses master switch', () => {
    const c = {
      ...config,
      interceptionEnabled: false,
      rules: [baseRule()],
    };
    const r = findMatchingRule(
      c,
      'https://api.example.com/x',
      'GET',
      [],
      { forceInterception: true, pageBaseHref: 'https://app.test/' },
    );
    expect(r?.id).toBe('1');
  });
});
