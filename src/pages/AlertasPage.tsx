import React, { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState } from '../components/layout/PageLoadStates';
import { Badge, Button, Input, Select, SkeletonLoading } from '../components/ui';
import { useAlertasList } from '../features/alertas/hooks/useAlertasList';
import { formatAlertDatePtBr } from '../lib/alert-row';
import { cn } from '../lib/cn';

type StatusFilter = 'todos' | 'aberto' | 'resolvido';

const PRIORITY_VARIANT: Record<string, 'error' | 'warning' | 'neutral'> = {
  alta: 'error',
  media: 'warning',
  baixa: 'neutral',
};

const AlertasPage: React.FC = () => {
  const { data, isLoading, isFetching, isError, error, refetch } = useAlertasList();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('aberto');

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'aberto' && row.status === 'aberto') ||
        (statusFilter === 'resolvido' && row.status === 'resolvido');
      const matchSearch =
        !q ||
        row.titulo.toLowerCase().includes(q) ||
        row.categoria.toLowerCase().includes(q) ||
        row.tipo.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [data, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="w-full space-y-6" aria-busy="true">
        <SkeletonLoading size="lg" className="w-64 rounded-lg" />
        <SkeletonLoading size="md" className="w-full rounded-xl" />
        <SkeletonLoading size="md" className="w-full rounded-xl" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <PageFatalErrorState
        id="alertas-page"
        message={error instanceof Error ? error.message : 'Erro ao carregar alertas.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="page w-full max-w-full min-w-0 overflow-x-hidden space-y-8" id="alertas-page">
      <PageHeader
        eyebrow="Monitorização"
        title="Central de alertas"
        description="Alertas de preço, conformidade e anomalias detectadas pela auditoria inteligente."
        toolbar={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
            icon={<RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />}
          >
            {isFetching ? 'A atualizar…' : 'Atualizar'}
          </Button>
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-text-muted"
            aria-hidden
          />
          <Input
            label="Buscar"
            id="alertas-search"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Título, categoria ou tipo…"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Estado"
            id="alertas-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[]}
          >
            <option value="todos">Todos</option>
            <option value="aberto">Abertos</option>
            <option value="resolvido">Resolvidos</option>
          </Select>
        </div>
      </div>

      <section className="rounded-xl border border-surface-border bg-surface-card shadow-macro-sm">
        <header className="border-b border-surface-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-main">
            {filtered.length} alerta(s)
            {data?.[0]?.condominioNome ? ` · ${data[0].condominioNome}` : ''}
          </h2>
        </header>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-text-muted">
            Nenhum alerta corresponde aos filtros selecionados.
          </div>
        ) : (
          <ul className="divide-y divide-surface-border" role="list">
            {filtered.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge variant={PRIORITY_VARIANT[alert.prioridade] ?? 'neutral'}>{alert.prioridade}</Badge>
                  <Badge variant={alert.status === 'resolvido' ? 'ok' : 'warning'}>
                    {alert.status === 'resolvido' ? 'Resolvido' : 'Aberto'}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-main">{alert.titulo}</p>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {alert.categoria} · {alert.tipo}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-text-muted" dateTime={alert.createdAt}>
                  {formatAlertDatePtBr(alert.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AlertasPage;
