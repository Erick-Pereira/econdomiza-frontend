/**
 * Auth Utils - Helper functions para autenticação JWT
 */

// Token expiry time em milissegundos
export const JWT_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutos

// Interface para token JWT
export interface JWTPayload {
  token: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType?: string;
}

// Armazenar token no localStorage
export function storeToken(tokenData: JWTPayload): void {
  try {
    const dataToStore = {
      token: tokenData.token,
      refreshToken: tokenData.refreshToken || '',
      expiresIn: tokenData.expiresIn,
      tokenType: tokenData.tokenType || 'Bearer'
    };

    // Criar timestamp para expiration
    const expiration = new Date().getTime() + tokenData.expiresIn;
    const payloadStr = JSON.stringify({
      ...dataToStore,
      expiration
    });

    localStorage.setItem('token_data', payloadStr);
    localStorage.setItem('token', tokenData.token);
    
    // Emitir evento de autenticação
    window.dispatchEvent(new CustomEvent('authentication', {
      detail: {
        authenticated: true,
        token: tokenData.token
      }
    }));
    
  } catch (error) {
    console.error('Erro ao armazenar token:', error);
  }
}

// Obter token do localStorage
export function getTokenFromStorage(): string | null {
  try {
    const token = localStorage.getItem('token');
    if (token && token.length > 0) {
      return token;
    }
  } catch (error) {
    console.error('Erro ao obter token:', error);
  }
  return null;
}

// Verificar se token está expirado
export function isTokenExpired(expiresIn: number): boolean {
  if (!expiresIn) return true;
  
  const expiration = new Date().getTime() + expiresIn;
  return new Date().getTime() > expiration;
}

// Verificar token antes de fazer requisição
export async function checkTokenValidity(): Promise<boolean> {
  try {
    const tokenData = getTokenFromStorage();
    
    if (!tokenData) {
      return false;
    }

    // Parsear token
    const payloadStr = localStorage.getItem('token_data');
    if (!payloadStr) {
      return false;
    }

    const payload = JSON.parse(payloadStr);
    const expiration = payload.expiration;
    
    // Token expirou
    if (expiration < new Date().getTime()) {
      // Tentar renovar com refresh token
      return await refreshToken();
    }

    return true;
    
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return false;
  }
}

// Renovar token com refresh token
export async function refreshToken(): Promise<boolean> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      // Se não temos refresh token, limpar tokens e retornar false
      localStorage.removeItem('token');
      localStorage.removeItem('token_data');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new CustomEvent('authentication', {
        detail: { authenticated: false }
      }));
      return false;
    }

    // Fazer requisição para renovar token
    const tokenResponse = await fetch('/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      }),
      credentials: 'include' // Enviar cookies se necessário
    });

    if (tokenResponse.ok) {
      const response = await tokenResponse.json();
      
      // Armazenar novo token
      storeToken({
        token: response.data.access_token,
        refreshToken: response.data.refresh_token || undefined,
        expiresIn: parseInt(response.data.expires_in) || 15 * 60 * 1000,
        tokenType: response.data.token_type || 'Bearer'
      });
      
      // Emitir evento de renovação bem-sucedida
      window.dispatchEvent(new CustomEvent('authentication', {
        detail: {
          authenticated: true,
          token: response.data.access_token
        }
      }));
      
      return true;
    } else {
      // Refresh token inválido ou expirado
      localStorage.removeItem('token');
      localStorage.removeItem('token_data');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new CustomEvent('authentication', {
        detail: { authenticated: false }
      }));
      
      return false;
    }
    
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    
    // Limpar tokens em caso de erro
    localStorage.removeItem('token');
    localStorage.removeItem('token_data');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new CustomEvent('authentication', {
      detail: { authenticated: false }
    }));
    
    return false;
  }
}

// Limpar tokens de autenticação
export function clearAuthTokens(): void {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('token_data');
    localStorage.removeItem('refreshToken');
    
    // Emitir evento de desautenticação
    window.dispatchEvent(new CustomEvent('authentication', {
      detail: { authenticated: false }
    }));
    
    // Redirecionar para login
    window.location.href = '/login';
    
  } catch (error) {
    console.error('Erro ao limpar tokens:', error);
  }
}

// Adicionar header de autenticação
export function addAuthHeader(headers: HeadersInit): HeadersInit {
  const token = getTokenFromStorage();
  if (!token) return headers;
  const base = headers instanceof Headers ? Object.fromEntries(headers.entries()) : { ...headers } as Record<string, string>;
  return { ...base, Authorization: base.Authorization ? `${base.Authorization} ${token}` : `Bearer ${token}` };
}

// Extrair token da resposta
export function extractTokenFromResponse(response: Response): string | null {
  try {
    const authHeader = response.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        return token;
      }
    }
  } catch (error) {
    console.error('Erro ao extrair token:', error);
  }
  return null;
}

// Tratamento de erro de 401
export async function handleUnauthorizedError(): Promise<boolean> {
  if (import.meta.env.DEV) {
    console.warn('Sessão expirada ou inválida; tentando renovar.');
  }
  
  // Se não temos token, retornar false
  if (!getTokenFromStorage()) {
    return false;
  }
  
  // Tentar renovar token
  const renewed = await refreshToken();
  
  if (renewed) {
    // Token renovado com sucesso, retornar true
    return true;
  }
  
  // Não conseguimos renovar, limpar tokens
  clearAuthTokens();
  
  return false;
}