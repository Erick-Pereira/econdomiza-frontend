import { CheckCircle2, Clock, FileStack, Hourglass } from 'lucide-react';
import type { AuditoriaStats } from '../hooks/useAuditoriaData';
import { cn } from '../../../lib/cn';

interface StatCardProps {
  label: string;
  value: number;
  hint: string;
  icon: typeof FileStack;
  tone: 'brand' | 'info' | 'success' | 'warning';
}

const TONE: Record<StatCardProps['tone'], string> = {
  brand: 'bg-brand-primary/10 text-brand-primary',
  info: 'bg-status-info/10 text-status-info',
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-amber-700',
};

function StatCard({ label, value, hint, icon: Icon, tone }: StatCardProps) {
  return (
    <article
      className={cn(
        'rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm',
        'transition-shadow hover:shadow-macro-md'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONE[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-text-main">{value}</p>
          <p className="mt-0.5 text-xs text-text-muted">{hint}</p>
        </div>
      </div>
    </article>
  );
}

export function AuditoriaStatsGrid({ stats }: { stats: AuditoriaStats }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label="Resumo da auditoria">
      <StatCard
        label="Despesas"
        value={stats.total}
        hint="Registos no condomínio"
        icon={FileStack}
        tone="brand"
      />
      <StatCard
        label="Em processamento"
        value={stats.processing}
        hint="Pipeline de ingestão/OCR"
        icon={Clock}
        tone="info"
      />
      <StatCard
        label="Aprovadas"
        value={stats.approved}
        hint="Liberadas pela fiscalização"
        icon={CheckCircle2}
        tone="success"
      />
      <StatCard
        label="Aguardando aprovação"
        value={stats.pendingApproval}
        hint="Pendentes de Síndico/Conselho"
        icon={Hourglass}
        tone="warning"
      />
    </section>
  );
}
