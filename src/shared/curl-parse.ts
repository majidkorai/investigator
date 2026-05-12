export type ParsedCurl = {
  url: string;
  method: string;
  headers: Array<[string, string]>;
  body?: string;
};

function unescapeQuoted(s: string): string {
  return s.replace(/\\(.)/g, (_, c: string) => c);
}

function extractUrl(s: string): string | null {
  const quoted = [...s.matchAll(/["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]);
  if (quoted.length) return quoted[quoted.length - 1] ?? null;
  const bare = s.match(/https?:\/\/[^\s"'<>]+/gi);
  if (bare?.length) {
    const last = bare[bare.length - 1] ?? '';
    return last.replace(/[,;]+$/, '') || null;
  }
  const pathOnly = s.match(/(?:^|\s)(\/[^\s]+)\s*$/);
  if (pathOnly) return pathOnly[1] ?? null;
  return null;
}

/**
 * Minimal cURL parser for dev workflows (quoted -H, -X, common --data forms).
 */
export function parseCurl(input: string): ParsedCurl | null {
  let s = input.trim().replace(/\\\r?\n/g, ' ');
  if (!/^curl\b/i.test(s)) return null;
  s = s.replace(/^curl\b/i, '').trim();

  let method = 'GET';
  const xMatch = s.match(/(?:^|\s)-X\s+(\w+)/i) ?? s.match(/--request\s+(\w+)/i);
  if (xMatch) method = xMatch[1].toUpperCase();

  const headers: Array<[string, string]> = [];
  const hRe = /(?:-H|--header)\s+(["'])((?:\\.|(?!\1).)*)\1/gi;
  let hm: RegExpExecArray | null;
  while ((hm = hRe.exec(s)) !== null) {
    const line = unescapeQuoted(hm[2]);
    const ci = line.indexOf(':');
    if (ci > 0) {
      headers.push([line.slice(0, ci).trim(), line.slice(ci + 1).trim()]);
    }
  }

  let body: string | undefined;
  const dataRe =
    /(?:--data-raw|--data-binary|--data|-d)\s+(["'])((?:\\.|(?!\1).)*)\1/i;
  const dm = dataRe.exec(s);
  if (dm) {
    body = unescapeQuoted(dm[2]);
    if (method === 'GET') method = 'POST';
  }

  const url = extractUrl(s);
  if (!url) return null;

  return { url, method, headers, body };
}
