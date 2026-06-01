import { Link } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { formatAlertDatePtBr } from '../../../lib/alert-row';
import { Badge } from '../../../components/ui';
import type { DashboardAlertItem } from '../hooks/useDashboardData';

const SEVERITY_BADGE: Record<
  DashboardAlertItem['severity'],
  { variant: 'error' | 'warning' | 'neutral'; label: string }
> = {
  high: { variant: 'error', label: 'Urgente' },
  medium: { variant: 'warning', label: 'Média' },
  low: { variant: 'neutral', label: 'Baixa' },
};

const RECENT_LIMIT = 5;

interface DashboardAlertsPanelProps {
  alerts: DashboardAlertItem[];
  fetchError: string | null;
}

export function DashboardAlertsPanel({ alerts, fetchError }: DashboardAlertsPanelProps) {
  const recent = alerts.slice(0, RECENT_LIMIT);

  return (
    <section
      className="flex h-full flex-col rounded-xl border border-surface-border bg-surface-card shadow-macro-sm"
      aria-labelledby="dashboard-alerts-heading"
    >
      <header className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-primary" aria-hidden />
          <h2 id="dashboard-alerts-heading" className="text-base font-semibold text-text-main">
            Alertas recentes
          </h2>
        </div>
        <Link
          to="/alertas"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary transition-colors hover:text-brand-secondary"
        >
          Ver todos
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </header>

      <div className="flex-1 p-3 sm:p-4">
        {fetchError ? (
          <div className="rounded-lg bg-status-error/5 px-4 py-6 text-center" role="alert">
            <Bell className="mx-auto mb-2 h-8 w-8 text-status-error" aria-hidden />
            <p className="text-sm font-medium text-text-main">Alertas indisponíveis</p>
            <p className="mt-1 text-sm text-text-muted">{fetchError}</p>
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-lg bg-surface-muted px-4 py-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-text-muted" aria-hidden />
            <p className="text-sm font-medium text-text-main">Sem alertas</p>
            <p className="mt-1 text-sm text-text-muted">
              Novos alertas de auditoria ou conformidade aparecerão aqui.
            </p>
            <Link
              to="/alertas"
              className="mt-4 inline-flex text-sm font-medium text-brand-primary hover:text-brand-secondary"
            >
              Ver central de alertas
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-surface-border" role="list">
            {recent.map((alert) => {
              const badge = SEVERITY_BADGE[alert.severity];
              return (
                <li key={alert.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <Badge variant={badge.variant} className="h-fit shrink-0">
                    {badge.label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-main">{alert.type}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{alert.message}</p>
                  </div>
                  <time className="shrink-0 text-xs text-text-muted" dateTime={alert.createdAt || undefined}>
                    {formatAlertDatePtBr(alert.createdAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
