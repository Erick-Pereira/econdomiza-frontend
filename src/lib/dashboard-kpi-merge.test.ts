import { describe, expect, it } from 'vitest';
import { enrichMonthlyKpisWithActiveAlertCount } from './dashboard-kpi-merge';
import type { DashboardKpiPayload } from './dashboard-from-monthly';

const base: DashboardKpiPayload = {
  year: 2026,
  economiaIdentificada: 0,
  gastoProcessado: 1,
  valorEmAberto: 0,
  auditoriasRealizadas: 0,
  fornecedoresCadastrados: 0,
  alertasAtivos: 0,
};

describe('enrichMonthlyKpisWithActiveAlertCount', () => {
  it('does not change when alertasAtivos already set', () => {
    const kpis = { ...base, alertasAtivos: 5 };
    const out = enrichMonthlyKpisWithActiveAlertCount(kpis, [{ id: '1' }]);
    expect(out.alertasAtivos).toBe(5);
  });

  it('counts non-resolved rows when alertasAtivos is zero', () => {
    const rows = [
      { id: '1', isResolved: false },
      { id: '2', resolved: true },
      { id: '3' },
    ];
    const out = enrichMonthlyKpisWithActiveAlertCount(base, rows);
    expect(out.alertasAtivos).toBe(2);
  });

  it('returns same object reference fields unchanged when no active', () => {
    const out = enrichMonthlyKpisWithActiveAlertCount(base, [{ isResolved: true }]);
    expect(out.alertasAtivos).toBe(0);
  });
});
