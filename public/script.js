// Redireciona para auth.html sem JWT. Use ?skipAuth=1 ou sessionStorage simcag.skipAuth=1 para demo offline.
(function shellAuthGuard() {
    try {
        const q = new URLSearchParams(window.location.search);
        if (q.get('skipAuth') === '1') sessionStorage.setItem('simcag.skipAuth', '1');
        if (sessionStorage.getItem('simcag.skipAuth') === '1') return;
        if (!window.SimcagApi || !SimcagApi.getToken()) {
            window.location.replace(new URL('auth.html', window.location.href).href);
        }
    } catch (_) { /* sem API em file:// */ }
})();

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const logoutBtn = document.getElementById('logoutBtn');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const addSupplierBtn = document.getElementById('addSupplierBtn');

function refreshPageData(pageName) {
    if (!window.SimcagApi || !SimcagApi.getToken()) return;
    switch (pageName) {
        case 'dashboard':
            refreshDashboard();
            refreshAlerts();
            break;
        case 'auditoria':
        case 'compras':
            refreshExpenseTables();
            if (pageName === 'compras') refreshSuppliersGrid();
            break;
        case 'fornecedores':
            refreshSuppliersGrid();
            break;
        case 'alertas':
            refreshAlerts();
            break;
        default:
            break;
    }
}

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all items
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // Add active class to clicked item
        item.classList.add('active');
        
        // Get page name from data attribute
        const pageName = item.getAttribute('data-page');
        
        // Hide all pages
        pages.forEach(page => page.classList.remove('active'));
        
        // Show selected page
        const selectedPage = document.getElementById(`${pageName}-page`);
        if (selectedPage) {
            selectedPage.classList.add('active');
        }

        refreshPageData(pageName);
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
});

// Mobile Menu Toggle
menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    if (!confirm('Tem certeza que deseja sair?')) return;
    try {
        if (window.SimcagApi && SimcagApi.getToken()) {
            await SimcagApi.logout();
        }
    } catch (err) {
        console.warn('Falha no logout remoto:', err);
    } finally {
        showNotification('Sessão encerrada', 'success');
    }
});

// Upload Area
if (uploadArea && fileInput) {
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
    uploadArea.style.borderColor = '#4f46e5';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.backgroundColor = '';
    uploadArea.style.borderColor = '';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = '';
    uploadArea.style.borderColor = '';
    
    const files = e.dataTransfer.files;
    handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});
}

async function handleFiles(files) {
    if (!files || !files.length) return;

    for (const file of files) {
        showNotification(`Enviando "${file.name}"...`, 'info');

        if (!window.SimcagApi || !SimcagApi.getToken()) {
            showNotification(`(modo offline) "${file.name}" não foi enviado: faça login no gateway`, 'warning');
            continue;
        }

        try {
            const result = await SimcagApi.uploadDocument(file);
            const docId = result && (result.documentId || result.id) ? (result.documentId || result.id) : '';
            showNotification(`"${file.name}" ingerido${docId ? ` (id ${docId})` : ''}`, 'success');
        } catch (err) {
            console.error('Falha no upload', err);
            showNotification(`Falha ao enviar "${file.name}": ${err.message || 'erro desconhecido'}`, 'error');
        }
    }

    if (typeof refreshPageData === 'function') {
        refreshPageData('dashboard');
    }
}

// Alert Filters
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        const filter = btn.getAttribute('data-filter');
        
        // Filter alerts
        const alertCards = document.querySelectorAll('.alert-card');
        alertCards.forEach(card => {
            if (filter === 'all') {
                card.style.display = 'block';
            } else {
                if (card.classList.contains(filter)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    });
});

// Add Supplier Button
if (addSupplierBtn) {
    addSupplierBtn.addEventListener('click', async () => {
        if (!window.SimcagApi || !SimcagApi.getToken()) {
            showNotification('Faça login no gateway para cadastrar fornecedores.', 'warning');
            return;
        }
        const name = window.prompt('Nome do fornecedor');
        if (!name) return;
        const document = window.prompt('CNPJ ou CPF (apenas números ou formatado)');
        if (!document) return;
        try {
            await SimcagApi.createSupplier({ name, document, email: null, phone: null, address: null, category: null });
            showNotification('Fornecedor criado.', 'success');
            refreshSuppliersGrid();
            refreshDashboard();
        } catch (err) {
            showNotification(`Falha: ${err.message || err}`, 'error');
        }
    });
}

