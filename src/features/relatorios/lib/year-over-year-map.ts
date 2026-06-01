export type YearOverYearItem = {
  year: number;
  month: number;
  totalAmount: number;
};

function numberField(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function extractYearOverYearRows(data: unknown): YearOverYearItem[] {
  if (Array.isArray(data)) {
    return data
      .filter((x) => x != null && typeof x === 'object')
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          year: numberField(r, 'year', 'Year'),
          month: numberField(r, 'month', 'Month'),
          totalAmount: numberField(r, 'totalAmount', 'TotalAmount'),
        };
      })
      .filter((row) => row.year > 0 && row.month > 0);
  }

  if (typeof data === 'object' && data !== null) {
    const o = data as Record<string, unknown>;
    const nestedArr = Object.entries(o).find(
      ([, v]) =>
        Array.isArray(v) &&
        v.length > 0 &&
        typeof (v as unknown[])[0] === 'object' &&
        (v as unknown[])[0] !== null
    );
    if (nestedArr) {
      return extractYearOverYearRows(nestedArr[1]);
    }
  }

  return [];
}

export function formatYoyCell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number' && Number.isFinite(v)) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
  }
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return 'dados agrupados';
  return String(v);
}
