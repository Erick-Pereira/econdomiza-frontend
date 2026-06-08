/**
 * Fonte única para: imports dinâmicos das páginas autenticadas e ordem/labels do menu.
 * `authenticated-routes.tsx` e `route-prefetch.ts` devem usar apenas `AUTHENTICATED_PAGE_LOADERS`.
 * Cada `path` em `AUTHENTICATED_NAV_SPEC` deve existir como chave em `AUTHENTICATED_PAGE_LOADERS`.
 */
export const AUTHENTICATED_PAGE_LOADERS = {
  '/dashboard': () => import('../pages/DashboardPage'),
  '/fornecedores': () => import('../pages/FornecedoresPage'),
  '/compras': () => import('../pages/ComprasPage'),
  '/produtos': () => import('../pages/ProdutosPage'),
  '/alertas': () => import('../pages/AlertasPage'),
  '/notificacoes': () => import('../pages/notifications/NotificationsLayout'),
  '/conformidades': () => import('../pages/compliance/ComplianceLayout'),
  '/auditoria': () => import('../pages/AuditoriaPage'),
  '/insights': () => import('../pages/InsightsPage'),
  '/relatorios': () => import('../pages/RelatoriosPage'),
  '/configuracoes': () => import('../pages/ConfiguracoesPage'),
} as const;

export type AuthenticatedContentPath = keyof typeof AUTHENTICATED_PAGE_LOADERS;

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ShieldCheck,
  Receipt,
  Handshake,
  Package,
  ClipboardList,
  BellRing,
  Lightbulb,
  FileText,
  MessageSquareMore,
  Settings,
} from 'lucide-react';

type NavSpecEntry = {
  path: AuthenticatedContentPath;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

/** Ordem do menu lateral (auditoria de gastos — ver PRODUCT_POSITIONING). */
export const AUTHENTICATED_NAV_SPEC: readonly NavSpecEntry[] = [
  { path: '/dashboard', label: 'Painel', icon: LayoutDashboard, end: true },
  { path: '/auditoria', label: 'Auditoria', icon: ShieldCheck },
  { path: '/compras', label: 'Despesas', icon: Receipt },
  { path: '/fornecedores', label: 'Fornecedores', icon: Handshake },
  { path: '/produtos', label: 'Produtos', icon: Package },
  { path: '/conformidades', label: 'Conformidade', icon: ClipboardList },
  { path: '/alertas', label: 'Alertas', icon: BellRing },
  { path: '/insights', label: 'Insights', icon: Lightbulb },
  { path: '/relatorios', label: 'Relatórios', icon: FileText },
  { path: '/notificacoes', label: 'Notificações', icon: MessageSquareMore },
  { path: '/configuracoes', label: 'Conta', icon: Settings },
];
