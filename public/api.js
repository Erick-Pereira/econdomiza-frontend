// SIMC-AG Gateway API client
// Base URL configurável: window.SIMCAG_GATEWAY ou query string ?gateway=
(function (global) {
    const DEFAULT_GATEWAY = 'http://localhost:5000';

    function resolveGatewayBase() {
        const fromQuery = new URLSearchParams(window.location.search).get('gateway');
        if (fromQuery) return fromQuery.replace(/\/$/, '');
        if (global.SIMCAG_GATEWAY) return String(global.SIMCAG_GATEWAY).replace(/\/$/, '');
        return DEFAULT_GATEWAY;
    }

    const SimcagApi = {
        baseUrl: resolveGatewayBase(),

        getToken() {
            return localStorage.getItem('simcag.accessToken') || '';
        },
        getRefreshToken() {
            return localStorage.getItem('simcag.refreshToken') || '';
        },
        setTokens(accessToken, refreshToken) {
            if (accessToken) localStorage.setItem('simcag.accessToken', accessToken);
            if (refreshToken) localStorage.setItem('simcag.refreshToken', refreshToken);
        },
        clearTokens() {
            localStorage.removeItem('simcag.accessToken');
            localStorage.removeItem('simcag.refreshToken');
        },

        async request(path, { method = 'GET', body = null, headers = {}, isMultipart = false } = {}) {
            const url = `${this.baseUrl}${path}`;
            const finalHeaders = { Accept: 'application/json', ...headers };
            const token = this.getToken();
            if (token) finalHeaders.Authorization = `Bearer ${token}`;

            let payload = body;
            if (body && !isMultipart) {
                finalHeaders['Content-Type'] = 'application/json';
                payload = typeof body === 'string' ? body : JSON.stringify(body);
            }

            const response = await fetch(url, { method, headers: finalHeaders, body: payload });
            const text = await response.text();
            const data = text ? safeParseJson(text) : null;

            if (!response.ok) {
                const error = new Error((data && (data.error || data.message)) || `HTTP ${response.status}`);
                error.status = response.status;
                error.body = data;
                throw error;
            }
            return data;
        },

        // Auth
        async login(condominioId, email, password) {
            const result = await this.request('/api/auth/login', {
                method: 'POST',
                body: { tenantId: condominioId, email, password }
            });
            if (result && result.accessToken) {
                this.setTokens(result.accessToken, result.refreshToken);
            }
            return result;
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
            if (result && result.accessToken) {
                this.setTokens(result.accessToken, result.refreshToken);
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
        async profile() {
            return this.request('/api/auth/profile');
        },

        // Condominios
        listCondominios() { return this.request('/api/condominios'); },
        getCondominio(id) { return this.request(`/api/condominios/${id}`); },
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

        /**
         * Agrega o read-side anual a partir de GET /api/dashboard/monthly (MView).
         * Substitui o legado /api/dashboard/summary (inexistente no processing).
         */
        async dashboardSummary({ year } = {}) {
            const y = year ?? new Date().getFullYear();
            const res = await this.getMonthlyDashboard(y);
            const rows = Array.isArray(res.rows) ? res.rows : [];
            let totalAmount = 0;
            let totalExpenses = 0;
            const supplierIds = new Set();
            for (const r of rows) {
                totalAmount += Number(r.totalAmount) || 0;
                totalExpenses += Number(r.expenseCount) || 0;
                if (r.supplierId) supplierIds.add(String(r.supplierId));
            }
            return {
                year: res.year ?? y,
                totalAmount,
                totalExpenses,
                suppliersCount: supplierIds.size
            };
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

        // Ingestion (upload de documentos)
        async uploadDocument(file, { documentType = 'INVOICE', source = 'frontend' } = {}) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('documentType', documentType);
            formData.append('source', source);
            return this.request('/api/ingestion/upload', {
                method: 'POST',
                body: formData,
                isMultipart: true
            });
        },

        // Alerts
        listAlerts({ page = 1, pageSize = 20, type = null } = {}) {
            const q = buildQuery({ page, pageSize, type });
            return this.request(`/api/alerts${q}`);
        },
        markAlertRead(id) { return this.request(`/api/alerts/${id}/read`, { method: 'PUT' }); },
        alertStats() { return this.request('/api/alerts/stats'); },

        // Notification preferences
        getPreferences(userId) { return this.request(`/api/notifications/preferences/${userId}`); },
        updatePreferences(payload) { return this.request('/api/notifications/preferences', { method: 'PUT', body: payload }); }
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

    global.SimcagApi = SimcagApi;
})(window);