// Form Submission
const settingsForms = document.querySelectorAll('.settings-form');
settingsForms.forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        showNotification('Alterações salvas com sucesso!', 'success');
    });
});

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 24px;
        background-color: ${getNotificationColor(type)};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function getNotificationColor(type) {
    switch(type) {
        case 'success':
            return '#10b981';
        case 'error':
            return '#ef4444';
        case 'warning':
            return '#f59e0b';
        case 'info':
        default:
            return '#3b82f6';
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Ações (data-action) — substitui matching frágil por textContent
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (!window.SimcagApi || !SimcagApi.getToken()) {
        showNotification('Faça login no gateway.', 'warning');
        return;
    }
    try {
        if (action === 'expense-detail') {
            const id = btn.dataset.expenseId;
            const exp = await SimcagApi.getExpense(id);
            const lines = (exp.items || []).map(i => `${i.description}: ${formatCurrency(i.totalPrice)}`).join('\n');
            const pays = (exp.payments || []).map(p => `${formatCurrency(p.amount)} em ${formatDatePt(p.paymentDate)} (${p.method})`).join('\n');
            window.alert(`Despesa: ${exp.description}\nStatus: ${exp.status}\nTotal: ${formatCurrency(exp.totalAmount)}\nPago: ${formatCurrency(exp.totalPaid || 0)}\nItens:\n${lines || '-'}\nPagamentos:\n${pays || '-'}`);
            return;
        }
        if (action === 'expense-approve') {
            const id = btn.dataset.expenseId;
            await SimcagApi.approveExpense(id);
            showNotification('Despesa aprovada.', 'success');
            refreshExpenseTables();
            refreshDashboard();
            return;
        }
        if (action === 'expense-register-prompt') {
            const supplierId = window.prompt('ID (GUID) do fornecedor');
            if (!supplierId) return;
            const description = window.prompt('Descrição da despesa') || 'Compra';
            const category = window.prompt('Categoria') || 'Geral';
            const amount = parseFloat(window.prompt('Valor total (número)', '0') || '0', 10);
            const issueIso = window.prompt('Data emissão (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
            await SimcagApi.createExpense({
                supplierId,
                description,
                category,
                issueDate: issueIso,
                dueDate: null,
                currency: 'BRL',
                items: [{ description: description, quantity: 1, unitPrice: amount }]
            });
            showNotification('Despesa registrada (Pendente).', 'success');
            refreshExpenseTables();
            refreshDashboard();
            return;
        }
        if (action === 'supplier-edit') {
            const id = btn.dataset.supplierId;
            const cur = await SimcagApi.getSupplier(id);
            const name = window.prompt('Nome', cur.name) ?? cur.name;
            const document = window.prompt('Documento', cur.document) ?? cur.document;
            await SimcagApi.updateSupplier(id, {
                name, document,
                email: cur.email, phone: cur.phone, address: cur.address, category: cur.category
            });
            showNotification('Fornecedor atualizado.', 'success');
            refreshSuppliersGrid();
            return;
        }
        if (action === 'supplier-deactivate') {
            const id = btn.dataset.supplierId;
            if (!confirm('Desativar este fornecedor?')) return;
            await SimcagApi.deactivateSupplier(id);
            showNotification('Fornecedor desativado.', 'success');
            refreshSuppliersGrid();
            refreshDashboard();
            return;
        }
        if (action === 'alert-resolve') {
            const id = btn.dataset.alertId;
            await SimcagApi.markAlertRead(id);
            showNotification('Alerta marcado como lido.', 'success');
            refreshAlerts();
            refreshDashboard();
            return;
        }
        if (action === 'alert-detail') {
            const id = btn.dataset.alertId;
            showNotification(`Detalhes do alerta ${id} (use a API ou expanda a lista).`, 'info');
            return;
        }
    } catch (err) {
        showNotification(err.message || 'Erro na ação', 'error');
    }
});


// Responsive Sidebar
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
    }
});

// SIMC-AG Gateway integration
async function refreshDashboard() {
    if (!window.SimcagApi || !SimcagApi.getToken()) return;
    try {
        const summary = await SimcagApi.dashboardSummary();
        const totalEl = document.querySelector('[data-dashboard="totalAmount"]');
        const countEl = document.querySelector('[data-dashboard="totalExpenses"]');
        const supplierEl = document.querySelector('[data-dashboard="suppliersCount"]');
        const alertsEl = document.querySelector('[data-dashboard="alertsCount"]');
        if (totalEl) totalEl.textContent = formatCurrency(summary.totalAmount);
        if (countEl) countEl.textContent = String(summary.totalExpenses ?? 0);
        if (supplierEl) supplierEl.textContent = String(summary.suppliersCount ?? 0);
        if (alertsEl) {
            try {
                const statsRaw = await SimcagApi.alertStats();
                const stats = unwrapApiEnvelope(statsRaw);
                const n = stats?.unreadCount ?? stats?.total ?? 0;
                alertsEl.textContent = String(n);
            } catch (_) { /* mantém valor anterior */ }
        }
    } catch (err) {
        console.warn('Falha ao atualizar dashboard:', err);
    }
}

