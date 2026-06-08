/**
 * Regras de papel no frontend — devem espelhar políticas do gateway (fonte de verdade).
 * Valores de `role` vêm de `GET /api/auth/me` (Admin, Sindico, Conselho, Morador).
 *
 * Hierarquia:
 *   Admin (plataforma) > Sindico > Conselho > Morador — perfis de fiscalização/auditoria no tenant
 */
import { normalizeRoleKey } from '../../domain/auth-roles';

export type AppRole = 'ADMIN' | 'SINDICO' | 'CONSELHO' | 'MORADOR';

export function normalizeRole(role: string | undefined | null): AppRole | null {
  const r = normalizeRoleKey(role);
  if (r === 'ADMIN') return 'ADMIN';
  if (r === 'SINDICO') return 'SINDICO';
  if (r === 'CONSELHO') return 'CONSELHO';
  if (r === 'MORADOR') return 'MORADOR';
  return null;
}

/** Verifica se o papel está em uma lista de papéis permitidos. */
export function hasRole(role: string | undefined, ...allowed: AppRole[]): boolean {
  const r = normalizeRole(role);
  return r !== null && allowed.includes(r);
}

// ──────────────────────────────────────────────
// Permissões específicas por funcionalidade
// ──────────────────────────────────────────────

/** Pode ver o Dashboard. */
export function canViewDashboard(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN', 'SINDICO', 'CONSELHO');
}

/** Pode fazer upload de documentos na auditoria. */
export function roleAllowsAuditDocumentUpload(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode ver a página de auditoria completa (com upload e fiscalização). */
export function canManageAuditoria(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode ver o relatório de auditoria (somente leitura). */
export function canViewAuditoriaRelatorio(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN', 'SINDICO', 'CONSELHO', 'MORADOR');
}

/** Pode cadastrar/editar Obrigações (Serviços). */
export function canManageObrigacoes(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN', 'SINDICO', 'CONSELHO');
}

/** Pode ver Obrigações (somente leitura para Morador). */
export function canViewObrigacoes(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN', 'SINDICO', 'CONSELHO', 'MORADOR');
}

/** Pode cadastrar Compras. */
export function canCreateCompras(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode aprovar/reprovar Compras. */
export function canApproveCompras(role: string | undefined): boolean {
  return hasRole(role, 'SINDICO', 'CONSELHO');
}

/** Pode ver Compras (aprovação Síndico/Conselho; cadastro Admin). */
export function canViewCompras(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN', 'SINDICO', 'CONSELHO');
}

/** Pode gerir Compras (criar/editar/deletar). */
export function canManageCompras(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode ver Fornecedores (operação Administradora). */
export function canViewFornecedores(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode gerir Fornecedores. */
export function canManageFornecedores(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode ver Produtos (operação Administradora). */
export function canViewProdutos(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode gerir Produtos. */
export function canManageProdutos(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode ver Alertas (operação Administradora). */
export function canViewAlertas(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode gerir Alertas. */
export function canManageAlertas(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode ver Notificações (central operacional — Administradora). */
export function canViewNotificacoes(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode gerir Notificações operacionais (reenvio, envio manual). */
export function canManageNotificacoes(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode configurar preferências de notificação (canais, alertas, mute/snooze). */
export function canConfigureNotificationPreferences(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN', 'SINDICO', 'CONSELHO');
}

/** Pode ver Insights / resumo IA da auditoria (operacao Administradora). */
export function canViewInsights(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode ver Relatórios agregados / PDF (operacao Administradora). */
export function canViewRelatorios(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN');
}

/** Pode ver a conta. */
export function canViewConta(role: string | undefined): boolean {
  return hasRole(role, 'ADMIN', 'SINDICO', 'CONSELHO', 'MORADOR');
}

// ──────────────────────────────────────────────
// Mapa de rotas → permissão
// ──────────────────────────────────────────────

export type NavPermissionCheck = (role: string | undefined) => boolean;

export const ROUTE_PERMISSION_MAP: Record<string, NavPermissionCheck> = {
  '/dashboard': canViewDashboard,
  '/fornecedores': canViewFornecedores,
  '/compras': canViewCompras,
  '/produtos': canViewProdutos,
  '/alertas': canViewAlertas,
  '/notificacoes': canViewNotificacoes,
  '/conformidades': canViewObrigacoes,
  '/auditoria': canViewAuditoriaRelatorio,
  '/insights': canViewInsights,
  '/relatorios': canViewRelatorios,
  '/configuracoes': canViewConta,
};

/** Retorna true se o papel tem acesso a uma rota. */
export function roleCanAccessRoute(role: string | undefined, path: string): boolean {
  const check = ROUTE_PERMISSION_MAP[path];
  if (!check) return false;
  return check(role);
}
