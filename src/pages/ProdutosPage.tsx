import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatApiError } from '../lib/api-error-message';
import { EcondomizaApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import { TableScrollHint } from '../components/layout/TableScrollHint';

interface ProductSupplierSummary {
  supplierId: string;
  supplierName: string;
  occurrenceCount: number;
  averageUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  totalSpent: number;
  lastSeen: string;
}

interface ProductMovement {
  expenseId: string;
  expenseItemId: string;
  supplierId: string;
  supplierName: string;
  itemDescription: string;
  expenseDescription: string;
  issueDate: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ProductCatalogItem {
  productKey: string;
  displayName: string;
  normalizedName: string;
  category: string;
  occurrenceCount: number;
  expenseCount: number;
  supplierCount: number;
  totalQuantity: number;
  totalSpent: number;
  averageUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  variationPercentage: number | null;
  firstSeen: string;
  lastSeen: string;
  suppliers: ProductSupplierSummary[];
  recentMovements: ProductMovement[];
}

interface ProductCatalogResult {
  items: ProductCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  sourceRows: number;
  isLimited: boolean;
}

const emptyResult: ProductCatalogResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  sourceRows: 0,
  isLimited: false,
};

function money(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function numberPt(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n);
}

function datePt(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function pickNum(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const n = Number(obj[k]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeMovement(raw: Record<string, unknown>): ProductMovement {
  const itemDescription = pickStr(raw, 'itemDescription', 'ItemDescription');
  const expenseDescription = pickStr(raw, 'expenseDescription', 'ExpenseDescription');
  return {
    expenseId: String(raw.expenseId ?? raw.ExpenseId ?? ''),
    expenseItemId: String(raw.expenseItemId ?? raw.ExpenseItemId ?? ''),
    supplierId: String(raw.supplierId ?? raw.SupplierId ?? ''),
    supplierName: pickStr(raw, 'supplierName', 'SupplierName') || 'Fornecedor não identificado',
    itemDescription: itemDescription || 'Linha sem descrição',
    expenseDescription,
    issueDate: String(raw.issueDate ?? raw.IssueDate ?? ''),
    quantity: pickNum(raw, 'quantity', 'Quantity'),
    unitPrice: pickNum(raw, 'unitPrice', 'UnitPrice'),
    totalPrice: pickNum(raw, 'totalPrice', 'TotalPrice'),
  };
}

function normalizeCatalogItem(raw: Record<string, unknown>): ProductCatalogItem {
  const movementsRaw = raw.recentMovements ?? raw.RecentMovements;
  const movements: ProductMovement[] = Array.isArray(movementsRaw)
    ? (movementsRaw as Record<string, unknown>[]).map((m) => normalizeMovement(m))
    : [];

  const suppliersRaw = raw.suppliers ?? raw.Suppliers;
  const suppliers: ProductSupplierSummary[] = Array.isArray(suppliersRaw)
    ? (suppliersRaw as Record<string, unknown>[]).map((s) => ({
        supplierId: String(s.supplierId ?? s.SupplierId ?? ''),
        supplierName: pickStr(s, 'supplierName', 'SupplierName') || '—',
        occurrenceCount: pickNum(s, 'occurrenceCount', 'OccurrenceCount'),
        averageUnitPrice: pickNum(s, 'averageUnitPrice', 'AverageUnitPrice'),
        minUnitPrice: pickNum(s, 'minUnitPrice', 'MinUnitPrice'),
        maxUnitPrice: pickNum(s, 'maxUnitPrice', 'MaxUnitPrice'),
        totalSpent: pickNum(s, 'totalSpent', 'TotalSpent'),
        lastSeen: String(s.lastSeen ?? s.LastSeen ?? ''),
      }))
    : [];

  return {
    productKey: String(raw.productKey ?? raw.ProductKey ?? ''),
    displayName: String(raw.displayName ?? raw.DisplayName ?? ''),
    normalizedName: String(raw.normalizedName ?? raw.NormalizedName ?? ''),
    category: String(raw.category ?? raw.Category ?? ''),
    occurrenceCount: pickNum(raw, 'occurrenceCount', 'OccurrenceCount'),
    expenseCount: pickNum(raw, 'expenseCount', 'ExpenseCount'),
    supplierCount: pickNum(raw, 'supplierCount', 'SupplierCount'),
    totalQuantity: pickNum(raw, 'totalQuantity', 'TotalQuantity'),
    totalSpent: pickNum(raw, 'totalSpent', 'TotalSpent'),
    averageUnitPrice: pickNum(raw, 'averageUnitPrice', 'AverageUnitPrice'),
    minUnitPrice: pickNum(raw, 'minUnitPrice', 'MinUnitPrice'),
    maxUnitPrice: pickNum(raw, 'maxUnitPrice', 'MaxUnitPrice'),
    variationPercentage:
      raw.variationPercentage === null || raw.VariationPercentage === null
        ? null
        : (() => {
            const n = Number(raw.variationPercentage ?? raw.VariationPercentage);
            return Number.isFinite(n) ? n : null;
          })(),
    firstSeen: String(raw.firstSeen ?? raw.FirstSeen ?? ''),
    lastSeen: String(raw.lastSeen ?? raw.LastSeen ?? ''),
    suppliers,
    recentMovements: movements,
  };
}

const ProdutosPage: React.FC = () => {
  const [draftQuery, setDraftQuery] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [filters, setFilters] = useState({ query: '', category: '' });
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState<ProductCatalogResult>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await EcondomizaApi.listProductCatalog({
        query: filters.query.trim() || undefined,
        category: filters.category.trim() || undefined,
        page,
        pageSize: 20,
      });
      const data = res.data as Partial<ProductCatalogResult> & Record<string, unknown>;
      const rawItems = data.items ?? data.Items;
      const items: ProductCatalogItem[] = Array.isArray(rawItems)
        ? (rawItems as Record<string, unknown>[]).map((row) => normalizeCatalogItem(row))
        : [];
      setCatalog({
        items,
        total: Number(data.total ?? data.Total ?? 0),
        page: Number(data.page ?? data.Page ?? 1),
        pageSize: Number(data.pageSize ?? data.PageSize ?? 20),
        sourceRows: Number(data.sourceRows ?? data.SourceRows ?? 0),
        isLimited: data.isLimited === true || data.IsLimited === true,
      });
      setError(null);
    } catch (err) {
      setCatalog(emptyResult);
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.query, page]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const topVariation = useMemo(() => {
    return catalog.items
      .filter((item) => item.variationPercentage != null)
      .sort((a, b) => Number(b.variationPercentage) - Number(a.variationPercentage))[0];
  }, [catalog.items]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setFilters({ query: draftQuery, category: draftCategory });
  };

  const totalPages = Math.max(1, Math.ceil(catalog.total / Math.max(1, catalog.pageSize)));

  return (
    <div className="page" id="produtos-page">
      <PageHeader
        title="Produtos"
        description="Catálogo consolidado a partir do que já consta nas notas: preços por fornecedor, histórico e variação — sem catálogo comercial separado."
        quickLinks={[
          { to: '/compras', label: 'Compras' },
          { to: '/fornecedores', label: 'Fornecedores' },
        ]}
      />

      {loading && catalog.items.length === 0 && !error && (
        <div className="banner banner--info" style={{ marginBottom: 'var(--spacing-xl)' }}>
          Carregando o catálogo…
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Filtros</h2>
        </div>
        <form onSubmit={handleSubmit} className="settings-form form-max-width-md">
          <div className="form-group">
            <label className="field-label" htmlFor="product-search">
              Produto ou descrição da nota
            </label>
            <input
              id="product-search"
              className="form-input"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Ex.: água sanitária, manutenção, limpeza"
            />
          </div>
          <div className="form-group">
            <label className="field-label" htmlFor="product-category">
              Categoria
            </label>
            <input
              id="product-category"
              className="form-input"
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
              placeholder="Ex.: Limpeza Predial"
            />
          </div>
          <div className="row-flex">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Carregando…' : 'Aplicar filtros'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => void loadCatalog()} disabled={loading}>
              Atualizar
            </button>
          </div>
        </form>
      </div>

      {error && <div className="banner banner--error mt-section">{error}</div>}

      {!error && (
        <div className="metrics-grid mt-section">
          <div className="metric-card">
            <div className="metric-header">
              <h3>Produtos consolidados</h3>
            </div>
            <div className="metric-value">{catalog.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <h3>Linhas nas notas</h3>
            </div>
            <div className="metric-value">{catalog.sourceRows}</div>
          </div>
          <div className="metric-card">
            <div className="metric-header">
              <h3>Maior variação</h3>
            </div>
            <div className="metric-value">
              {topVariation?.variationPercentage != null ? `${numberPt(topVariation.variationPercentage)}%` : '—'}
            </div>
          </div>
        </div>
      )}

      {catalog.isLimited && (
        <div className="card mt-section">
          <p>
            Para manter a resposta rápida, mostramos primeiro as linhas mais recentes. Estreite a pesquisa por texto ou
            categoria para ir direto ao que precisa.
          </p>
        </div>
      )}

      {!loading && !error && catalog.items.length === 0 && (
        <div className="card mt-section">
          <p>Nenhum item encontrado com os filtros atuais.</p>
        </div>
      )}

      {catalog.items.length > 0 && (
        <div className="card mt-section">
          <div className="card-header">
            <h2>Resultados</h2>
          </div>
          <TableScrollHint />
          <div className="row-flex" style={{ marginBottom: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || catalog.page <= 1}
            >
              Anterior
            </button>
            <span>
              Página {catalog.page} de {totalPages}
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={loading || catalog.page >= totalPages}
            >
              Próxima
            </button>
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            {catalog.items.map((item) => (
              <article key={item.productKey} className="product-catalog-card">
                <div className="card-header" style={{ padding: 0, border: 'none', marginBottom: 0 }}>
                  <div>
                    <h3>{item.displayName}</h3>
                    <p className="product-catalog-meta">Categoria: {item.category || '—'}</p>
                  </div>
                </div>

                <div className="metrics-grid" style={{ marginTop: 'var(--spacing-md)' }}>
                  <div className="metric-card">
                    <div className="metric-header">
                      <h3>Preço médio</h3>
                    </div>
                    <div className="metric-value">{money(item.averageUnitPrice)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-header">
                      <h3>Mín / Máx</h3>
                    </div>
                    <div className="metric-value">
                      {money(item.minUnitPrice)} / {money(item.maxUnitPrice)}
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-header">
                      <h3>Variação</h3>
                    </div>
                    <div className="metric-value">
                      {item.variationPercentage != null ? `${numberPt(item.variationPercentage)}%` : '—'}
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-header">
                      <h3>Fornecedores</h3>
                    </div>
                    <div className="metric-value">{item.supplierCount}</div>
                  </div>
                </div>

                <p className="product-summary-line">
                  {item.occurrenceCount} ocorrência(s) em {item.expenseCount} nota(s), totalizando{' '}
                  {numberPt(item.totalQuantity)} unidade(s) e {money(item.totalSpent)} entre {datePt(item.firstSeen)} e{' '}
                  {datePt(item.lastSeen)}.
                </p>

                <div className="purchases-table table-scroll" style={{ marginTop: 'var(--spacing-md)' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Fornecedor</th>
                        <th>Ocorrências</th>
                        <th>Preço médio</th>
                        <th>Mín / Máx</th>
                        <th>Total</th>
                        <th>Última compra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.suppliers.map((supplier) => (
                        <tr key={supplier.supplierId}>
                          <td>{supplier.supplierName}</td>
                          <td>{supplier.occurrenceCount}</td>
                          <td>{money(supplier.averageUnitPrice)}</td>
                          <td>
                            {money(supplier.minUnitPrice)} / {money(supplier.maxUnitPrice)}
                          </td>
                          <td>{money(supplier.totalSpent)}</td>
                          <td>{datePt(supplier.lastSeen)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="form-help" style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-sm)' }}>
                  Últimas ocorrências (amostra das notas onde este produto aparece).
                </p>
                <div className="purchases-table table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Fornecedor</th>
                        <th>Despesa / nota</th>
                        <th>Linha na nota</th>
                        <th>Qtd.</th>
                        <th>Unitário</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.recentMovements.map((movement) => (
                        <tr key={movement.expenseItemId || movement.expenseId}>
                          <td>{datePt(movement.issueDate)}</td>
                          <td>{movement.supplierName}</td>
                          <td>{movement.expenseDescription.trim() || '—'}</td>
                          <td>{movement.itemDescription}</td>
                          <td>{numberPt(movement.quantity)}</td>
                          <td>{money(movement.unitPrice)}</td>
                          <td>{money(movement.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <details className="product-trace">
                  <summary>Dados técnicos e identificadores (suporte)</summary>
                  <p className="form-help" style={{ margin: '0 0 var(--spacing-sm)' }}>
                    Chave interna de consolidação: <code>{item.normalizedName}</code>
                  </p>
                  <p className="form-help" style={{ margin: '0 0 var(--spacing-md)' }}>
                    Os identificadores abaixo existem para rastreio no sistema; não são o resumo operacional da compra.
                  </p>
                  <div className="purchases-table table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>ID despesa</th>
                          <th>ID linha</th>
                          <th>ID fornecedor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.recentMovements.map((movement) => (
                          <tr key={`id-${movement.expenseItemId || movement.expenseId}`}>
                            <td>
                              <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{movement.expenseId || '—'}</code>
                            </td>
                            <td>
                              <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{movement.expenseItemId || '—'}</code>
                            </td>
                            <td>
                              <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{movement.supplierId || '—'}</code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdutosPage;
