export interface ProductSupplierSummary {
  supplierId: string;
  supplierName: string;
  occurrenceCount: number;
  averageUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  totalSpent: number;
  lastSeen: string;
}

export interface ProductMovement {
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

export interface ProductCatalogItem {
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
  marketBenchmarkPrice: number | null;
  marketDeviationPercentage: number | null;
  lastBenchmarkAt: string | null;
  firstSeen: string;
  lastSeen: string;
  suppliers: ProductSupplierSummary[];
  recentMovements: ProductMovement[];
}

export interface ProductCatalogResult {
  items: ProductCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  sourceRows: number;
  isLimited: boolean;
}

export const emptyProductCatalogResult: ProductCatalogResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  sourceRows: 0,
  isLimited: false,
};

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
    marketBenchmarkPrice:
      raw.marketBenchmarkPrice === null || raw.MarketBenchmarkPrice === null
        ? null
        : (() => {
            const n = Number(raw.marketBenchmarkPrice ?? raw.MarketBenchmarkPrice);
            return Number.isFinite(n) ? n : null;
          })(),
    marketDeviationPercentage:
      raw.marketDeviationPercentage === null || raw.MarketDeviationPercentage === null
        ? null
        : (() => {
            const n = Number(raw.marketDeviationPercentage ?? raw.MarketDeviationPercentage);
            return Number.isFinite(n) ? n : null;
          })(),
    lastBenchmarkAt:
      raw.lastBenchmarkAt != null || raw.LastBenchmarkAt != null
        ? String(raw.lastBenchmarkAt ?? raw.LastBenchmarkAt)
        : null,
    firstSeen: String(raw.firstSeen ?? raw.FirstSeen ?? ''),
    lastSeen: String(raw.lastSeen ?? raw.LastSeen ?? ''),
    suppliers,
    recentMovements: movements,
  };
}

export function parseProductCatalogResult(data: unknown): ProductCatalogResult {
  const payload = data as Partial<ProductCatalogResult> & Record<string, unknown>;
  const rawItems = payload.items ?? payload.Items;
  const items: ProductCatalogItem[] = Array.isArray(rawItems)
    ? (rawItems as Record<string, unknown>[]).map((row) => normalizeCatalogItem(row))
    : [];
  return {
    items,
    total: Number(payload.total ?? payload.Total ?? 0),
    page: Number(payload.page ?? payload.Page ?? 1),
    pageSize: Number(payload.pageSize ?? payload.PageSize ?? 20),
    sourceRows: Number(payload.sourceRows ?? payload.SourceRows ?? 0),
    isLimited: payload.isLimited === true || payload.IsLimited === true,
  };
}
