export const STORAGE_KEY = 'investigatorConfig' as const;

export const CONFIG_SCHEMA_VERSION = 3 as const;

export type UrlPatternMode = 'substring' | 'regex' | 'glob';

export type RuleMatch = {
  /**
   Text matched against the request URL (see urlMatchTarget).
   Prefer `urlPattern`; `urlContains` is legacy substring only.
   */
  urlContains?: string;
  /** Interpreted per urlPatternMode; takes precedence over urlContains when set */
  urlPattern?: string;
  urlPatternMode?: UrlPatternMode;
  /** `full` = resolved href; `path` = pathname + search only */
  urlMatchTarget?: 'full' | 'path';
  method?: string;
  headerName?: string;
  headerValueContains?: string;
  queryParam?: string;
  queryValueContains?: string;
};

export type ResponseAction = 'mock' | 'block';

export type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  match: RuleMatch;
  response: {
    status: number;
    body: unknown;
    headers?: Record<string, string>;
    /** Simulated network delay in milliseconds (0–120000) */
    delayMs?: number;
    /** `block` = fail the request (fetch: AbortError; XHR: error, status 0) */
    action?: ResponseAction;
  };
};

export type InvestigatorConfig = {
  interceptionEnabled: boolean;
  appOrigins: string[];
  rules: Rule[];
  /** Log to the page console when a rule mocks a request */
  interceptLog?: boolean;
  configSchemaVersion?: number;
  /**
   * Global string variables for templates: `{{vars.apiBase}}`, etc.
   */
  variables?: Record<string, string>;
};

export const DEFAULT_CONFIG: InvestigatorConfig = {
  interceptionEnabled: false,
  appOrigins: [],
  rules: [],
  interceptLog: false,
  configSchemaVersion: CONFIG_SCHEMA_VERSION,
};
