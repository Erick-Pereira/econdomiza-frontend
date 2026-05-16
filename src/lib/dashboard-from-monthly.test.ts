import { describe, it, expect } from 'vitest';
import { buildDashboardKpisFromMonthlyPayload } from './dashboard-from-monthly';

describe('buildDashboardKpisFromMonthlyPayload', () => {
  it('agrega linhas mensais e devolve shape de KPI', () => {
    const out = buildDashboardKpisFromMonthlyPayload({
      year: 2025,
      rows: [
        {
          totalAmount: 1000,
          expenseCount: 3,
          outstanding: 200,
          supplierId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        {
          totalAmount: 500,
          expenseCount: 1,
          outstanding: 0,
          supplierId: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
      ],
    });
    expect(out.year).toBe(2025);
    expect(out.fornecedoresCadastrados).toBe(2);
    expect(out.auditoriasRealizadas).toBe(4);
    expect(out.gastoProcessado).toBe(1500);
    expect(out.valorEmAberto).toBe(200);
    expect(out.economiaIdentificada).toBe(0);
  });

  it('payload inválido → zeros estáveis', () => {
    const out = buildDashboardKpisFromMonthlyPayload(null);
    expect(out.auditoriasRealizadas).toBe(0);
    expect(out.fornecedoresCadastrados).toBe(0);
  });
});
