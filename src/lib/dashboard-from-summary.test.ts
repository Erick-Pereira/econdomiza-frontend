import { describe, expect, it } from 'vitest';
import { mapSummaryPayloadToDashboardKpis } from './dashboard-from-summary';

describe('mapSummaryPayloadToDashboardKpis', () => {
  it('maps camelCase summary fields including alertasAltaPrioridade', () => {
    const out = mapSummaryPayloadToDashboardKpis(
      {
        economiaIdentificada: 0,
        gastoProcessado: 100,
        valorEmAberto: 10,
        alertasAtivos: 3,
        alertasAltaPrioridade: 2,
        auditoriasRealizadas: 7,
        fornecedoresCadastrados: 2,
      },
      2026
    );
    expect(out).toEqual({
      year: 2026,
      economiaIdentificada: 0,
      gastoProcessado: 100,
      valorEmAberto: 10,
      auditoriasRealizadas: 7,
      fornecedoresCadastrados: 2,
      alertasAtivos: 3,
      alertasAltaPrioridade: 2,
    });
  });

  it('omits alertasAltaPrioridade when absent', () => {
    const out = mapSummaryPayloadToDashboardKpis(
      {
        GastoProcessado: 50,
        ValorEmAberto: 5,
        AlertasAtivos: 1,
        AuditoriasRealizadas: 4,
        FornecedoresCadastrados: 9,
      },
      2025
    );
    expect(out.year).toBe(2025);
    expect(out.gastoProcessado).toBe(50);
    expect(out.alertasAtivos).toBe(1);
    expect(out.alertasAltaPrioridade).toBeUndefined();
  });

  it('handles null payload', () => {
    const out = mapSummaryPayloadToDashboardKpis(null, 2024);
    expect(out.alertasAtivos).toBe(0);
    expect(out.year).toBe(2024);
  });
});
