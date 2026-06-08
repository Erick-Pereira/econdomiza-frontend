import type { AuthenticatedContentPath } from './authenticated-route-registry';
import { AUTHENTICATED_NAV_SPEC } from './authenticated-route-registry';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard } from 'lucide-react';
import { roleCanAccessRoute, hasRole } from '../lib/permissions/rbac';

export type AppNavItem = {
  to: AuthenticatedContentPath | '/morador';
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

/** Deriva do registo único — manter ordem em `AUTHENTICATED_NAV_SPEC`. */
export const APP_NAV_ITEMS: AppNavItem[] = AUTHENTICATED_NAV_SPEC.map((n) => ({
  to: n.path,
  label: n.label,
  icon: n.icon,
  ...(n.end ? { end: true as const } : {}),
}));

/** Item "Início" exclusivo para o papel Morador. */
const MORADOR_HOME_ITEM: AppNavItem = {
  to: '/morador',
  label: 'Início',
  icon: LayoutDashboard,
  end: true,
};

const NAV_LABEL_BY_ROLE: Partial<
  Record<AuthenticatedContentPath, Partial<Record<'MORADOR' | 'SINDICO' | 'CONSELHO' | 'ADMIN', string>>>
> = {
  '/auditoria': {
    MORADOR: 'Relatório auditoria',
    SINDICO: 'Relatório auditoria',
    CONSELHO: 'Relatório auditoria',
    ADMIN: 'Auditoria',
  },
  '/conformidades': {
    MORADOR: 'Obrigações',
    SINDICO: 'Obrigações',
    CONSELHO: 'Obrigações',
    ADMIN: 'Obrigações',
  },
  '/compras': {
    SINDICO: 'Despesas (aprovar)',
    CONSELHO: 'Despesas (aprovar)',
    ADMIN: 'Despesas',
  },
};

function navLabelForRole(path: AuthenticatedContentPath, role: string | undefined): string {
  const base = APP_NAV_ITEMS.find((i) => i.to === path)?.label ?? path;
  if (!role) return base;
  const r = role.toUpperCase();
  const overrides = NAV_LABEL_BY_ROLE[path];
  if (!overrides) return base;
  if (r === 'MORADOR' && overrides.MORADOR) return overrides.MORADOR;
  if (r === 'SINDICO' && overrides.SINDICO) return overrides.SINDICO;
  if (r === 'CONSELHO' && overrides.CONSELHO) return overrides.CONSELHO;
  if (r === 'ADMIN' && overrides.ADMIN) return overrides.ADMIN;
  return base;
}

/** Filtra itens de nav com base no papel do utilizador. */
export function getNavItemsForRole(role: string | undefined): AppNavItem[] {
  const filterAndLabel = (items: AppNavItem[]) =>
    items
      .filter((item) => roleCanAccessRoute(role, item.to as AuthenticatedContentPath))
      .map((item) => ({
        ...item,
        label: navLabelForRole(item.to as AuthenticatedContentPath, role),
      }));

  if (hasRole(role, 'MORADOR')) {
    return [MORADOR_HOME_ITEM, ...filterAndLabel(APP_NAV_ITEMS)];
  }
  return filterAndLabel(APP_NAV_ITEMS);
}
