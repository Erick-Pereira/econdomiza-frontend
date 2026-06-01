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

type NavSpecEntry = {
  path: AuthenticatedContentPath;
  label: string;
  emoji: string;
  end?: boolean;
};

/** Ordem do menu lateral (auditoria de gastos — ver PRODUCT_POSITIONING). */
export const AUTHENTICATED_NAV_SPEC: readonly NavSpecEntry[] = [
  { path: '/dashboard', label: 'Painel', emoji: '📊', end: true },
  { path: '/auditoria', label: 'Auditoria', emoji: '🔍' },
  { path: '/compras', label: 'Despesas', emoji: '🛒' },
  { path: '/fornecedores', label: 'Fornecedores', emoji: '🤝' },
  { path: '/produtos', label: 'Produtos', emoji: '📦' },
  { path: '/conformidades', label: 'Conformidade', emoji: '📋' },
  { path: '/alertas', label: 'Alertas', emoji: '🔔' },
  { path: '/insights', label: 'Insights', emoji: '💡' },
  { path: '/relatorios', label: 'Relatórios', emoji: '📑' },
  { path: '/notificacoes', label: 'Notificações', emoji: '📣' },
  { path: '/configuracoes', label: 'Conta', emoji: '⚙️' },
];
