'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import SidebarNav from '../../components/layout/SidebarNav';
import { getNavItemsForRole } from '../nav-items';
import { TENANT_ROLE_LABELS, isTenantRole } from '../../domain/auth-roles';
import { PRODUCT_COPY } from '../../lib/product-copy';
import './DashboardLayout.scss';

interface DashboardLayoutProps {
  children?: React.ReactNode;
  pageTitle?: string;
}

export function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const { profile, actions, isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Verificar se motion está disponível para evitar erro
  useEffect(() => {
    if (!sidebarOpen) {
      const btn = document.getElementById('main-menu-toggle');
      btn?.focus();
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
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

  const isLoggedIn = isAuthenticated !== null && !isLoading;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl">
          <h1 className="text-3xl font-secondary font-bold text-white mb-4 drop-shadow-lg">
            Bem-vindo ao Encondomiza
          </h1>
          <p className="text-white/70 mb-6">Verificando sua sessão de autenticação...</p>
          {isLoading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-b-4 border-indigo-400" />
              <span className="text-white text-sm font-medium">Carregando...</span>
            </div>
          ) : (
            <p className="text-white">Redirecionando para login obrigatório...</p>
          )}
        </div>
      </div>
    );
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
            className="fixed inset-0 z-[1250] bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <motion.aside
          variants={{ hidden: { opacity: 0, x: -32 }, visible: { opacity: 1, x: 0 } }}
          initial="hidden"
          animate="visible"
          exit="hidden"
          id="sidebar"
          className={`fixed left-0 top-0 z-[1200] flex h-full w-[252px] flex-col bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 p-4 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:w-[252px] lg:shadow-[8px_0_32px_rgba(0,0,0,0.3)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          aria-label="Navegação principal"
        >
          <div className="mb-8 mt-6 flex items-center gap-3 px-4 py-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg"
            >
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </motion.div>
            <div className="flex flex-col">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70 drop-shadow-sm">
                SIMC-AG
              </p>
              <h2 className="font-secondary text-xl font-bold leading-tight text-white drop-shadow-lg">
                {PRODUCT_COPY.brandTitle}
              </h2>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="space-y-2"
          >
            <SidebarNav items={navItems} onNavigate={closeSidebarMobile} />
          </motion.div>

          <ul className="menu-list mt-auto mb-6">
            <li>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="flex h-[2.5rem] w-full items-center gap-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:from-red-600 hover:to-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 md:inline-flex shadow-lg hover:shadow-xl"
              >
                <span aria-hidden>🚪</span> Sair da Conta
              </button>
            </li>
          </ul>

          {profile && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-auto mb-6 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="aspect-square h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 font-bold text-base text-white shadow-lg flex items-center justify-center ring-2 ring-white/30"
                >
                  {initials(profile.name || profile.email)}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white drop-shadow-md">
                    {profile?.name || profile?.email || 'Usuário'}
                  </p>
                  <p className="truncate text-xs text-white/70">{roleLabel}</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.aside>

        <main id="main-content" className={`flex-1 min-w-0 flex flex-col ${sidebarOpen ? 'ml-[252px]' : ''}`}>
          <header className="sticky top-0 z-50 flex h-auto min-h-[3.5rem] w-full items-center gap-4 bg-white/10 backdrop-blur-xl px-6 shadow-lg border-b border-white/10">
            <motion.button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-[2.5rem] w-[3rem] items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-2 text-white transition-all duration-200 ease-in-out hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 md:hidden shadow-lg"
              id="menu-toggle"
              aria-label="Abrir menu de navegação"
              aria-expanded={sidebarOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </motion.button>

            <div className="flex-1 overflow-hidden">
              <h1 className="text-lg font-bold text-white drop-shadow-md truncate">
                {pageTitle || 'Dashboard'}
              </h1>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="pl-4 border-l border-white/20 flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2"
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm ring-1 ring-white/30 shadow-sm">
                  {initials(profile?.name || profile?.email || '')}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white drop-shadow-sm truncate">
                    {profile?.name || 'Usuário'}
                  </span>
                  <span className="text-xs text-white/65 truncate">
                    {(profile?.role && isTenantRole(profile.role)
                      ? TENANT_ROLE_LABELS[profile.role]
                      : null) || roleLabel}
                  </span>
                </div>
              </motion.div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</div>
        </main>
      </div>
    </>
  );
}

export function initials(nameOrEmail: string) {
  const name = nameOrEmail.split(' ')[0];
  return (
    <span className="font-bold tracking-wider">
      {name?.charAt(0).toUpperCase()}
      {name?.length > 1 ? name.charAt(1).toUpperCase() : ''}
    </span>
  );
}
