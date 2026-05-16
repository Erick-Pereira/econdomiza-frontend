import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthSession } from '../../context/AuthSessionContext';
import { LazyShell, RouteFallback } from '../../components/LazyShell';
import SidebarNav from '../../components/layout/SidebarNav';
import AuthenticatedRoutes from '../authenticated-routes';
import { APP_NAV_ITEMS } from '../nav-items';

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, actions, isLoading, isAuthenticated } = useAuthSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen || typeof window === 'undefined') return;
    if (window.innerWidth > 768) return;
    const first = sidebarRef.current?.querySelector<HTMLElement>('a[href], button[type="button"]');
    window.requestAnimationFrame(() => first?.focus());
  }, [sidebarOpen]);

  const handleLogout = useCallback(async () => {
    try {
      await actions.logout();
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
    navigate('/login', { replace: true });
  }, [actions, navigate]);

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
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        Ir para o conteúdo principal
      </a>
      <button
        ref={menuButtonRef}
        type="button"
        className="btn-menu"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
        aria-expanded={sidebarOpen}
      >
        <span aria-hidden className="btn-menu__glyph">
          ☰
        </span>{' '}
        <span className="btn-menu__label">Menu</span>
      </button>

      {sidebarOpen && (
        <div className="overlay" onClick={closeSidebarMobile} aria-hidden="true" />
      )}

      <nav
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? 'active' : ''}`}
        aria-label="Navegação principal"
      >
        <div className="sidebar-header">
          <p className="sidebar-brand-kicker">Gestão condominial</p>
          <h2 className="sidebar-brand-title">Econdomiza</h2>
        </div>
        <div className="sidebar-menu">
          <SidebarNav items={APP_NAV_ITEMS} onNavigate={closeSidebarMobile} />
          <ul className="menu-list">
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className="menu-link btn-logout"
                aria-label="Encerrar sessão e sair"
              >
                <span aria-hidden>🚪</span> Sair
              </button>
            </li>
          </ul>
        </div>

        {profile && (
          <div className="sidebar-user" role="status" aria-live="polite">
            <div className="user-avatar">{initials(profile?.name || profile?.email)}</div>
            <p className="user-name">{profile?.name || profile?.email || 'Usuário'}</p>
            <p className="user-role">{profile?.role || '—'}</p>
          </div>
        )}
      </nav>

      <main id="main-content" className="main-content" aria-label="Conteúdo principal">
        <div className="app-page-wrap">
          <LazyShell>
            <AuthenticatedRoutes />
          </LazyShell>
        </div>
      </main>
    </div>
  );
}
