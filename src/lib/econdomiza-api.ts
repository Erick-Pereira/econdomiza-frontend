import {
  fetchDashboardSummaryWithFallback,
  type DashboardSummaryResult,
} from './api/dashboard-summary-fetch';
import { DEFAULT_REGISTER_ROLE, type TenantRole } from '../domain/auth-roles';
import {
  buildQuery,
  gatewayCorrelationId,
  gatewayMessage,
  parseJsonBody,
  unwrapGatewayJson,
} from './http';
import { GatewayHttpError, isAuthPathNoRefresh, resolveGatewayBase } from './gateway';

function unwrapNestedApiSuccessPayload(payload: unknown): unknown {
  let cur: unknown = payload;
  for (let i = 0; i < 6; i++) {
    if (
      cur &&
      typeof cur === 'object' &&
      'success' in cur &&
      (cur as { success?: boolean }).success === true &&
      'data' in cur
    ) {
      cur = (cur as { data: unknown }).data;
    } else {
      break;
    }
  }
  return cur;
}

export type { DashboardSummaryResult };

/**
 * Cliente HTTP do gateway SIMC-AG (substitui public/api.js no bundle Vite).
 * Base: import.meta.env.VITE_SIMCAG_GATEWAY_URL ou window.SIMCAG_GATEWAY (runtime) ou origem atual.
 */

