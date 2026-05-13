/**
 * Chaves canónicas de sessão no browser.
 * Tokens da API (fetch) usam `simcag.*`; contexto React persiste metadados em `econdomiza_*`.
 * `clearAllClientSession` deve ser chamado no logout para evitar estado partido.
 */

export const SESSION_STORAGE_KEYS = {
  profile: 'econdomiza_profile',
  tokens: 'econdomiza_tokens',
  loginCount: 'econdomiza_login_count',
} as const;

export const GATEWAY_TOKEN_KEYS = {
  access: 'simcag.accessToken',
  refresh: 'simcag.refreshToken',
} as const;

export function clearAllClientSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEYS.profile);
  localStorage.removeItem(SESSION_STORAGE_KEYS.tokens);
  localStorage.removeItem(SESSION_STORAGE_KEYS.loginCount);
  localStorage.removeItem(GATEWAY_TOKEN_KEYS.access);
  localStorage.removeItem(GATEWAY_TOKEN_KEYS.refresh);
}