function unwrapApiEnvelope(raw) {
    if (raw && typeof raw === 'object' && raw.success !== false && 'data' in raw) return raw.data;
    return raw;
}

async function refreshSuppliersGrid() {
    if (!window.SimcagApi || !SimcagApi.getToken()) return;
    const mount = document.getElementById('suppliersGridMount');
    if (!mount) return;
    try {
        const items = await SimcagApi.listSuppliers();
        const list = Array.isArray(items) ? items : [];
        mount.innerHTML = '';
        list.filter(s => s.isActive !== false).forEach(s => {
            const card = document.createElement('div');
            card.className = 'supplier-card';
            card.dataset.supplierId = s.id;
            const docDisplay = formatCnpjCpf(s.document || '');
            card.innerHTML = `
                <div class="supplier-header">
                    <h3>${escapeHtml(s.name || '')}</h3>
                    <div class="rating"><span class="supplier-doc-label">${escapeHtml(s.documentType || '')}</span></div>
                </div>
                <div class="supplier-info">
                    <p><strong>CNPJ/CPF:</strong> ${escapeHtml(docDisplay)}</p>
                    <p><strong>Categoria:</strong> ${escapeHtml(s.category || '-')}</p>
                    <p><strong>Contatos:</strong> ${escapeHtml(s.phone || s.email || '-')}</p>
                </div>
                <div class="supplier-actions">
                    <button type="button" class="btn-small" data-action="supplier-edit" data-supplier-id="${s.id}">Editar</button>
                    <button type="button" class="btn-small danger" data-action="supplier-deactivate" data-supplier-id="${s.id}">Desativar</button>
                </div>`;
            mount.appendChild(card);
        });
        if (!list.length) {
            mount.innerHTML = '<p class="empty-state">Nenhum fornecedor cadastrado.</p>';
        }
    } catch (err) {
        console.warn('Falha ao carregar fornecedores:', err);
    }
}

async function buildSupplierNameMap() {
    const map = new Map();
    try {
        const items = await SimcagApi.listSuppliers();
        (Array.isArray(items) ? items : []).forEach(s => map.set(String(s.id), s.name || ''));
    } catch (_) { /* offline */ }
    return map;
}

function expenseStatusBadgeClass(status) {
    const st = (status || '').toLowerCase();
    if (st === 'paid') return 'analyzed';
    if (st === 'approved') return 'analyzed';
    if (st === 'pending') return 'pending';
    if (st === 'cancelled') return 'pending';
    return 'pending';
}

function expenseStatusLabel(status) {
    const st = (status || '').toLowerCase();
    if (st === 'paid') return 'Pago';
    if (st === 'approved') return 'Aprovado';
    if (st === 'pending') return 'Pendente';
    if (st === 'cancelled') return 'Cancelado';
    return status || '-';
}

async function refreshExpenseTables() {
    if (!window.SimcagApi || !SimcagApi.getToken()) return;
    const auditBody = document.getElementById('auditoriaExpensesTbody');
    const comprasBody = document.getElementById('comprasExpensesTbody');
    if (!auditBody && !comprasBody) return;
    try {
        const [page, nameMap] = await Promise.all([
            SimcagApi.listExpenses({ page: 1, pageSize: 100 }),
            buildSupplierNameMap()
        ]);
        const items = page.items || [];
        const renderRow = (e) => {
            const sup = nameMap.get(String(e.supplierId)) || '(fornecedor)';
            const tr = document.createElement('tr');
            tr.dataset.expenseId = e.id;
            tr.innerHTML = `
                <td>${escapeHtml(e.description || '')}</td>
                <td>${escapeHtml(sup)}</td>
                <td>${formatCurrency(e.totalAmount)}</td>
                <td>-</td>
                <td>${escapeHtml(expenseStatusLabel(e.status))}</td>
                <td>
                    <button type="button" class="btn-small" data-action="expense-detail" data-expense-id="${e.id}">Ver Detalhes</button>
                    ${(e.status || '').toLowerCase() === 'pending' ? `<button type="button" class="btn-small" data-action="expense-approve" data-expense-id="${e.id}">Aprovar</button>` : ''}
                </td>`;
            return tr;
        };

        if (auditBody) {
            auditBody.innerHTML = '';
            items.slice(0, 50).forEach(e => {
                const tr = document.createElement('tr');
                const sup = nameMap.get(String(e.supplierId)) || '-';
                tr.dataset.expenseId = e.id;
                tr.innerHTML = `
                    <td>${escapeHtml(e.description || '')}</td>
                    <td>${formatDatePt(e.issueDate)}</td>
                    <td><span class="badge ${expenseStatusBadgeClass(e.status)}">${escapeHtml(expenseStatusLabel(e.status))}</span></td>
                    <td>${formatCurrency(e.totalAmount)}</td>
                    <td>
                        <button type="button" class="btn-small" data-action="expense-detail" data-expense-id="${e.id}">Ver Detalhes</button>
                    </td>`;
                auditBody.appendChild(tr);
            });
            if (!items.length) auditBody.innerHTML = '<tr><td colspan="5">Nenhuma despesa encontrada.</td></tr>';
        }
        if (comprasBody) {
            comprasBody.innerHTML = '';
            items.forEach(e => {
                const sup = nameMap.get(String(e.supplierId)) || '-';
                const tr = document.createElement('tr');
                tr.dataset.expenseId = e.id;
                tr.innerHTML = `
                    <td>${escapeHtml(e.description || '')}</td>
                    <td>${escapeHtml(sup)}</td>
                    <td>${formatCurrency(e.totalAmount)}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>${formatDatePt(e.issueDate)}</td>`;
                comprasBody.appendChild(tr);
            });
            if (!items.length) comprasBody.innerHTML = '<tr><td colspan="6">Nenhuma compra registrada.</td></tr>';
        }
    } catch (err) {
        console.warn('Falha ao carregar despesas:', err);
    }
}

