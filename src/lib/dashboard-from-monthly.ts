/**
 * Builds the same KPI shape the SPA expects (Dashboard / Relatórios)
 * from `GET /api/dashboard/monthly` → `{ year, rows }`.
 */

export type DashboardKpiPayload = {
  year: number;
  economiaIdentificada: number;
  auditoriasRealizadas: number;
  fornecedoresCadastrados: number;
  alertasAtivos: number;
  statusGeral: {
    conformidades: string;
    documentacao: string;
    fornecedoresValidados: string;
  };
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

  const supplierScore = suppliers.size === 0 ? 0 : Math.min(100, suppliers.size * 8);
  const docScore = totalExpenseLines === 0 ? 0 : Math.min(100, 50 + totalExpenseLines);
  const confScore =
    totalAmount <= 0 ? 60 : Math.max(0, Math.min(100, Math.round(100 - (outstanding / totalAmount) * 30)));

  const economiaIdentificada = outstanding > 0 ? outstanding : totalAmount;

  return {
    year,
    economiaIdentificada,
    auditoriasRealizadas: totalExpenseLines,
    fornecedoresCadastrados: suppliers.size,
    alertasAtivos: 0,
    statusGeral: {
      conformidades: `${confScore}%`,
      documentacao: `${docScore}%`,
      fornecedoresValidados: `${supplierScore}%`,
    },
  };
}
