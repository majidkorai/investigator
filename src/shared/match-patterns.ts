/**
 * Normalize user input into a Chrome extension match pattern.
 * Examples: https://localhost:5173 → https://localhost:5173/*
 */
export function toMatchPattern(originInput: string): string | null {
  const trimmed = originInput.trim();
  if (!trimmed) return null;

  let candidate = trimmed;

  if (!/^[a-zA-Z][a-zA-Z+.-]*:\/\//.test(candidate)) {
    if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
      candidate = `http://${trimmed}`;
    } else {
      candidate = `https://${trimmed}`;
    }
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.pathname === '/' || url.pathname === '') {
    return `${url.origin}/*`;
  }

  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return `${url.origin}${path}*`;
}

export function collectPatternsFromOrigins(origins: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of origins) {
    const p = toMatchPattern(raw);
    if (p && !seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}
