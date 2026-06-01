import { Suspense, type ReactNode } from 'react';
import { PageLoadingState } from './layout/PageLoadStates';

export function RouteFallback() {
  return <PageLoadingState id="route-fallback" message="Carregando página…" skeletonMaxWidth={640} />;
}

export function LazyShell({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}
