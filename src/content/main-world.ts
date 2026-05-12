import { DEFAULT_CONFIG, type InvestigatorConfig } from '../shared/types';
import { findMatchingRule } from '../shared/matcher';
import {
  applyTemplatesDeep,
  buildTemplateContext,
} from '../shared/templates';

const CHANNEL = 'INVESTIGATOR_V1';

type MessageConfig = {
  channel: string;
  type: string;
  payload?: InvestigatorConfig;
};

let liveConfig: InvestigatorConfig = DEFAULT_CONFIG;

let configHydrated = false;
const hydrationWaiters: Array<() => void> = [];

function notifyConfigHydrated(): void {
  if (configHydrated) return;
  configHydrated = true;
  for (const w of hydrationWaiters) w();
  hydrationWaiters.length = 0;
}

function whenConfigHydrated(): Promise<void> {
  if (configHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    hydrationWaiters.push(resolve);
  });
}

function mergeHeaders(
  initHeaders?: HeadersInit,
  requestHeaders?: Headers,
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  if (requestHeaders) {
    requestHeaders.forEach((v, k) => pairs.push([k, v]));
  }
  if (initHeaders) {
    const h = new Headers(initHeaders);
    h.forEach((v, k) => pairs.push([k, v]));
  }
  return pairs;
}

async function applyRuleDelay(rule: InvestigatorConfig['rules'][number]): Promise<void> {
  const delay = rule.response.delayMs ?? 0;
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
}

function logRuleHit(
  rule: InvestigatorConfig['rules'][number],
  method: string,
  url: string,
): void {
  if (!liveConfig.interceptLog) return;
  const block = rule.response.action === 'block';
  console.info(
    `[Investigator] ${block ? 'Block' : 'Mock'} “${rule.name}” ${method} ${url}${
      block ? ' → aborted' : ` → HTTP ${rule.response.status}`
    }`,
    { ruleId: rule.id },
  );
}

async function buildSyntheticResponse(
  rule: InvestigatorConfig['rules'][number],
  method: string,
  url: string,
): Promise<Response> {
  const ctx = buildTemplateContext(method, url, liveConfig.variables);
  const body = applyTemplatesDeep(rule.response.body, ctx);
  const headersRaw = rule.response.headers
    ? (applyTemplatesDeep(rule.response.headers, ctx) as Record<string, unknown>)
    : undefined;

  const bodyText =
    typeof body === 'string' ? body : JSON.stringify(body ?? null);

  const headers = new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  if (headersRaw) {
    for (const [k, v] of Object.entries(headersRaw)) {
      if (v !== undefined && v !== null) headers.set(k, String(v));
    }
  }

  return new Response(bodyText, { status: rule.response.status, headers });
}

function xhrCompleteWithError(xhr: XMLHttpRequest): void {
  Object.defineProperty(xhr, 'readyState', {
    configurable: true,
    writable: true,
    value: XMLHttpRequest.DONE,
  });
  Object.defineProperty(xhr, 'status', {
    configurable: true,
    writable: true,
    value: 0,
  });
  Object.defineProperty(xhr, 'statusText', {
    configurable: true,
    writable: true,
    value: '',
  });
  xhr.dispatchEvent(new Event('readystatechange'));
  xhr.dispatchEvent(new Event('error'));
  xhr.dispatchEvent(new Event('loadend'));
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as MessageConfig;
  if (!data || data.channel !== CHANNEL || data.type !== 'config') return;
  if (data.payload && typeof data.payload === 'object') {
    liveConfig = data.payload;
    notifyConfigHydrated();
  }
});

window.setTimeout(() => {
  if (!configHydrated) {
    console.warn(
      'Investigator: no config from bridge yet; requests use defaults until storage syncs.',
    );
    notifyConfigHydrated();
  }
}, 3000);

const origFetch = window.fetch.bind(window);

window.fetch = async function investigatorFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  await whenConfigHydrated();

  const request = input instanceof Request ? input : new Request(input, init);
  const url = request.url;
  const method = request.method;
  const headerPairs = mergeHeaders(init?.headers, request.headers);

  const rule = findMatchingRule(liveConfig, url, method, headerPairs, {
    pageBaseHref: window.location.href,
  });
  if (!rule) {
    return origFetch(input, init);
  }

  logRuleHit(rule, method, url);
  await applyRuleDelay(rule);
  if (rule.response.action === 'block') {
    throw new DOMException('Investigator blocked this request.', 'AbortError');
  }
  return buildSyntheticResponse(rule, method, url);
};

