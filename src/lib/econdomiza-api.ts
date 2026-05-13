import { buildDashboardKpisFromMonthlyPayload } from './dashboard-from-monthly';

/**
 * Cliente HTTP do gateway SIMC-AG (substitui public/api.js no bundle Vite).
 * Base: import.meta.env.VITE_SIMCAG_GATEWAY_URL ou window.SIMCAG_GATEWAY (runtime) ou origem atual.
 */

function resolveGatewayBase(): string {
  const explicit = import.meta.env.VITE_SIMCAG_GATEWAY_URL;
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    return explicit.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && (window as unknown as { SIMCAG_GATEWAY?: string }).SIMCAG_GATEWAY) {
    return String((window as unknown as { SIMCAG_GATEWAY: string }).SIMCAG_GATEWAY).replace(/\/$/, '');
  }
  return '';
}

/** Unwrap one or more nested `ApiResponse<T>` layers (`{ success, data }`). */
function unwrapGatewayJson(json: unknown): unknown {
  let cur: unknown = json;
  for (let depth = 0; depth < 8; depth++) {
    if (
      cur &&
      typeof cur === 'object' &&
      'success' in cur &&
      'data' in cur &&
      (cur as { success?: boolean }).success === true
    ) {
      cur = (cur as { data: unknown }).data;
    } else {
      break;
    }
  }
  return cur;
}

