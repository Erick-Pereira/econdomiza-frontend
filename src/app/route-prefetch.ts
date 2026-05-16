import { AUTHENTICATED_PAGE_LOADERS, type AuthenticatedContentPath } from './authenticated-route-registry';

/**
 * Pré-carrega o chunk da página correspondente (Vite + dynamic import).
 * Loaders partilhados com `authenticated-routes.tsx` via `authenticated-route-registry.ts`.
 */
export function prefetchAuthenticatedRoute(to: string): void {
  const loader = AUTHENTICATED_PAGE_LOADERS[to as AuthenticatedContentPath];
  if (loader) void loader();
}
