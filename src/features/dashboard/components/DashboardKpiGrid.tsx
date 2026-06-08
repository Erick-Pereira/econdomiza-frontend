import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, FileSearch, Handshake, Wallet } from 'lucide-react';
import type { DashboardKpiPayload } from '../../../lib/dashboard-from-monthly';
import { cn } from '../../../lib/cn';

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

type KpiTone = 'economy' | 'alerts' | 'audits' | 'suppliers';

const TONE_STYLES: Record<KpiTone, { icon: LucideIcon; iconWrap: string; iconColor: string }> = {
  economy: {
    icon: Wallet,
    iconWrap: 'bg-status-success/10',
    iconColor: 'text-status-success',
  },
  alerts: {
    icon: AlertTriangle,
    iconWrap: 'bg-status-error/10',
    iconColor: 'text-status-error',
  },
  audits: {
    icon: FileSearch,
    iconWrap: 'bg-status-info/10',
    iconColor: 'text-status-info',
  },
  suppliers: {
    icon: Handshake,
    iconWrap: 'bg-brand-primary/10',
    iconColor: 'text-brand-primary',
  },
};

interface KpiCardProps {
  tone: KpiTone;
  label: string;
  value: string;
  hint: string;
}

function KpiCard({ tone, label, value, hint }: KpiCardProps) {
  const { icon: Icon, iconWrap, iconColor } = TONE_STYLES[tone];

  return (
    <article
      className={cn(
        'flex items-start gap-3 sm:gap-4 rounded-xl border border-surface-border bg-surface-card p-4 sm:p-5',
        'shadow-macro-sm transition-shadow duration-200 ease-in-out',
        'hover:border-brand-primary/25 hover:shadow-macro-md'
      )}
    >
      <div
        className={cn('flex h-10 sm:h-11 w-10 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl', iconWrap)}
        aria-hidden
      >
        <Icon className={cn('h-5 w-5', iconColor)} />
        <Icon className={cn('h-4 sm:h-5 w-4 sm:w-5', iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <p className="mt-2 text-lg sm:text-2xl font-bold tabular-nums tracking-tight text-text-main">{value}</p>
        <p className="mt-1.5 text-xs sm:text-sm leading-snug text-text-muted">{hint}</p>
      </div>
    </article>
  );
}

interface DashboardKpiGridProps {
  kpis: DashboardKpiPayload;
  highPriorityCount: number;
}

export function DashboardKpiGrid({ kpis, highPriorityCount }: DashboardKpiGridProps) {
  return (
    <section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Indicadores principais"
    >
      <KpiCard
        tone="economy"
        label="Gasto processado"
        value={moneyBr(kpis.gastoProcessado)}
        hint={`Em aberto: ${moneyBr(kpis.valorEmAberto)}`}
      />
      <KpiCard
        tone="alerts"
        label="Alertas ativos"
        value={String(kpis.alertasAtivos)}
        hint={`${highPriorityCount} marcados como urgentes`}
      />
      <KpiCard
        tone="audits"
        label="Auditorias"
        value={String(kpis.auditoriasRealizadas)}
        hint="Total no período do resumo"
      />
      <KpiCard
        tone="suppliers"
        label="Fornecedores"
        value={String(kpis.fornecedoresCadastrados)}
        hint="Cadastro interno do condomínio"
      />
    </section>
  );
}
