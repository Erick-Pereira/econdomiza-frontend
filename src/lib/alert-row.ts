/**
 * Normalização partilhada de linhas de alerta (API → UI).
 * Contrato alinhado a `docs/api-contracts.md` (campos camelCase / variantes).
 */

export function isAlertRowResolved(row: Record<string, unknown>): boolean {
  return row.resolved === true || row.isResolved === true || row.IsResolved === true;
}

/** Severidade em maiúsculas para comparação. */
export function severityUpperFromAlertRow(row: Record<string, unknown>): string {
  return String(row.severity ?? row.prioridade ?? row.Severity ?? 'WARNING').toUpperCase();
}

/** Mesma escala usada no cartão do dashboard (CRITICAL → alta). */
export function mapSeverityToDashboardLevel(sev: string): 'high' | 'medium' | 'low' {
  const s = sev.toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') return 'high';
  if (s === 'WARNING' || s === 'MEDIUM') return 'medium';
  return 'low';
}

/** Rótulo de prioridade em PT (lista de alertas). */
export function prioridadeLabelFromSeverity(sev: string): 'alta' | 'media' | 'baixa' {
  const level = mapSeverityToDashboardLevel(sev);
  if (level === 'high') return 'alta';
  if (level === 'medium') return 'media';
  return 'baixa';
}

/** Data de criação/atualização em pt-BR; evita "Invalid Date" em ISO inválido. */
export function formatAlertDateTimePtBr(iso: string): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

export function formatAlertDatePtBr(iso: string): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}
