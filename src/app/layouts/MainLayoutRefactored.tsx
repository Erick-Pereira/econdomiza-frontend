'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SidebarNav from '../../components/layout/SidebarNav';
import { LazyShell, RouteFallback } from '../../components/LazyShell';
import AuthenticatedRoutes from '../authenticated-routes';
import { getNavItemsForRole } from '../nav-items';
import { TENANT_ROLE_LABELS, isTenantRole } from '../../domain/auth-roles';
import { hasRole } from '../../lib/permissions/rbac';
import { PRODUCT_COPY } from '../../lib/product-copy';
import { UserInitials } from '../../lib/user-initials';
import './MainLayoutRefactored.scss';

export function MainLayoutRefactored() {
  const { profile, actions, isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const storedOpen = sessionStorage.getItem('sidebar-open-mobile');
    if (storedOpen === 'true') setSidebarOpen(true);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) {
      document.getElementById('main-menu-toggle')?.focus();
    }
  }, [sidebarOpen]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const closeSidebarMobile = useCallback(() => {
    setSidebarOpen(false);
    sessionStorage.setItem('sidebar-open-mobile', 'false');
  }, []);

  const handleLogout = useCallback(async () => {
    await actions.logout();
    window.location.href = '/login';
  }, [actions]);

  const roleLabel = isTenantRole(profile?.role) ? TENANT_ROLE_LABELS[profile.role] : 'Usuário';

  const navRole = isTenantRole(profile?.role) ? profile.role : 'MORADOR';
  const navItems = useMemo(() => getNavItemsForRole(navRole), [navRole]);

  const defaultRoute = hasRole(profile?.role, 'MORADOR') ? '/morador' : '/dashboard';

  if (isLoading) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebarMobile}
            className="fixed inset-0 z-[1250] bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className="app-shell flex h-screen min-h-0 overflow-hidden">
        <motion.aside
          variants={{ hidden: { opacity: 0, x: -32 }, visible: { opacity: 1, x: 0 } }}
          initial="hidden"
          animate="visible"
          id="sidebar"
          className={`fixed left-0 top-0 z-[1200] flex h-full w-[252px] flex-col bg-gradient-to-br from-brand-primary to-brand-secondary p-4 shadow-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0 lg:shadow-xl ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Navegação principal"
        >
          <div className="mb-6 mt-8 flex items-center gap-3 border-b border-white/20 pb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/75">
              {PRODUCT_COPY.brandKicker}
            </p>
            <h2 className="font-secondary text-xl font-semibold leading-tight text-white drop-shadow-md">
              {PRODUCT_COPY.brandTitle}
            </h2>
          </div>

          <nav className="sidebar-menu flex-1 overflow-y-auto" aria-label="Menu">
            <SidebarNav items={navItems} onNavigate={closeSidebarMobile} />
          </nav>

          <ul className="menu-list mt-2 md:hidden">
            <li>
              <button
                id="main-menu-toggle"
                type="button"
                onClick={handleLogout}
                className="flex h-[2.5rem] w-full items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/40 md:hidden"
                aria-label="Encerrar sessão e sair"
              >
                <LogOut className="h-5 w-5 shrink-0 text-white/80" aria-hidden /> Sair
              </button>
            </li>
          </ul>

          {profile && (
            <div className="mt-auto border-t border-white/20 p-4" role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary-light to-brand-accent text-sm font-semibold text-brand-primary ring-2 ring-white/30">
                  <UserInitials nameOrEmail={profile.name || profile.email} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{profile.name || profile.email}</p>
                  <p className="truncate text-xs text-white/75">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 hidden w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 md:flex"
              >
                <LogOut className="h-5 w-5 shrink-0 text-white/80" aria-hidden /> Sair
              </button>
            </div>
          )}
        </motion.aside>

        <main
          id="main-content"
          className={`app-shell__main flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto ${sidebarOpen ? 'ml-[252px] md:ml-0' : ''}`}
        >
          <header className="app-shell__header sticky top-0 z-[1300] flex min-h-[4.5rem] w-full items-center gap-4 px-6">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-12 items-center justify-center rounded-xl bg-brand-primary p-2 text-white hover:bg-brand-secondary focus-visible:ring-2 focus-visible:ring-brand-secondary md:hidden"
              aria-label="Abrir menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-base font-semibold text-[var(--text-main)]">
                {PRODUCT_COPY.brandTitle}
              </p>
            </div>
            {profile && (
              <div className="hidden items-center gap-3 md:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary-light to-brand-accent text-xs font-semibold text-brand-primary ring-1 ring-surface-border">
                  <UserInitials nameOrEmail={profile.name || profile.email} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-main)]">
                    {profile.name || 'Usuário'}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{roleLabel}</p>
                </div>
              </div>
            )}
          </header>

          <div className="flex w-full flex-1 justify-center px-5 py-6 sm:py-7 lg:py-8">
            <div className="w-full max-w-[1080px]">
              <LazyShell>
                <AuthenticatedRoutes userRole={profile?.role} defaultRoute={defaultRoute} />
              </LazyShell>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
