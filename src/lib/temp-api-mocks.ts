/**
 * TEMP_AUTH_DISABLED: Mocks de API para desenvolvimento sem backend
 *
 * Este arquivo contém mocks simples para endpoints críticos que quebram
 * sem o backend rodando. Remove a necessidade de rodar o gateway.
 *
 * Para ativar: localStorage.setItem('TEMP_AUTH_DISABLED_MODE', 'true')
 * Para desativar: localStorage.removeItem('TEMP_AUTH_DISABLED_MODE')
 */

export const TEMP_AUTH_DISABLED = typeof window !== 'undefined' && localStorage.getItem('TEMP_AUTH_DISABLED_MODE') === 'true';

/**
 * Mock resposta de perfil do usuário
 */
export function mockProfileResponse() {
  return {
    data: {
      id: 'temp-dev-user-123',
      email: 'dev@localhost.test',
      name: 'Dev User (Mock)',
      role: 'ADMIN',
      tenantId: '00000000-0000-0000-0000-000000000000',
      createdAt: new Date().toISOString(),
      picture: null,
    },
  };
}

/**
 * Mock resposta de token
 */
export function mockTokenResponse() {
  return {
    data: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZW1wLWRldi11c2VyLTEyMyIsImV4cCI6OTk5OTk5OTk5OX0.temp_fake_token_for_development_only',
      refreshToken: 'temp_refresh_token_dev_only',
      expiresIn: 8 * 60 * 60,
    },
  };
}

/**
 * Mock resposta de dashboard summary
 */
export function mockDashboardSummary() {
  return {
    data: {
      period: 'current_month',
      totalExpense: 15000.0,
      totalIncome: 20000.0,
      categories: [
        { name: 'Manutenção', value: 5000, percentage: 33.3 },
        { name: 'Segurança', value: 4000, percentage: 26.6 },
        { name: 'Limpeza', value: 3500, percentage: 23.3 },
        { name: 'Administração', value: 2500, percentage: 16.6 },
      ],
    },
  };
}

/**
 * Mock resposta genérica de lista
 */
export function mockListResponse(items: any[] = []) {
  return { data: { items, total: items.length } };
}

/**
 * Wrapper para fetch com suporte a mocks
 */
export async function fetchWithMocks(url: string, options?: RequestInit): Promise<Response> {
  if (!TEMP_AUTH_DISABLED) {
    return fetch(url, options);
  }

  console.warn(`[TEMP_AUTH_DISABLED] Interceptando fetch: ${url}`);

  // Mock alguns endpoints críticos
  if (url.includes('/me') || url.includes('/profile')) {
    return new Response(JSON.stringify(mockProfileResponse()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/login')) {
    return new Response(JSON.stringify(mockTokenResponse()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/dashboard') && url.includes('summary')) {
    return new Response(JSON.stringify(mockDashboardSummary()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Se não encontrar um mock, retornar sucesso vazio
  console.warn(`[TEMP_AUTH_DISABLED] Nenhum mock para ${url} - retornando vazio`);
  return new Response(JSON.stringify({ data: {} }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
