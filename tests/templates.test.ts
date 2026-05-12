import { describe, expect, it } from 'vitest';
import {
  applyTemplatesDeep,
  buildTemplateContext,
} from '../src/shared/templates';

describe('templates', () => {
  it('replaces request and query placeholders', () => {
    const ctx = buildTemplateContext(
      'POST',
      'https://api.example.com/items?foo=bar&x=1',
    );
    expect(
      applyTemplatesDeep('{{request.method}} {{query.foo}}', ctx) as string,
    ).toBe('POST bar');
  });

  it('replaces vars.* from global variables', () => {
    const ctx = buildTemplateContext('GET', 'https://x.test', {
      apiBase: 'https://api.prod',
    });
    expect(applyTemplatesDeep('{{vars.apiBase}}/v1', ctx) as string).toBe(
      'https://api.prod/v1',
    );
  });

  it('walks nested objects', () => {
    const ctx = buildTemplateContext('GET', 'https://x.test?q=hi');
    const out = applyTemplatesDeep({ a: '{{query.q}}', b: [1, '{{now.epoch}}'] }, ctx);
    expect(typeof (out as { b: unknown[] }).b[1]).toBe('string');
    expect((out as { a: string }).a).toBe('hi');
  });
});
