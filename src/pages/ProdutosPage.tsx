import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { PageFatalErrorState } from '../components/layout/PageLoadStates';
import { Button, Input, SkeletonLoading } from '../components/ui';
import { useProductCatalog } from '../features/produtos/hooks/useProductCatalog';
import { formatApiError } from '../lib/api-error-message';
import { cn } from '../lib/cn';

const moneyBr = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const ProdutosPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');

  const catalogQuery = useProductCatalog({ query, category, page });

  const applySearch = () => {
    setQuery(searchDraft);
    setPage(1);
  };

  if (catalogQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <SkeletonLoading size="lg" className="w-64 rounded-lg" />
        <SkeletonLoading size="md" className="w-full rounded-xl" />
      </div>
    );
  }

  if (catalogQuery.isError) {
    return (
      <PageFatalErrorState
        id="produtos-page"
        message={formatApiError(catalogQuery.error)}
        onRetry={() => void catalogQuery.refetch()}
      />
    );
  }

  const result = catalogQuery.data!;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="page w-full max-w-full min-w-0 overflow-x-hidden space-y-8" id="produtos-page">
      <PageHeader
        eyebrow="Análise"
        title="Catálogo de produtos"
        description="Consolidação analítica de itens recorrentes, fornecedores e variação de preço."
        toolbar={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={catalogQuery.isFetching}
            onClick={() => void catalogQuery.refetch()}
            icon={
              <RefreshCw className={cn('h-4 w-4', catalogQuery.isFetching && 'animate-spin')} aria-hidden />
            }
          >
            Atualizar
          </Button>
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface-card p-4 shadow-macro-sm lg:flex-row lg:items-end">
        <div className="relative min-w-0 flex-1 lg:min-w-[20rem]">
          <Search
            className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-text-muted"
            aria-hidden
          />
          <Input
            label="Buscar produto"
            id="produtos-query"
            className="pl-9"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Nome ou categoria…"
          />
        </div>
        <div className="w-full sm:w-56 lg:w-64">
          <Input
            label="Categoria"
            id="produtos-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            placeholder="Filtrar categoria"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          className="w-full sm:w-auto"
          onClick={applySearch}
          icon={<Search className="h-4 w-4" aria-hidden />}
        >
          Buscar
        </Button>
      </div>

      <p className="text-sm text-text-muted">
        {result.total} produto(s) · página {result.page} de {totalPages}
        {result.isLimited ? ' · amostra limitada' : ''}
      </p>

      <section className="rounded-xl border border-surface-border bg-surface-card shadow-macro-sm">
        {result.items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-text-muted">Nenhum item no catálogo.</p>
        ) : (
          <ul className="divide-y divide-surface-border" role="list">
            {result.items.map((item) => (
              <li key={item.productKey} className="px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-text-main">{item.displayName}</p>
                    <p className="text-sm text-text-muted">
                      {item.category} · {item.supplierCount} fornecedor(es) · {item.expenseCount} despesa(s)
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Preço médio</p>
                    <p className="font-semibold tabular-nums text-text-main">
                      {moneyBr(item.averageUnitPrice)}
                    </p>
                    <p className="text-text-muted">
                      Total gasto {moneyBr(item.totalSpent)}
                      {item.variationPercentage != null
                        ? ` · var. ${item.variationPercentage.toFixed(1)}%`
                        : ''}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            icon={<ChevronLeft className="h-4 w-4" aria-hidden />}
          >
            Anterior
          </Button>
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            icon={<ChevronRight className="h-4 w-4" aria-hidden />}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProdutosPage;
