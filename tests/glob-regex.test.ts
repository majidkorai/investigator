import { describe, expect, it } from 'vitest';
import { globToRegExp } from '../src/shared/glob-regex';

describe('globToRegExp', () => {
  it('matches literal', () => {
    const re = globToRegExp('https://api.example.com/v1');
    expect(re.test('https://api.example.com/v1')).toBe(true);
    expect(re.test('https://api.example.com/v2')).toBe(false);
  });

  it('supports star wildcard', () => {
    const re = globToRegExp('https://api.example.com/*');
    expect(re.test('https://api.example.com/items')).toBe(true);
    expect(re.test('https://other.com/items')).toBe(false);
  });

  it('supports question single char', () => {
    const re = globToRegExp('https://api.example.co?/x');
    expect(re.test('https://api.example.com/x')).toBe(true);
    expect(re.test('https://api.example.cox/x')).toBe(true);
  });
});
