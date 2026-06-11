import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ChevronRight } from 'lucide-react';
import { useAuthSession } from '../../../context/AuthSessionContext';
import { formatDatePtBr, parseApiDateLocal } from '../../../lib/format-date-pt-br';
import { Badge, Button } from '../../../components/ui';
import { useConformidadesHubData } from '../../conformidades/hooks/useConformidadesHubData';
import {
  BUCKET_META,
  bucketForItem,
  type ObrigacaoBucket,
  type ObrigacaoItem,
} from '../../conformidades/lib/obrigacao-map';

const RECENT_LIMIT = 5;

const BUCKET_BADGE: Record<
  ObrigacaoBucket,
  { variant: 'warning' | 'error' | 'neutral' | 'ok'; label: string }
> = {
  pendente: { variant: 'warning', label: 'Pendente' },
  'em-dia': { variant: 'ok', label: 'Em dia' },
  vencido: { variant: 'error', label: 'Vencido' },
  critico: { variant: 'error', label: 'Crítico' },
};

function sortForDashboard(items: ObrigacaoItem[]): ObrigacaoItem[] {
  const open = items.filter((it) => it.lifecycle !== 'completed');
  return [...open].sort((a, b) => {
    const rank = (it: ObrigacaoItem) => {
      const bucket = bucketForItem(it);
      if (bucket === 'critico') return 0;
      if (bucket === 'vencido') return 1;
      if (bucket === 'pendente') return 2;
      return 3;
    };
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const da = a.dueDate
      ? (parseApiDateLocal(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;
    const db = b.dueDate
      ? (parseApiDateLocal(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;
    return da - db;
  });
}

export function DashboardComplianceCard() {
  const { profile } = useAuthSession();
  const { items, isInitialLoading, errorMessage } = useConformidadesHubData(profile?.tenantId);

  const counts = useMemo(() => {
    const c: Record<ObrigacaoBucket, number> = {
      pendente: 0,
      'em-dia': 0,
      vencido: 0,
      critico: 0,
    };
    for (const it of items) {
      c[bucketForItem(it)] += 1;
    }
    return c;
  }, [items]);

  const recent = useMemo(() => sortForDashboard(items).slice(0, RECENT_LIMIT), [items]);
  const openCount = counts.pendente + counts.vencido + counts.critico;

  return (
    <section
      className="flex h-full flex-col rounded-xl border border-surface-border bg-surface-card shadow-macro-sm"
      aria-labelledby="dashboard-compliance-heading"
    >
      <header className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-brand-primary" aria-hidden />
          <h2 id="dashboard-compliance-heading" className="text-base font-semibold text-text-main">
            Obrigações e vistorias
          </h2>
        </div>
        <Link
          to="/conformidades"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary transition-colors hover:text-brand-secondary"
        >
          Ver todas
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </header>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {isInitialLoading ? (
          <div className="space-y-3 py-2" aria-busy="true" aria-label="A carregar obrigações">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="rounded-lg bg-status-error/5 px-4 py-6 text-center" role="alert">
            <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-status-error" aria-hidden />
            <p className="text-sm font-medium text-text-main">Obrigações indisponíveis</p>
            <p className="mt-1 text-sm text-text-muted">{errorMessage}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col justify-between gap-6">
            <div className="rounded-lg bg-surface-muted px-4 py-8 text-center">
              <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-text-muted" aria-hidden />
              <p className="text-sm font-medium text-text-main">Nenhuma obrigação cadastrada</p>
              <p className="mt-1 text-sm text-text-muted">
                AVCB, elevadores, licenças e outras vistorias podem ser registadas na área de conformidade.
              </p>
            </div>
            <Link to="/conformidades" className="inline-flex w-full sm:w-auto">
              <Button variant="outline" size="md" fullWidth className="sm:w-auto">
                Cadastrar obrigações
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['pendente', 'vencido', 'critico', 'em-dia'] as ObrigacaoBucket[]).map((key) => (
                <div key={key} className={`rounded-lg px-3 py-2 ${BUCKET_META[key].cardClass}`}>
                  <p className="text-lg font-semibold tabular-nums">{counts[key]}</p>
                  <p className="text-xs text-text-muted">{BUCKET_META[key].label}</p>
                </div>
              ))}
            </div>

            {openCount === 0 ? (
              <p className="mb-4 text-sm text-text-muted">Todas as obrigações estão em dia.</p>
            ) : (
              <ul className="divide-y divide-surface-border" role="list">
                {recent.map((item) => {
                  const bucket = bucketForItem(item);
                  const badge = BUCKET_BADGE[bucket];
                  return (
                    <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                      <Badge variant={badge.variant} className="h-fit shrink-0">
                        {badge.label}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-main">{item.typeLabel}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{item.description}</p>
                      </div>
                      {item.dueDate ? (
                        <time className="shrink-0 text-xs text-text-muted" dateTime={item.dueDate}>
                          {formatDatePtBr(item.dueDate)}
                        </time>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            <Link to="/conformidades" className="mt-4 inline-flex w-full sm:w-auto">
              <Button variant="outline" size="md" fullWidth className="sm:w-auto">
                Abrir obrigações
              </Button>
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
