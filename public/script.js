// Redireciona para auth.html sem JWT. Use ?skipAuth=1 ou sessionStorage simcag.skipAuth=1 para demo offline.
(function shellAuthGuard() {
    try {
        const q = new URLSearchParams(window.location.search);
        if (q.get('skipAuth') === '1') sessionStorage.setItem('simcag.skipAuth', '1');
        if (sessionStorage.getItem('simcag.skipAuth') === '1') {
            console.log('[AuthGuard] skipAuth active, skipping auth check');
            return;
        }
        if (!window.SimcagApi) {
            console.log('[AuthGuard] SimcagApi não encontrado, redirecionando para auth.html');
            window.location.replace(new URL('auth.html', window.location.href).href);
            return;
        }
        const token = SimcagApi.getToken();
        console.log('[AuthGuard] token encontrado:', token ? 'SIM' : 'NÃO');
        if (!token) {
            console.log('[AuthGuard] redirecionando para auth.html');
            window.location.replace(new URL('auth.html', window.location.href).href);
        }
    } catch (_) { /* sem API em file:// */ }
})();

// SIMC-AG Frontend Script - Compatible with React Router
// Handles UI interactions that don't interfere with React routing

// DOM Elements that are outside React components
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const logoutBtn = document.getElementById('logoutBtn');
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');

// Notification System
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
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

// Upload Area Handler
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

// File Upload Handler
async function handleFiles(files) {
    if (!files || !files.length) return;

    // Check if we're on a page that supports uploads (auditoria page)
    const isOnAuditoriaPage = window.location.pathname.includes('/auditoria') || 
                             document.querySelector('#auditoria-page');
    
    if (!isOnAuditoriaPage) {
        showNotification('Upload de documentos só está disponível na página de Auditoria', 'warning');
        return;
    }

    for (const file of files) {
        showNotification(`Enviando "${file.name}"...`, 'info');

        // Check authentication
        if (!window.EcondomizaApi || !EcondomizaApi.getToken()) {
            showNotification(`(modo offline) "${file.name}" não foi enviado: faça login no gateway`, 'warning');
            continue;
        }

        try {
            const result = await EcondomizaApi.uploadDocument(file);
            const docId = result && (result.documentId || result.id) ? (result.documentId || result.id) : '';
            showNotification(`"${file.name}" ingerido${docId ? ` (id ${docId})` : ''}`, 'success');
        } catch (err) {
            console.error('Falha no upload', err);
            showNotification(`Falha ao enviar "${file.name}": ${err.message || 'erro desconhecido'}`, 'error');
        }
    }
    
    // Refresh the auditoria page if we're on it
    if (isOnAuditoriaPage && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('refresh-auditoria'));
    }
}

// Logout Handler
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja sair?')) return;
        try {
            if (window.EcondomizaApi && EcondomizaApi.getToken()) {
                await EcondomizaApi.logout();
            }
        } catch (err) {
            console.warn('Falha no logout remoto:', err);
        } finally {
            // Clear tokens
            localStorage.removeItem('simcag.accessToken');
            localStorage.removeItem('simcag.refreshToken');
            showNotification('Sessão encerrada', 'success');
            // Redirect to login or home
            window.location.href = '/login';
        }
    });
}

// Mobile Menu Toggle
if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar && menuBtn) {
        if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});

// Prevent form submission on Enter in input fields (for demo)
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
    }
});

// Initialize
console.log('ENCONDOMIZA - Sistema de Auditoria Inteligente');
console.log('Versão 1.0.0');
console.log('© 2026 - Todos os direitos reservados');
console.log('SIMC-AG Gateway:', (window.EcondomizaApi && EcondomizaApi.baseUrl) || '(api.js not loaded)');

// Set active sidebar item based on current route
const setActiveSidebarItem = () => {
    const path = window.location.pathname;
    let pageName = '';
    
    if (path === '/' || path === '/dashboard') pageName = 'dashboard';
    else if (path.includes('/auditoria')) pageName = 'auditoria';
    else if (path.includes('/fornecedores')) pageName = 'fornecedores';
    else if (path.includes('/alertas')) pageName = 'alertas';
    else if (path.includes('/compras')) pageName = 'compras';
    else if (path.includes('/relatorios')) pageName = 'relatorios';
    else if (path.includes('/conformidades')) pageName = 'conformidades';
    else if (path.includes('/configuracoes')) pageName = 'configuracoes';
    else if (path.includes('/login')) pageName = 'login';
    
    // Remove active class from all items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to matching item
    const matchingItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (matchingItem) {
        matchingItem.classList.add('active');
    }
};

// Run on load and on route changes (for SPA)
setActiveSidebarItem();

// Listen for React Router route changes (if using history API)
window.addEventListener('popstate', setActiveSidebarItem);
// Also listen for hash changes if needed
window.addEventListener('hashchange', setActiveSidebarItem);

// Handle sidebar responsiveness
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar) {
        sidebar.classList.remove('active');
    }
});