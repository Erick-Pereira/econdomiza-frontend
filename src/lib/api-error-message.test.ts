import { describe, expect, it } from 'vitest';
import { formatApiError } from './api-error-message';
import { GatewayHttpError } from './gateway';

describe('formatApiError + GatewayHttpError', () => {
  it('403 sem mensagem do servidor usa texto amigável e inclui correlation id', () => {
    const err = new GatewayHttpError('HTTP 403', {
      status: 403,
      body: {},
      correlationId: 'abc-123',
    });
    expect(formatApiError(err)).toContain('permissão');
    expect(formatApiError(err)).toContain('abc-123');
  });

  it('403 com mensagem do servidor preserva o texto', () => {
    const err = new GatewayHttpError('Acesso negado ao recurso X.', {
      status: 403,
      body: { error: 'Acesso negado ao recurso X.' },
    });
    expect(formatApiError(err)).toContain('Acesso negado');
  });

  it('mantém compat com Error duck-typed com status', () => {
    const err = new Error('Algo falhou') as Error & { status: number; correlationId?: string };
    err.status = 404;
    expect(formatApiError(err)).toContain('não encontrado');
  });

  it('401 com mensagem do servidor (login) não é substituída pelo genérico de sessão', () => {
    const err = new GatewayHttpError('Credenciais inválidas.', {
      status: 401,
      body: { success: false, error: 'Credenciais inválidas.' },
    });
    expect(formatApiError(err)).toContain('Credenciais');
    expect(formatApiError(err)).not.toContain('Sessão expirada');
  });
});