function buildQuery(obj: Record<string, unknown> | undefined): string {
  const q = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function parseJsonBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function gatewayMessage(parsed: unknown, fallback: string): string {
  if (parsed && typeof parsed === 'object' && parsed !== null) {
    const o = parsed as { message?: string; errors?: { message?: string }[] };
    if (o.message) return String(o.message);
    if (Array.isArray(o.errors) && o.errors[0]?.message) return String(o.errors[0].message);
  }
  return fallback;
}

function gatewayCorrelationId(parsed: unknown): string | undefined {
  if (parsed && typeof parsed === 'object' && parsed !== null && 'metadata' in parsed) {
    const m = (parsed as { metadata?: { correlationId?: string } }).metadata;
    if (m?.correlationId) return String(m.correlationId);
  }
  return undefined;
}

/** Uma única renovação em voo — fila lógica para requisições paralelas com 401. */
let refreshInFlight: Promise<boolean> | null = null;

function isAuthPathNoRefresh(path: string): boolean {
  const p = path.startsWith('/') ? path : `/${path}`;
  return (
    p === '/api/auth/login' ||
    p === '/api/auth/register' ||
    p === '/api/auth/refresh' ||
    p.startsWith('/api/auth/login') ||
    p.startsWith('/api/auth/register') ||
    p.startsWith('/api/auth/refresh')
  );
}

const EcondomizaApi = {
  baseUrl: resolveGatewayBase(),

  getToken(): string {
    return localStorage.getItem('simcag.accessToken') || '';
  },
  getRefreshToken(): string {
    return localStorage.getItem('simcag.refreshToken') || '';
  },
  setTokens(accessToken: string | undefined, refreshToken: string | undefined) {
    if (accessToken) localStorage.setItem('simcag.accessToken', accessToken);
    if (refreshToken) localStorage.setItem('simcag.refreshToken', refreshToken);
  },
  clearTokens() {
    localStorage.removeItem('simcag.accessToken');
    localStorage.removeItem('simcag.refreshToken');
  },

  resolveUrl(): string {
    const b = resolveGatewayBase();
    if (b) return b;
    if (typeof window !== 'undefined') {
      return window.location.origin.replace(/\/$/, '');
    }
    return '';
  },

  /** Renova access via refresh token. Retorna false se impossível (sem refresh ou 401). */
  async refreshSession(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const base = this.resolveUrl();
      const url = `${base}/api/auth/refresh`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const text = await response.text();
      const parsed = parseJsonBody(text);
      if (!response.ok) {
        return false;
      }
      const inner = unwrapGatewayJson(parsed);
      const payload =
        inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : {};
      const access = payload.accessToken != null ? String(payload.accessToken) : '';
      if (!access) return false;
      const nextRefresh =
        payload.refreshToken != null ? String(payload.refreshToken) : undefined;
      this.setTokens(access, nextRefresh);
      return true;
    })();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  },

  async request<T = unknown>(
    path: string,
    opts: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      isMultipart?: boolean;
      __retriedAfterRefresh?: boolean;
    } = {}
  ): Promise<{ data: T }> {
    const base = this.resolveUrl();
    const urlPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${urlPath}`;
    const { method = 'GET', body = null, headers = {}, isMultipart = false, __retriedAfterRefresh } = opts;
    const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
    const token = this.getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;

    let payload: BodyInit | null = null;
    if (body !== null && body !== undefined) {
      if (body instanceof FormData) {
        payload = body;
        delete finalHeaders['Content-Type'];
      } else if (!isMultipart) {
        finalHeaders['Content-Type'] = 'application/json';
        payload = typeof body === 'string' ? body : JSON.stringify(body);
      } else {
        payload = body as BodyInit;
      }
    }

    const response = await fetch(url, { method, headers: finalHeaders, body: payload });
    const text = await response.text();
    const parsed = parseJsonBody(text);

    if (response.status === 401 && !__retriedAfterRefresh && !isAuthPathNoRefresh(urlPath)) {
      const ok = await this.refreshSession();
      if (ok) {
        return this.request<T>(path, { ...opts, __retriedAfterRefresh: true });
      }
    }

    if (!response.ok) {
      const msg = gatewayMessage(parsed, `HTTP ${response.status}`);
      const err = new Error(msg) as Error & { status?: number; body?: unknown; correlationId?: string };
      err.status = response.status;
      err.body = parsed;
      const cid = gatewayCorrelationId(parsed);
      if (cid) err.correlationId = cid;
      throw err;
    }

    const inner = unwrapGatewayJson(parsed) as T;
    return { data: inner };
  },

  async login(condominioId: string, email: string, password: string) {
    const result = await this.request<Record<string, unknown>>('/api/auth/login', {
      method: 'POST',
      body: { tenantId: condominioId, email, password },
    });
    const payload = result.data && typeof result.data === 'object' ? (result.data as Record<string, unknown>) : {};
    if (payload.accessToken) {
      this.setTokens(
        String(payload.accessToken),
        payload.refreshToken != null ? String(payload.refreshToken) : undefined
      );
    }
    return result;
  },

  lookupCondominios(q: string) {
    const term = q != null && String(q).trim() !== '' ? String(q).trim() : '';
    const qs = term ? `?q=${encodeURIComponent(term)}` : '';
    return this.request(`/api/condominios/lookup${qs}`);
  },

  async register(params: {
    tenantId: string;
    email: string;
    password: string;
    name: string;
    role?: string;
  }) {
    const result = await this.request<Record<string, unknown>>('/api/auth/register', {
      method: 'POST',
      body: {
        tenantId: params.tenantId,
        email: params.email,
        password: params.password,
        name: params.name,
        role: params.role || 'Sindico',
      },
    });
    const payload = result.data && typeof result.data === 'object' ? (result.data as Record<string, unknown>) : {};
    if (payload.accessToken) {
      this.setTokens(
        String(payload.accessToken),
        payload.refreshToken != null ? String(payload.refreshToken) : undefined
      );
    }
    return result;
  },

  async logout() {
    const refreshToken = this.getRefreshToken();
    try {
      await this.request('/api/auth/logout', { method: 'POST', body: { refreshToken } });
    } finally {
      this.clearTokens();
    }
  },

  profile() {
    return this.request('/api/auth/me');
  },

  listCondominios() {
    return this.request('/api/condominios');
  },
  getCondominio(id: string) {
    return this.request(`/api/condominios/${encodeURIComponent(id)}`);
  },

  /** Condomínio do utilizador: `GET /api/auth/me` → `tenantId`, depois `GET /api/condominios/{id}`. */
  async getMyCondominio() {
    const pr = await this.profile();
    const p = pr.data as Record<string, unknown>;
    const tenantId = p.tenantId ?? p.TenantId;
    if (tenantId == null || String(tenantId).trim() === '') {
      throw new Error('Perfil sem tenantId (condomínio).');
    }
    return this.getCondominio(String(tenantId));
  },

  createCondominio(payload: unknown) {
    return this.request('/api/condominios', { method: 'POST', body: payload });
  },

  listConformities(condominioId: string) {
    return this.request(`/api/condominios/${encodeURIComponent(condominioId)}/conformities`);
  },
  addConformity(condominioId: string, payload: unknown) {
    return this.request(`/api/condominios/${encodeURIComponent(condominioId)}/conformities`, {
      method: 'POST',
      body: payload,
    });
  },
  completeConformity(condominioId: string, itemId: string, notes: string) {
    return this.request(
      `/api/condominios/${encodeURIComponent(condominioId)}/conformities/${encodeURIComponent(itemId)}/complete`,
      { method: 'POST', body: { notes } }
    );
  },

  /** KPIs derivados de `GET /api/dashboard/monthly` (alinhado a `public/api.js`). */
  async dashboardSummary(params?: { year?: number }) {
    const y = params?.year ?? new Date().getFullYear();
    const res = await this.request<Record<string, unknown>>(`/api/dashboard/monthly?year=${y}`);
    const payload = res.data as unknown;
    return { data: buildDashboardKpisFromMonthlyPayload(payload) as unknown };
  },

  listExpenses(filters: Record<string, unknown> = {}) {
    return this.request(`/api/expenses${buildQuery(filters)}`);
  },
  getExpense(id: string) {
    return this.request(`/api/expenses/${encodeURIComponent(id)}`);
  },

  listSuppliers(filters: Record<string, unknown> = {}) {
    return this.request(`/api/suppliers${buildQuery(filters)}`);
  },
  getSupplier(id: string) {
    return this.request(`/api/suppliers/${encodeURIComponent(id)}`);
  },

  createSupplier(payload: {
    name: string;
    document: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    category?: string | null;
  }) {
    return this.request<{ id: string }>('/api/suppliers', {
      method: 'POST',
      body: {
        name: payload.name.trim(),
        document: String(payload.document).replace(/\s/g, ''),
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        address: payload.address?.trim() || null,
        category: payload.category?.trim() || null,
      },
    });
  },

  updateSupplier(
    id: string,
    body: {
      name: string;
      document: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      category?: string | null;
    }
  ) {
    return this.request(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: {
        name: body.name.trim(),
        document: String(body.document).replace(/\s/g, ''),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        category: body.category?.trim() || null,
      },
    });
  },

  deactivateSupplier(id: string) {
    return this.request(`/api/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  listAuditLogs(filters: Record<string, unknown> = {}) {
    return this.request(`/api/audit-logs${buildQuery(filters)}`);
  },

  /**
   * Upload alinhado a `DocumentUploadForm` no ingestion-service (`file`, `source`, `origin`, `tenantId`).
   * Campos extra (ex.: `documentType`) não existem no contrato — eram ignorados, mas podiam confundir proxies.
   * Se o downstream responder 404/405 em `/api/ingestion/upload`, tenta `/ingestion/upload` (mesmo controller).
   */
  async uploadDocument(
    file: File,
    options: { documentType?: string; source?: string; origin?: string; tenantId?: string } = {}
  ) {
    const buildForm = async (): Promise<FormData> => {
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('source', options.source ?? 'frontend');
      const origin = options.origin ?? options.documentType ?? '';
      if (origin) form.append('origin', origin);

      let tenantId = options.tenantId?.trim();
      if (!tenantId) {
        try {
          const pr = await this.profile();
          const p = pr.data as Record<string, unknown>;
          const tid = p.tenantId ?? p.TenantId;
          if (tid != null && String(tid).trim() !== '') tenantId = String(tid);
        } catch {
          /* sem perfil — tenant opcional no formulário */
        }
      }
      if (tenantId) form.append('tenantId', tenantId);

      return form;
    };

    const paths = ['/api/ingestion/upload', '/ingestion/upload'];
    let lastErr: unknown;
    for (const path of paths) {
      try {
        const body = await buildForm();
        return await this.request(path, { method: 'POST', body, isMultipart: true });
      } catch (e) {
        lastErr = e;
        const st = (e as { status?: number })?.status;
        if (st !== 404 && st !== 405) throw e;
      }
    }
    throw lastErr;
  },

  listAlerts(params: { page?: number; pageSize?: number; type?: string | null } = {}) {
    const { page = 1, pageSize = 20, type = null } = params;
    return this.request(`/api/alerts${buildQuery({ page, pageSize, type })}`);
  },
  /** Alias usado por páginas legadas */
  listAlertas(params?: { page?: number; pageSize?: number; type?: string | null }) {
    return this.listAlerts(params ?? {});
  },

  markAlertRead(id: string) {
    return this.request(`/api/alerts/${encodeURIComponent(id)}/read`, { method: 'PUT' });
  },
  alertStats() {
    return this.request('/api/alerts/stats');
  },

  async getNotificationPreferences(userIdFromCaller?: string) {
    let userId = userIdFromCaller?.trim();
    if (!userId) {
      const me = await this.request<Record<string, unknown>>('/api/auth/me');
      const inner = (me.data && typeof me.data === 'object' ? me.data : {}) as Record<string, unknown>;
      const id = inner.id ?? inner.Id;
      userId = id != null ? String(id) : '';
    }
    if (!userId) throw new Error('Cannot load notification preferences without user id');
    return this.request(`/api/notifications/preferences${buildQuery({ userId })}`);
  },

  async updateNotificationPreferences(payload: unknown) {
    const body: Record<string, unknown> =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? { ...(payload as Record<string, unknown>) }
        : {};
    if (body.userId == null && body.UserId == null) {
      const me = await this.request<Record<string, unknown>>('/api/auth/me');
      const inner = (me.data && typeof me.data === 'object' ? me.data : {}) as Record<string, unknown>;
      const id = inner.id ?? inner.Id;
      if (id != null) body.userId = String(id);
    }
    return this.request('/api/notifications/preferences', { method: 'PUT', body });
  },

  /** @deprecated use getNotificationPreferences */
  getPreferences(userId?: string) {
    return this.getNotificationPreferences(userId);
  },
  updatePreferences(payload: unknown) {
    return this.updateNotificationPreferences(payload);
  },

  getMonthlyDashboard(year: number) {
    return this.request(`/api/dashboard/monthly?year=${year ?? new Date().getFullYear()}`);
  },
  getCategoryBreakdown(from: string, to: string) {
    return this.request(`/api/dashboard/categories${buildQuery({ from, to })}`);
  },
  getCashFlow(from: string, to: string) {
    return this.request(`/api/dashboard/cash-flow${buildQuery({ from, to })}`);
  },
  getSupplierRanking(params: { top?: number; from?: string; to?: string } = {}) {
    return this.request(`/api/dashboard/suppliers${buildQuery(params as Record<string, unknown>)}`);
  },
  getYearOverYear(yearsBack = 2) {
    return this.request(`/api/dashboard/year-over-year?yearsBack=${yearsBack}`);
  },

  getMarketPrice(params: { category: string; region?: string }) {
    return this.request(`/api/market-data/price${buildQuery(params as Record<string, unknown>)}`);
  },
};

export { EcondomizaApi };
export default EcondomizaApi;