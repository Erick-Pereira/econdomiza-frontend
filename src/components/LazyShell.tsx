import { Suspense, type ReactNode } from 'react';

export function RouteFallback() {
  return (
    <div className="page" style={{ padding: '1.5rem' }}>
      <p>Carregando…</p>
    </div>
  );
}

export function LazyShell({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}
