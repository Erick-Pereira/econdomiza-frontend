import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
} from 'react-router-dom';
import { useEffect, useState, useCallback, lazy } from 'react';
import { AuthSessionProvider, useAuthSession } from './context/AuthSessionContext';
import { ErrorProvider } from './utils/global-error-handler';
import { ToastProvider } from './components/ui/Toast';
import { LoginForm } from './features/auth/components/LoginForm';
import { RegisterForm } from './features/auth/components/RegisterForm';
import { LazyShell, RouteFallback } from './components/LazyShell';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AuditoriaPage = lazy(() => import('./pages/AuditoriaPage'));
const FornecedoresPage = lazy(() => import('./pages/FornecedoresPage'));
const AlertasPage = lazy(() => import('./pages/AlertasPage'));
const ComprasPage = lazy(() => import('./pages/ComprasPage'));
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'));
const ConformidadesPage = lazy(() => import('./pages/ConformidadesPage'));
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage'));
const MercadoPage = lazy(() => import('./pages/MercadoPage'));

function MainLayout() {
  const navigate = useNavigate();
  const { profile, actions, isLoading, isAuthenticated } = useAuthSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((o) => !o);
  }, []);

  const closeSidebarMobile = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => closeSidebarMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeSidebarMobile]);

  const handleLogout = useCallback(async () => {
    try {
      await actions.logout();
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
    navigate('/login', { replace: true });
  }, [actions.logout, navigate]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sidebarOpen) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sidebarOpen]);

  if (isLoading) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const initials = (name?: string) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  };

  return (
    <div className="app-layout" role="application" aria-label="Layout principal da aplicação">
      <button
        className="btn-menu"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={sidebarOpen}
      >
        ☰ Menu
      </button>

      {sidebarOpen && (
        <div
          className="overlay"
          onClick={closeSidebarMobile}
          aria-hidden="true"
        />
      )}

      <nav
        className={`sidebar ${sidebarOpen ? 'active' : ''}`}
        aria-label="Navegação principal"
      >
        <div className="sidebar-header">
          <h2>Econdomiza</h2>
        </div>
        <div className="sidebar-menu">
          <ul className="menu-list">
            <li>
              <NavLink to="/dashboard" end>
                📊 Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/mercado">
                📈 Mercado
              </NavLink>
            </li>
            <li>
              <NavLink to="/fornecedores">
                🤝 Fornecedores
              </NavLink>
            </li>
            <li>
              <NavLink to="/compras">
                🛒 Compras
              </NavLink>
            </li>
            <li>
              <NavLink to="/relatorios">
                📑 Relatórios
              </NavLink>
            </li>
            <li>
              <NavLink to="/conformidades">
                ✅ Conformidades
              </NavLink>
            </li>
            <li>
              <NavLink to="/alertas">
                🔔 Alertas
              </NavLink>
            </li>
            <li>
              <NavLink to="/auditoria">
                🔍 Auditoria
              </NavLink>
            </li>
            <li>
              <NavLink to="/configuracoes">
                ⚙️ Configurações
              </NavLink>
            </li>
          </ul>
          <ul className="menu-list">
            <li>
              <button
                onClick={handleLogout}
                className="menu-link btn-logout"
                aria-label="Sair"
              >
                🚪 Sair
              </button>
            </li>
          </ul>
        </div>

        {profile && (
          <div className="sidebar-user" role="status" aria-live="polite">
            <div className="user-avatar">{initials(profile?.name || profile?.email)}</div>
            <p className="user-name">{profile?.name || profile?.email || 'Utilizador'}</p>
            <p className="user-role">{profile?.role || '—'}</p>
          </div>
        )}
      </nav>

      <main className="main-content" aria-label="Conteúdo principal">
        <LazyShell>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/mercado" element={<MercadoPage />} />
            <Route path="/fornecedores" element={<FornecedoresPage />} />
            <Route path="/compras" element={<ComprasPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/conformidades" element={<ConformidadesPage />} />
            <Route path="/alertas" element={<AlertasPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          </Routes>
        </LazyShell>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorProvider>
      <ToastProvider>
        <Router>
          <AuthSessionProvider>
            <Routes>
              <Route
                path="/login"
                element={<LoginForm defaultTenantId={import.meta.env.VITE_DEFAULT_TENANT_ID} />}
              />
              <Route
                path="/register"
                element={<RegisterForm defaultTenantId={import.meta.env.VITE_DEFAULT_TENANT_ID} />}
              />
              <Route path="/auth.html" element={<div>Autenticação clássica (HTML legacy)</div>} />
              <Route path="*" element={<MainLayout />} />
            </Routes>
          </AuthSessionProvider>
        </Router>
      </ToastProvider>
    </ErrorProvider>
  );
}

export default App;