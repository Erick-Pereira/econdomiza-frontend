/**
 * Rotas de auth que não devem disparar renovação de access token em `401`
 * (evita loop com `/api/auth/refresh` e credenciais inválidas no login).
 */
export function isAuthPathNoRefresh(urlPath: string): boolean {
  const p = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  return (
    p === '/api/auth/login' ||
    p === '/api/auth/register' ||
    p === '/api/auth/refresh' ||
    p.startsWith('/api/auth/login') ||
    p.startsWith('/api/auth/register') ||
    p.startsWith('/api/auth/refresh')
  );
}