/** Uma única renovação em voo — fila lógica para requisições paralelas com 401. */
let refreshInFlight: Promise<boolean> | null = null;

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
      cache?: RequestCache;
      __retriedAfterRefresh?: boolean;
    } = {}
  ): Promise<{ data: T }> {
    const base = this.resolveUrl();
    const urlPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${urlPath}`;
    const { method = 'GET', body = null, headers = {}, isMultipart = false, __retriedAfterRefresh } = opts;
    const isGet = method.toUpperCase() === 'GET';
    const requestCache = opts.cache ?? (isGet ? 'no-store' : 'default');
    const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
    const token = this.getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
    if (isGet) {
      finalHeaders['Cache-Control'] ??= 'no-cache';
      finalHeaders.Pragma ??= 'no-cache';
    }

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

    const response = await fetch(url, { method, headers: finalHeaders, body: payload, cache: requestCache });
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
      const cid = gatewayCorrelationId(parsed);
      throw new GatewayHttpError(msg, {
        status: response.status,
        body: parsed,
        ...(cid ? { correlationId: cid } : {}),
      });
    }

    const inner = unwrapGatewayJson(parsed) as T;
    return { data: inner };
  },

  async downloadReport(
    period: 'monthly' | 'quarterly' | 'annual',
    params: Record<string, unknown> = {},
    retriedAfterRefresh = false
  ): Promise<{ blob: Blob; filename: string }> {
    const base = this.resolveUrl();
    const url = `${base}/api/reports/${period}${buildQuery(params)}`;
    const headers: Record<string, string> = { Accept: 'application/pdf' };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (response.status === 401 && !retriedAfterRefresh) {
      const ok = await this.refreshSession();
      if (ok) return this.downloadReport(period, params, true);
    }

    if (!response.ok) {
      const text = await response.text();
      const parsed = parseJsonBody(text);
      const msg = gatewayMessage(parsed, `HTTP ${response.status}`);
      const cid = gatewayCorrelationId(parsed);
      throw new GatewayHttpError(msg, {
        status: response.status,
        body: parsed,
        ...(cid ? { correlationId: cid } : {}),
      });
    }

    const disposition = response.headers.get('Content-Disposition') ?? '';
    const filenameMatch = /filename="?([^";]+)"?/i.exec(disposition);
    return {
      blob: await response.blob(),
      filename: filenameMatch?.[1] ?? `relatorio_${period}.pdf`,
    };
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
    role?: TenantRole;
  }) {
    const result = await this.request<Record<string, unknown>>('/api/auth/register', {
      method: 'POST',
      body: {
        tenantId: params.tenantId,
        email: params.email,
        password: params.password,
        name: params.name,
        role: params.role ?? DEFAULT_REGISTER_ROLE,
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
  reopenConformity(condominioId: string, itemId: string) {
    return this.request(
      `/api/condominios/${encodeURIComponent(condominioId)}/conformities/${encodeURIComponent(itemId)}/reopen`,
      { method: 'POST' }
    );
  },

  /**
   * KPIs do dashboard: tenta `GET /api/dashboard/summary` (contrato em `docs/api-contracts.md`);
   * se o gateway devolver 404/405/501, mantém compatibilidade com `GET /api/dashboard/monthly`.
   */
  async dashboardSummary(params?: { year?: number }): Promise<DashboardSummaryResult> {
    const y = params?.year ?? new Date().getFullYear();
    return fetchDashboardSummaryWithFallback((path, opts) => this.request(path, opts), y);
  },

  listExpenses(filters: Record<string, unknown> = {}) {
    return this.request(`/api/expenses${buildQuery(filters)}`);
  },
  getExpense(id: string) {
    return this.request(`/api/expenses/${encodeURIComponent(id)}`);
  },

  /** Snapshot de conformidade operacional (processing-service). */
  getExpenseCompliance(expenseId: string) {
    return this.request(`/api/expenses/${encodeURIComponent(expenseId)}/compliance`);
  },

  reevaluateExpenseCompliance(expenseId: string) {
    return this.request(`/api/expenses/${encodeURIComponent(expenseId)}/compliance/reevaluate`, {
      method: 'POST',
    });
  },

  waiveExpenseComplianceFinding(expenseId: string, findingId: string, reason: string) {
    return this.request(
      `/api/expenses/${encodeURIComponent(expenseId)}/compliance/findings/${encodeURIComponent(findingId)}/waive`,
      { method: 'POST', body: { reason } }
    );
  },

  addExpenseComplianceComment(expenseId: string, findingId: string, body: string) {
    return this.request(
      `/api/expenses/${encodeURIComponent(expenseId)}/compliance/findings/${encodeURIComponent(findingId)}/comments`,
      { method: 'POST', body: { body } }
    );
  },

  setExpenseComplianceEvidence(expenseId: string, findingId: string, documentIds: string[]) {
    return this.request(
      `/api/expenses/${encodeURIComponent(expenseId)}/compliance/findings/${encodeURIComponent(findingId)}/evidence`,
      { method: 'PUT', body: { documentIds } }
    );
  },

  complianceDashboard() {
    return this.request('/api/compliance/dashboard');
  },

  complianceFindings(filters: Record<string, unknown> = {}) {
    return this.request(`/api/compliance/findings${buildQuery(filters)}`);
  },

  complianceRules() {
    return this.request('/api/compliance/rules');
  },

  approveExpense(id: string) {
    return this.request(`/api/expenses/${encodeURIComponent(id)}/approve`, { method: 'PUT' });
  },

  rejectExpense(id: string, reason: string) {
    return this.request(`/api/expenses/${encodeURIComponent(id)}/reject`, {
      method: 'PUT',
      body: { reason },
    });
  },

  cancelExpense(id: string, reason: string) {
    return this.request(`/api/expenses/${encodeURIComponent(id)}/cancel`, {
      method: 'PUT',
      body: { reason },
    });
  },

  retryExpenseProcessing(id: string) {
    return this.request(`/api/expenses/${encodeURIComponent(id)}/retry-processing`, { method: 'POST' });
  },

  registerExpensePayment(
    id: string,
    body: { amount: number; paymentDate: string; method: string; referenceCode?: string | null }
  ) {
    return this.request<{ paymentId: string }>(
      `/api/expenses/${encodeURIComponent(id)}/payments`,
      { method: 'POST', body }
    );
  },

  refundExpensePayment(id: string, paymentId: string, reason: string) {
    return this.request(
      `/api/expenses/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}/refund`,
      { method: 'POST', body: { reason } }
    );
  },
  listProductCatalog(filters: Record<string, unknown> = {}) {
    return this.request(`/api/products/catalog${buildQuery(filters)}`);
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

  async notificationOperationalDashboard(userId: string) {
    const res = await this.request<unknown>(
      `/api/notifications/operational/dashboard${buildQuery({ userId })}`
    );
    return { data: unwrapNestedApiSuccessPayload(res.data) };
  },

  async notificationDeliveries(
    userId: string,
    params: { status?: string; channel?: string; page?: number; pageSize?: number } = {}
  ) {
    const res = await this.request<unknown>(
      `/api/notifications/deliveries${buildQuery({ userId, ...params })}`
    );
    return { data: unwrapNestedApiSuccessPayload(res.data) };
  },

  async notificationGovernance() {
    const res = await this.request<unknown>('/api/notifications/governance');
    return { data: unwrapNestedApiSuccessPayload(res.data) };
  },

  async notificationTemplates() {
    const res = await this.request<unknown>('/api/notifications/templates');
    return { data: unwrapNestedApiSuccessPayload(res.data) };
  },

  async notificationRetryDelivery(deliveryId: string, userId: string) {
    const res = await this.request<unknown>(
      `/api/notifications/deliveries/${encodeURIComponent(deliveryId)}/retry${buildQuery({ userId })}`,
      { method: 'POST' }
    );
    return { data: unwrapNestedApiSuccessPayload(res.data) };
  },

  async notificationPreferences(userId: string) {
    const res = await this.request<unknown>(
      `/api/notifications/preferences/${encodeURIComponent(userId)}`
    );
    return { data: unwrapNestedApiSuccessPayload(res.data) };
  },

  async notificationUpdatePreferences(body: Record<string, unknown>) {
    const res = await this.request<unknown>('/api/notifications/preferences', {
      method: 'PUT',
      body,
    });
    return { data: unwrapNestedApiSuccessPayload(res.data) };
  },

  alertStats() {
    return this.request('/api/alerts/stats');
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
  getOperationalInsights(params: { refresh?: boolean } = {}) {
    const q = params.refresh === true ? '?refresh=true' : '';
    return this.request<Record<string, unknown>>(`/api/dashboard/insights${q}`);
  },

  getOperationalInsightHistory(take = 30) {
    return this.request<Record<string, unknown>>(`/api/dashboard/insights/history${buildQuery({ take })}`);
  },

  async narrativeOperationalInsights(body: Record<string, unknown>) {
    const res = await this.request<unknown>('/api/ai/insights/narrative', { method: 'POST', body });
    return { data: unwrapNestedApiSuccessPayload(res.data) };
  },
};

export { EcondomizaApi };
export default EcondomizaApi;