const origOpen = XMLHttpRequest.prototype.open;
const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
const origSend = XMLHttpRequest.prototype.send;

type XhrMeta = {
  method: string;
  url: string;
  headers: Array<[string, string]>;
  async: boolean;
};

const xhrMeta = new WeakMap<XMLHttpRequest, XhrMeta>();

XMLHttpRequest.prototype.open = function (
  method: string,
  url: string | URL,
  async?: boolean,
  username?: string | null,
  password?: string | null,
): void {
  const resolvedUrl = typeof url === 'string' ? url : url.toString();
  const isAsync = async === undefined ? true : Boolean(async);
  xhrMeta.set(this, {
    method: method.toUpperCase(),
    url: resolvedUrl,
    headers: [],
    async: isAsync,
  });
  if (username !== undefined && password !== undefined) {
    origOpen.call(this, method, url, async ?? true, username, password);
  } else {
    origOpen.call(this, method, url, async ?? true);
  }
};

XMLHttpRequest.prototype.setRequestHeader = function (
  name: string,
  value: string,
): void {
  const meta = xhrMeta.get(this);
  if (meta) {
    meta.headers.push([name, value]);
  }
  origSetRequestHeader.call(this, name, value);
};

XMLHttpRequest.prototype.send = function (
  body?: Document | XMLHttpRequestBodyInit | null,
): void {
  const meta = xhrMeta.get(this);
  if (!meta) {
    origSend.call(this, body);
    return;
  }

  const xhrSelf = this;

  const runSend = (): void => {
    let absoluteUrl = meta.url;
    try {
      absoluteUrl = new URL(meta.url, window.location.href).href;
    } catch {
      /* keep relative */
    }

    const rule = findMatchingRule(
      liveConfig,
      absoluteUrl,
      meta.method,
      meta.headers,
      { pageBaseHref: window.location.href },
    );

    if (!rule) {
      origSend.call(xhrSelf, body);
      return;
    }

    logRuleHit(rule, meta.method, absoluteUrl);

    const finishBlock = (): void => {
      xhrCompleteWithError(xhrSelf);
    };

    const runBlock = async (): Promise<void> => {
      await applyRuleDelay(rule);
      finishBlock();
    };

    const runMock = async (): Promise<void> => {
      await applyRuleDelay(rule);
      const synthetic = await buildSyntheticResponse(
        rule,
        meta.method,
        absoluteUrl,
      );
      void synthetic.arrayBuffer().then((buf) => {
        Object.defineProperty(xhrSelf, 'readyState', {
          configurable: true,
          writable: true,
          value: XMLHttpRequest.HEADERS_RECEIVED,
        });
        xhrSelf.dispatchEvent(new Event('readystatechange'));

        Object.defineProperty(xhrSelf, 'status', {
          writable: true,
          configurable: true,
          value: synthetic.status,
        });
        Object.defineProperty(xhrSelf, 'statusText', {
          writable: true,
          configurable: true,
          value: synthetic.statusText || '',
        });
        Object.defineProperty(xhrSelf, 'responseText', {
          writable: true,
          configurable: true,
          value: new TextDecoder().decode(buf),
        });
        Object.defineProperty(xhrSelf, 'response', {
          writable: true,
          configurable: true,
          value: xhrSelf.responseText,
        });

        xhrSelf.getResponseHeader = (name: string) => synthetic.headers.get(name);
        xhrSelf.getAllResponseHeaders = () => {
          const lines: string[] = [];
          synthetic.headers.forEach((v, k) => {
            lines.push(`${k}: ${v}`);
          });
          return lines.join('\r\n');
        };

        Object.defineProperty(xhrSelf, 'readyState', {
          configurable: true,
          writable: true,
          value: XMLHttpRequest.DONE,
        });
        xhrSelf.dispatchEvent(new Event('readystatechange'));
        xhrSelf.dispatchEvent(new Event('load'));
        xhrSelf.dispatchEvent(new Event('loadend'));
      });
    };

    if (rule.response.action === 'block') {
      void runBlock();
      return;
    }
    void runMock();
  };

  if (meta.async) {
    void whenConfigHydrated().then(runSend);
    return;
  }

  runSend();
};
