import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, FileSearch, Handshake, Wallet } from 'lucide-react';
import type { DashboardKpiPayload } from '../../../lib/dashboard-from-monthly';
import { cn } from '../../../lib/cn';

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

/** Reduz tipografia conforme o comprimento do valor (evita overflow em moeda longa). */
function kpiValueTextClass(value: string): string {
  const len = value.length;
  if (len > 18) return 'text-sm sm:text-base';
  if (len > 14) return 'text-base sm:text-lg';
  if (len > 11) return 'text-lg sm:text-xl';
  return 'text-xl sm:text-2xl';
}

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
        'min-w-0 overflow-hidden rounded-xl border border-surface-border bg-surface-card p-4 sm:p-5',
        'shadow-macro-sm transition-shadow duration-200 ease-in-out',
        'hover:border-brand-primary/25 hover:shadow-macro-md'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex h-10 sm:h-11 w-10 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl',
            iconWrap
          )}
          aria-hidden
        >
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      </div>
      <p
        className={cn(
          'mt-3 min-w-0 break-words font-bold tabular-nums leading-tight tracking-tight text-text-main',
          kpiValueTextClass(value)
        )}
        title={value}
      >
        {value}
      </p>
      <p className="mt-1.5 min-w-0 break-words text-xs leading-snug text-text-muted sm:text-sm" title={hint}>
        {hint}
      </p>
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
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:[grid-template-columns:repeat(4,minmax(0,1fr))] [&>article]:min-w-0"
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
