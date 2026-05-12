import { describe, expect, it } from 'vitest';
import { parseCurl } from '../src/shared/curl-parse';

describe('parseCurl', () => {
  it('parses quoted URL and -X', () => {
    const p = parseCurl(`curl -X POST 'https://api.example.com/items'`);
    expect(p).toEqual({
      url: 'https://api.example.com/items',
      method: 'POST',
      headers: [],
      body: undefined,
    });
  });

  it('parses -H headers', () => {
    const p = parseCurl(
      `curl -H 'Authorization: Bearer x' -H "X-Foo: bar" https://x.test/q`,
    );
    expect(p?.url).toBe('https://x.test/q');
    expect(p?.method).toBe('GET');
    expect(p?.headers).toEqual([
      ['Authorization', 'Bearer x'],
      ['X-Foo', 'bar'],
    ]);
  });

  it('parses --data and upgrades GET to POST', () => {
    const p = parseCurl(`curl https://x.test -d '{"a":1}'`);
    expect(p?.method).toBe('POST');
    expect(p?.body).toBe('{"a":1}');
    expect(p?.url).toBe('https://x.test');
  });

  it('returns null for non-curl', () => {
    expect(parseCurl('wget https://x')).toBeNull();
  });
});
