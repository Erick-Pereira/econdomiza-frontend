/**
 * Aggregates `GET /api/dashboard/monthly` rows into monthly totals for Chart.js.
 */

export type MonthlyChartPoint = {
  month: number;
  label: string;
  totalAmount: number;
  outstanding: number;
};

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function buildMonthlyChartSeries(monthlyPayload: unknown): MonthlyChartPoint[] {
  const root =
    monthlyPayload && typeof monthlyPayload === 'object' ? (monthlyPayload as Record<string, unknown>) : {};
  const rows = Array.isArray(root.rows) ? (root.rows as Record<string, unknown>[]) : [];

  const byMonth = new Map<number, { totalAmount: number; outstanding: number }>();

  for (const r of rows) {
    const month = num(r.month ?? r.Month);
    if (month < 1 || month > 12) continue;
    const bucket = byMonth.get(month) ?? { totalAmount: 0, outstanding: 0 };
    bucket.totalAmount += num(r.totalAmount ?? r.TotalAmount);
    bucket.outstanding += num(r.outstanding ?? r.Outstanding);
    byMonth.set(month, bucket);
  }

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const bucket = byMonth.get(month) ?? { totalAmount: 0, outstanding: 0 };
    return {
      month,
      label: MONTH_LABELS[i] ?? String(month),
      totalAmount: bucket.totalAmount,
      outstanding: bucket.outstanding,
    };
  });
}
