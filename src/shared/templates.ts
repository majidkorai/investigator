export type TemplateContext = {
  request: { method: string; url: string };
  query: Record<string, string>;
  vars: Record<string, string>;
};

export function buildTemplateContext(
  method: string,
  url: string,
  variables?: Record<string, string>,
): TemplateContext {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    u = new URL(url, 'https://investigator.invalid/');
  }
  const query: Record<string, string> = {};
  u.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  const vars = variables && typeof variables === 'object' ? { ...variables } : {};
  return { request: { method, url }, query, vars };
}

const PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g;

export function applyTemplatesToString(s: string, ctx: TemplateContext): string {
  const now = new Date();
  return s.replace(PLACEHOLDER, (_, raw: string) => {
    const key = raw.trim();
    if (key === 'request.method') return ctx.request.method;
    if (key === 'request.url') return ctx.request.url;
    if (key === 'now.iso') return now.toISOString();
    if (key === 'now.epoch') return String(Math.floor(now.getTime() / 1000));
    if (key === 'now.ms') return String(now.getTime());
    const qm = key.match(/^query\.(.+)$/);
    if (qm) return ctx.query[qm[1]] ?? '';
    const vm = key.match(/^vars\.(.+)$/);
    if (vm) return ctx.vars[vm[1]] ?? '';
    return '';
  });
}

export function applyTemplatesDeep(value: unknown, ctx: TemplateContext): unknown {
  if (typeof value === 'string') return applyTemplatesToString(value, ctx);
  if (Array.isArray(value)) return value.map((x) => applyTemplatesDeep(x, ctx));
  if (value !== null && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = applyTemplatesDeep(v, ctx);
    }
    return out;
  }
  return value;
}
