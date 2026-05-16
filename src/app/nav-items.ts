import type { AuthenticatedContentPath } from './authenticated-route-registry';
import { AUTHENTICATED_NAV_SPEC } from './authenticated-route-registry';

export type AppNavItem = {
  to: AuthenticatedContentPath;
  label: string;
  emoji: string;
  end?: boolean;
};

/** Deriva do registo único — manter ordem em `AUTHENTICATED_NAV_SPEC`. */
export const APP_NAV_ITEMS: AppNavItem[] = AUTHENTICATED_NAV_SPEC.map((n) => ({
  to: n.path,
  label: n.label,
  emoji: n.emoji,
  ...(n.end ? { end: true as const } : {}),
}));
