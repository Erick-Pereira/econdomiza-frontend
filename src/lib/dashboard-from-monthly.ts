/**
 * Builds the same KPI shape the SPA expects (Dashboard / Relatórios)
 * from `GET /api/dashboard/monthly` → `{ year, rows }`.
 */

export type DashboardKpiPayload = {
  year: number;
  /** Reservado para uma metodologia futura de economia potencial; não derivar de gasto total. */
  economiaIdentificada: number;
  gastoProcessado: number;
  valorEmAberto: number;
  auditoriasRealizadas: number;
  fornecedoresCadastrados: number;
  alertasAtivos: number;
  /** Preenchido por `GET /api/dashboard/summary` quando existir; ver `docs/api-contracts.md`. */
  alertasAltaPrioridade?: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function buildDashboardKpisFromMonthlyPayload(monthlyPayload: unknown): DashboardKpiPayload {
  const root =
    monthlyPayload && typeof monthlyPayload === 'object'
      ? (monthlyPayload as Record<string, unknown>)
      : {};
  const rows = Array.isArray(root.rows) ? (root.rows as Record<string, unknown>[]) : [];
  const year = typeof root.year === 'number' ? root.year : new Date().getFullYear();

  let totalAmount = 0;
  let totalExpenseLines = 0;
  let outstanding = 0;
  const suppliers = new Set<string>();

  for (const r of rows) {
    totalAmount += num(r.totalAmount ?? r.TotalAmount);
    totalExpenseLines += num(r.expenseCount ?? r.ExpenseCount);
    outstanding += num(r.outstanding ?? r.Outstanding);
    const sid = r.supplierId ?? r.SupplierId;
    if (sid != null && String(sid) !== '00000000-0000-0000-0000-000000000000') {
      suppliers.add(String(sid));
    }
  }

  return {
    year,
    economiaIdentificada: 0,
    gastoProcessado: totalAmount,
    valorEmAberto: outstanding,
    auditoriasRealizadas: totalExpenseLines,
    fornecedoresCadastrados: suppliers.size,
    alertasAtivos: 0,
  };
}
