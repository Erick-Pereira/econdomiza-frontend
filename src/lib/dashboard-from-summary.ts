import type { DashboardKpiPayload } from './dashboard-from-monthly';

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Mapeia `GET /api/dashboard/summary` (já unwrapped pelo cliente) para o mesmo
 * formato usado pelo derivado mensal — ver `docs/api-contracts.md`.
 */
export function mapSummaryPayloadToDashboardKpis(
  payload: unknown,
  yearFallback: number
): DashboardKpiPayload {
  const root =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

  const yearFromPayload =
    typeof root.year === 'number'
      ? root.year
      : typeof root.Year === 'number'
        ? (root.Year as number)
        : yearFallback;

  const rawHigh = root.alertasAltaPrioridade ?? root.AlertasAltaPrioridade;
  const alertasAltaPrioridade = rawHigh != null && String(rawHigh) !== '' ? num(rawHigh, NaN) : undefined;
  const out: DashboardKpiPayload = {
    year: yearFromPayload,
    economiaIdentificada: num(root.economiaIdentificada ?? root.EconomiaIdentificada, 0),
    gastoProcessado: num(root.gastoProcessado ?? root.GastoProcessado, 0),
    valorEmAberto: num(root.valorEmAberto ?? root.ValorEmAberto, 0),
    auditoriasRealizadas: num(root.auditoriasRealizadas ?? root.AuditoriasRealizadas, 0),
    fornecedoresCadastrados: num(root.fornecedoresCadastrados ?? root.FornecedoresCadastrados, 0),
    alertasAtivos: num(root.alertasAtivos ?? root.AlertasAtivos, 0),
  };
  if (Number.isFinite(alertasAltaPrioridade)) {
    out.alertasAltaPrioridade = alertasAltaPrioridade;
  }
  return out;
}
