// SIMC-AG Gateway API client
// Base URL configurável: window.SIMCAG_GATEWAY ou query string ?gateway=
(function (global) {
    const DEFAULT_GATEWAY = 'http://localhost:5000';
    const TOKEN_KEY = 'simcag.accessToken';
    const REFRESH_KEY = 'simcag.refreshToken';
    const USER_KEY = 'simcag.user';

    function resolveGatewayBase() {
        const fromQuery = new URLSearchParams(window.location.search).get('gateway');
        if (fromQuery) return fromQuery.replace(/\/$/, '');
        if (global.SIMCAG_GATEWAY) return String(global.SIMCAG_GATEWAY).replace(/\/$/, '');
        return DEFAULT_GATEWAY;
    }

    function num(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    function buildDashboardKpisFromMonthly(payload) {
        const root = payload && typeof payload === 'object' ? payload : {};
        const rows = Array.isArray(root.rows) ? root.rows : [];
        const y = typeof root.year === 'number' ? root.year : new Date().getFullYear();
        let totalAmount = 0;
        let totalExpenseLines = 0;
        let outstanding = 0;
        const suppliers = new Set();
        for (const r of rows) {
            totalAmount += num(r.totalAmount ?? r.TotalAmount);
            totalExpenseLines += num(r.expenseCount ?? r.ExpenseCount);
            outstanding += num(r.outstanding ?? r.Outstanding);
            const sid = r.supplierId ?? r.SupplierId;
            if (sid != null && String(sid) !== '00000000-0000-0000-0000-000000000000') {
                suppliers.add(String(sid));
            }
        }
        return {
            year: y,
            economiaIdentificada: 0,
            gastoProcessado: totalAmount,
            valorEmAberto: outstanding,
            auditoriasRealizadas: totalExpenseLines,
            fornecedoresCadastrados: suppliers.size,
            alertasAtivos: 0,
        };
    }

    const EcondomizaApi = {
        baseUrl: resolveGatewayBase(),

        getToken() {
            return localStorage.getItem(TOKEN_KEY) || '';
        },
        getRefreshToken() {
            return localStorage.getItem(REFRESH_KEY) || '';
        },
        getUser() {
            const stored = localStorage.getItem(USER_KEY);
            try {
                return stored ? JSON.parse(stored) : null;
            } catch {
                return null;
            }
        },
        setTokens(accessToken, refreshToken) {
            if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
            if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
        },
        setUser(user) {
            if (user) {
                localStorage.setItem(USER_KEY, JSON.stringify(user));
            }
        },
        clearTokens() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_KEY);
        },
        clearUser() {
            localStorage.removeItem(USER_KEY);
        },

        /** Unwrap nested Simcag.ApiResponse { success, data } layers. */
        unwrapEnvelope(json) {
            let cur = json;
            for (let i = 0; i < 8; i++) {
                if (cur && typeof cur === 'object' && cur.success === true && 'data' in cur) {
                    cur = cur.data;
                } else break;
            }
            return cur;
        },

        extractTokens(payload) {
            if (!payload || typeof payload !== 'object') return null;
            const inner = this.unwrapEnvelope(payload);
            if (!inner || typeof inner !== 'object') return null;
            const access = inner.accessToken ?? inner.AccessToken;
            const refresh = inner.refreshToken ?? inner.RefreshToken;
            if (!access) return null;
            return { accessToken: String(access), refreshToken: refresh != null ? String(refresh) : undefined };
        },

        async request(path, { method = 'GET', body = null, headers = {}, isMultipart = false } = {}) {
            const url = `${this.baseUrl}${path}`;
            const finalHeaders = { Accept: 'application/json', ...headers };
            const token = this.getToken();
            if (token) finalHeaders.Authorization = `Bearer ${token}`;

            let payload = body;
            const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
            if (body != null && !isMultipart && !isFormData) {
                finalHeaders['Content-Type'] = 'application/json';
                payload = typeof body === 'string' ? body : JSON.stringify(body);
            } else if (isFormData) {
                payload = body;
                delete finalHeaders['Content-Type'];
            }

            const response = await fetch(url, { method, headers: finalHeaders, body: payload });

            const text = await response.text();
            const data = text ? safeParseJson(text) : null;

            if (!response.ok) {
                const message = this.extractErrorMessage(data) || `HTTP ${response.status}`;
                const error = new Error(message);
                error.status = response.status;
                error.body = data;
                throw error;
            }

            return data;
        },

        extractErrorMessage(data) {
            if (!data || typeof data !== 'object') {
                return typeof data === 'string' ? data : null;
            }

            if (typeof data.error === 'string' && data.error.trim()) {
                return data.error;
            }

            if (typeof data.message === 'string' && data.message.trim()) {
                return data.message;
            }

            if (Array.isArray(data.errors) && data.errors.length > 0) {
                return data.errors.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join(' | ');
            }

            if (data.errors && typeof data.errors === 'object') {
                const messages = [];
                Object.values(data.errors).forEach((value) => {
                    if (Array.isArray(value)) {
                        value.forEach((item) => {
                            if (typeof item === 'string') messages.push(item);
                            else if (item) messages.push(JSON.stringify(item));
                        });
                    } else if (typeof value === 'string') {
                        messages.push(value);
                    } else if (value && typeof value === 'object') {
                        messages.push(JSON.stringify(value));
                    }
                });
                return messages.join(' | ') || null;
            }

            return null;
        },

        // Auth
        async login(condominioId, email, password) {
            const result = await this.request('/api/auth/login', {
                method: 'POST',
                body: { tenantId: condominioId, email, password }
            });
            const authData = result && result.data ? result.data : result;
            if (authData && authData.accessToken) {
                this.setTokens(authData.accessToken, authData.refreshToken);
            }
            return authData;
        },
        /** Busca pública por nome ou CNPJ — sem JWT (gateway /api/condominios/lookup). */
        lookupCondominios(q) {
            const term = q != null && String(q).trim() !== '' ? String(q).trim() : '';
            const qs = term ? `?q=${encodeURIComponent(term)}` : '';
            return this.request(`/api/condominios/lookup${qs}`);
        },
        /** Registro em condomínio existente (TenantId obrigatório). Roles: Sindico, Conselho (Admin só autenticado). */
        async register({ tenantId, email, password, name, role }) {
            const result = await this.request('/api/auth/register', {
                method: 'POST',
                body: {
                    tenantId,
                    email,
                    password,
                    name,
                    role: role || 'Sindico'
                }
            });
            const tokens = this.extractTokens(result);
            if (tokens) this.setTokens(tokens.accessToken, tokens.refreshToken);
            return this.unwrapEnvelope(result);
        },
        async logout() {
            const refreshToken = this.getRefreshToken();
            try {
                await this.request('/api/auth/logout', { method: 'POST', body: { refreshToken } });
            } finally {
                this.clearTokens();
                this.clearUser();
            }
        },
        async profile() {
            const raw = await this.request('/api/auth/me');
            return this.unwrapEnvelope(raw);
        },

        async getNotificationPreferences(userId) {
            let uid = userId;
            if (!uid) {
                const me = await this.profile();
                uid = me && (me.id || me.Id);
            }
            if (!uid) throw new Error('Cannot load notification preferences without user id');
            const raw = await this.request(`/api/notifications/preferences?userId=${encodeURIComponent(uid)}`);
            return this.unwrapEnvelope(raw);
        },

        // Condominios
        listCondominios() { return this.request('/api/condominios'); },
        getCondominio(id) { return this.request(`/api/condominios/${encodeURIComponent(id)}`); },
        async getMyCondominio() {
            const me = await this.profile();
            const tenantId = me && (me.tenantId || me.TenantId);
            if (!tenantId) throw new Error('Perfil sem tenantId (condomínio).');
            return this.getCondominio(String(tenantId));
        },
        createCondominio(payload) { return this.request('/api/condominios', { method: 'POST', body: payload }); },

        // Conformities
        listConformities(condominioId) { return this.request(`/api/condominios/${condominioId}/conformities`); },
        addConformity(condominioId, payload) {
            return this.request(`/api/condominios/${condominioId}/conformities`, { method: 'POST', body: payload });
        },
        completeConformity(condominioId, itemId, notes) {
            return this.request(`/api/condominios/${condominioId}/conformities/${itemId}/complete`, {
                method: 'POST',
                body: { notes }
            });
        },

        /** KPIs a partir de GET /api/dashboard/monthly (mesmo contrato que o bundle Vite). */
        async dashboardSummary({ year } = {}) {
            const y = year ?? new Date().getFullYear();
            const raw = await this.request(`/api/dashboard/monthly?year=${y}`);
            const body = this.unwrapEnvelope(raw) ?? raw;
            return buildDashboardKpisFromMonthly(body);
        },

        // ===== Expenses (core financeiro v2) =====
        listExpenses(filters = {}) {
            const q = buildQuery(filters);
            return this.request(`/api/expenses${q}`);
        },
        getExpense(id) {
            return this.request(`/api/expenses/${id}`);
        },
        createExpense({ supplierId, description, category, issueDate, dueDate, currency = 'BRL', items = [], rawDocumentId = null, confidenceScore = null } = {}) {
            return this.request('/api/expenses', {
                method: 'POST',
                body: { supplierId, description, category, issueDate, dueDate, currency, items, rawDocumentId, confidenceScore }
            });
        },
        approveExpense(id) {
            return this.request(`/api/expenses/${id}/approve`, { method: 'PUT' });
        },
        cancelExpense(id, reason) {
            return this.request(`/api/expenses/${id}/cancel`, { method: 'PUT', body: { reason } });
        },

        // ===== Payments =====
        registerPayment(expenseId, { amount, paymentDate, method = 'Pix', referenceCode = null } = {}) {
            return this.request(`/api/expenses/${expenseId}/payments`, {
                method: 'POST',
                body: { amount, paymentDate, method, referenceCode }
            });
        },
        refundPayment(expenseId, paymentId, reason) {
            return this.request(`/api/expenses/${expenseId}/payments/${paymentId}/refund`, {
                method: 'POST',
                body: { reason }
            });
        },
        listPayments(filters = {}) {
            const q = buildQuery(filters);
            return this.request(`/api/payments${q}`);
        },

        // ===== Suppliers =====
        listSuppliers(filters = {}) {
            const q = buildQuery(filters);
            return this.request(`/api/suppliers${q}`);
        },
        getSupplier(id) {
            return this.request(`/api/suppliers/${id}`);
        },
        createSupplier({ name, document, email = null, phone = null, address = null, category = null } = {}) {
            return this.request('/api/suppliers', {
                method: 'POST',
                body: { name, document, email, phone, address, category }
            });
        },
        updateSupplier(id, payload) {
            return this.request(`/api/suppliers/${id}`, { method: 'PUT', body: payload });
        },
        deactivateSupplier(id) {
            return this.request(`/api/suppliers/${id}`, { method: 'DELETE' });
        },
        mergeSuppliers(sourceSupplierId, targetSupplierId) {
            return this.request('/api/suppliers/merge', {
                method: 'POST',
                body: { sourceSupplierId, targetSupplierId }
            });
        },

        // ===== Dashboards (Materialized View, read-side) =====
        getMonthlyDashboard(year) {
            return this.request(`/api/dashboard/monthly?year=${year ?? new Date().getFullYear()}`);
        },
        getCategoryBreakdown(from, to) {
            return this.request(`/api/dashboard/categories${buildQuery({ from, to })}`);
        },
        getCashFlow(from, to) {
            return this.request(`/api/dashboard/cash-flow${buildQuery({ from, to })}`);
        },
        getSupplierRanking({ top = 10, from, to } = {}) {
            return this.request(`/api/dashboard/suppliers${buildQuery({ top, from, to })}`);
        },
        getYearOverYear(yearsBack = 2) {
            return this.request(`/api/dashboard/year-over-year?yearsBack=${yearsBack}`);
        },
        refreshDashboard() {
            return this.request('/api/admin/refresh-dashboard', { method: 'POST' });
        },

        // ===== Audit Logs (admin) =====
        listAuditLogs(filters = {}) {
            const q = buildQuery(filters);
            return this.request(`/api/audit-logs${q}`);
        },

        // Ingestion — multipart alinhado a DocumentUploadForm (file, source, origin, tenantId)
        async uploadDocument(file, { documentType = 'INVOICE', source = 'frontend', origin = '', tenantId: tenantIdOpt } = {}) {
            const buildForm = async () => {
                const form = new FormData();
                form.append('file', file, file.name);
                form.append('source', source);
                const o = origin || documentType || '';
                if (o) form.append('origin', o);
                let tenantId = tenantIdOpt?.trim?.() || '';
                if (!tenantId) {
                    try {
                        const me = await this.profile();
                        const tid = me && (me.tenantId || me.TenantId);
                        if (tid != null && String(tid).trim() !== '') tenantId = String(tid);
                    } catch (_) { /* ignore */ }
                }
                if (tenantId) form.append('tenantId', tenantId);
                return form;
            };
            const paths = ['/api/ingestion/upload', '/ingestion/upload'];
            let lastErr;
            for (const path of paths) {
                try {
                    const body = await buildForm();
                    return await this.request(path, { method: 'POST', body, isMultipart: true });
                } catch (err) {
                    lastErr = err;
                    const st = err && err.status;
                    if (st !== 404 && st !== 405) throw err;
                }
            }
            throw lastErr;
        },

        // Alerts
        listAlerts({ page = 1, pageSize = 20, type = null } = {}) {
            const q = buildQuery({ page, pageSize, type });
            return this.request(`/api/alerts${q}`);
        },
        markAlertRead(id) { return this.request(`/api/alerts/${id}/read`, { method: 'PUT' }); },
        alertStats() { return this.request('/api/alerts/stats'); },

        // Notification preferences (userId optional — resolved via /api/auth/me)
        getPreferences(userId) { return this.getNotificationPreferences(userId); },
        async updatePreferences(payload) {
            const body = payload && typeof payload === 'object' ? { ...payload } : {};
            if (!body.userId && !body.UserId) {
                const me = await this.profile();
                const id = me && (me.id || me.Id);
                if (id) body.userId = id;
            }
            const raw = await this.request('/api/notifications/preferences', { method: 'PUT', body });
            return this.unwrapEnvelope(raw);
        },

        /** Compras no SPA usam `listExpenses` — não existe `/api/shopping-lists` no processing. */
    };

    function buildQuery(obj) {
        const q = new URLSearchParams();
        Object.entries(obj || {}).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') q.set(k, v);
        });
        const s = q.toString();
        return s ? `?${s}` : '';
    }

    function safeParseJson(text) {
        try { return JSON.parse(text); } catch { return text; }
    }


    global.SimcagApi = EcondomizaApi;
    global.EcondomizaApi = EcondomizaApi;
})(window);


