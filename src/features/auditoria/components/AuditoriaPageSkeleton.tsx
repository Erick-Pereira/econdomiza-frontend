import { SkeletonLoading } from '../../../components/ui';

export function AuditoriaPageSkeleton() {
  return (
    <div className="w-full space-y-8" id="auditoria-page" aria-busy="true" aria-label="Carregando auditoria">
      <div className="space-y-3">
        <SkeletonLoading size="sm" className="w-24 rounded-md" />
        <SkeletonLoading size="lg" className="w-72 max-w-full rounded-lg" />
        <SkeletonLoading size="sm" className="w-full max-w-lg rounded-md" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoading key={i} size="lg" className="w-full rounded-xl" />
        ))}
      </div>

      <SkeletonLoading size="lg" className="h-40 w-full rounded-xl" />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoading key={i} size="md" className="w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
