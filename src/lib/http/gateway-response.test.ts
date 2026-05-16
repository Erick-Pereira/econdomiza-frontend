import { describe, expect, it } from 'vitest';
import { gatewayMessage } from './gateway-response';

describe('gatewayMessage', () => {
  it('lê campo error do ApiResponse (identity / shared)', () => {
    const msg = gatewayMessage(
      { success: false, error: "Role 'X' não é válido. Valores permitidos: Admin, Sindico, Conselho" },
      'HTTP 400'
    );
    expect(msg).toContain('Valores permitidos');
  });

  it('prioriza error sobre message quando ambos existem', () => {
    expect(
      gatewayMessage({ success: false, error: 'Erro A', message: 'Erro B' }, 'fallback')
    ).toBe('Erro A');
  });

  it('lê message quando não há error', () => {
    expect(gatewayMessage({ success: false, message: 'Falhou' }, 'x')).toBe('Falhou');
  });

  it('lê primeiro valor de errors em formato ASP.NET model state', () => {
    expect(
      gatewayMessage({ errors: { Role: ['Campo inválido'] } }, 'fallback')
    ).toBe('Campo inválido');
  });
});
