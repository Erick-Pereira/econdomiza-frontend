import { SkeletonLoading } from '../../../components/ui';

export function DashboardPageSkeleton() {
  return (
    <div className="w-full space-y-8" id="dashboard-page" aria-busy="true" aria-label="Carregando painel">
      <div className="space-y-3">
        <SkeletonLoading size="sm" className="w-20 rounded-md" />
        <SkeletonLoading size="lg" className="w-64 max-w-full rounded-lg" />
        <SkeletonLoading size="sm" className="w-full max-w-md rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-macro-sm"
          >
            <div className="flex items-start gap-4">
              <SkeletonLoading shape="circle" size="md" className="h-11 w-11 shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonLoading size="sm" className="w-24 rounded-md" />
                <SkeletonLoading size="md" className="w-32 rounded-md" />
                <SkeletonLoading size="sm" className="w-full rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-macro-sm"
          >
            <SkeletonLoading size="md" className="mb-4 w-40 rounded-lg" />
            <div className="space-y-3">
              <SkeletonLoading size="md" className="w-full rounded-lg" />
              <SkeletonLoading size="md" className="w-full rounded-lg" />
              <SkeletonLoading size="md" className="w-3/4 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