function formatDatePt(iso) {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR');
    } catch { return '-'; }
}

function formatCnpjCpf(digits) {
    const s = String(digits || '').replace(/\D/g, '');
    if (s.length === 11) return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (s.length === 14) return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return digits || '';
}

async function refreshAlerts() {
    if (!window.SimcagApi || !SimcagApi.getToken()) return;
    try {
        const result = await SimcagApi.listAlerts({ pageSize: 50 });
        const items = (result && result.data && result.data.items) || result?.items || [];
        const container = document.querySelector('[data-alerts-list]');
        if (!container) return;
        container.innerHTML = '';
        items.forEach(alert => {
            const card = document.createElement('div');
            const sev = mapAlertSeverity(alert.type);
            card.className = `alert-card ${sev.cls}`;
            card.dataset.alertId = alert.id;
            card.innerHTML = `
                <div class="alert-header">
                    <div class="alert-title-section">
                        <span class="alert-priority-badge">${sev.label}</span>
                        <h3>${escapeHtml(String(alert.type || 'Alerta'))}</h3>
                    </div>
                    <span class="alert-date">${new Date(alert.createdAt || Date.now()).toLocaleString('pt-BR')}</span>
                </div>
                <p class="alert-description">${escapeHtml(alert.message || '')}</p>
                <div class="alert-actions">
                    <button type="button" class="btn-small" data-action="alert-resolve" data-alert-id="${alert.id}">Resolver</button>
                    <button type="button" class="btn-small secondary" data-action="alert-detail" data-alert-id="${alert.id}">Mais Detalhes</button>
                </div>
            `;
            container.appendChild(card);
        });
        if (!items.length) {
            container.innerHTML = '<p class="empty-state">Nenhum alerta.</p>';
        }
    } catch (err) {
        console.warn('Falha ao carregar alertas:', err);
    }
}

function mapAlertSeverity(type) {
    const t = String(type || '').toLowerCase();
    if (t.includes('high') || t.includes('alta') || t.includes('critical')) {
        return { cls: 'high', label: 'ALTA' };
    }
    if (t.includes('medium') || t.includes('media') || t.includes('warning')) {
        return { cls: 'medium', label: 'MÉDIA' };
    }
    if (t.includes('low') || t.includes('baixa') || t.includes('info')) {
        return { cls: 'low', label: 'BAIXA' };
    }
    return { cls: 'medium', label: 'MÉDIA' };
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.SimcagApi && SimcagApi.getToken()) {
        refreshPageData('dashboard');
    }
});

// Initialize
console.log('ENCONDOMIZA - Sistema de Auditoria Inteligente');
console.log('Versão 1.0.0');
console.log('© 2026 - Todos os direitos reservados');
console.log('SIMC-AG Gateway:', (window.SimcagApi && SimcagApi.baseUrl) || '(api.js not loaded)');

// Set active page on load
const firstNavItem = document.querySelector('.nav-item.active');
if (firstNavItem) {
    const pageName = firstNavItem.getAttribute('data-page');
    const selectedPage = document.getElementById(`${pageName}-page`);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }
}

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

// Prevent form submission on Enter in input fields (for demo)
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
    }
});