// ======================================================
// MOCK AUTH SYSTEM - COMENTADO PARA USAR BACKEND REAL
// ======================================================

/*
const MOCK_USERS_KEY = "mock.users";
const MOCK_LOGGED_KEY = "mock.loggedUser";

// ================= LOGIN =================

SimcagApi.login = async function (condominioId, email, password) {

    await fakeDelay();

    const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY)) || [];

    const user = users.find(u =>
        u.condominioId === condominioId &&
        u.email === email &&
        u.password === password
    );

    if (!user) {
        throw new Error("Email ou senha inválidos");
    }

    const fakeToken = crypto.randomUUID();

    localStorage.setItem("simcag.accessToken", fakeToken);

    localStorage.setItem(MOCK_LOGGED_KEY, JSON.stringify(user));

    return {
        accessToken: fakeToken,
        refreshToken: "mock-refresh-token",
        user
    };
};

// ================= REGISTER =================

SimcagApi.register = async function ({
    tenantId,
    email,
    password,
    name,
    role
}) {

    await fakeDelay();

    const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY)) || [];

    const exists = users.find(u => u.email === email);

    if (exists) {
        throw new Error("Usuário já cadastrado");
    }

    const user = {
        id: crypto.randomUUID(),
        condominioId: tenantId,
        email,
        password,
        name,
        role
    };

    users.push(user);

    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

    return {
        success: true,
        user
    };
};

// ================= PROFILE =================

SimcagApi.profile = async function () {

    await fakeDelay();

    const user = JSON.parse(localStorage.getItem(MOCK_LOGGED_KEY));

    if (!user) {
        throw new Error("Usuário não autenticado");
    }

    return user;
};

// ================= CONDOMINIOS =================

SimcagApi.lookupCondominios = async function () {

    await fakeDelay();

    return [
        {
            id: "cond-001",
            name: "Condomínio Solar das Palmeiras"
        },
        {
            id: "cond-002",
            name: "Residencial Águas Claras"
        },
        {
            id: "cond-003",
            name: "Edifício Monte Bello"
        }
    ];
};

// ================= HELPERS =================

function fakeDelay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
*/
