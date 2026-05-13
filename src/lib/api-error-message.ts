/**
 * Mensagens de erro HTTP alinhadas à matriz docs/frontend-routes-matrix.md
 */
export function formatApiError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return 'Ocorreu um erro inesperado.';
  }
  const e = err as Error & { status?: number; correlationId?: string };
  const cid = e.correlationId ? ` (ref: ${e.correlationId})` : '';

  switch (e.status) {
    case 401:
      return `Sessão expirada ou não autenticado. Inicie sessão novamente.${cid}`;
    case 403:
      return `Não tem permissão para esta operação no seu perfil ou condomínio.${cid}`;
    case 404:
      return `Recurso não encontrado ou indisponível neste ambiente.${cid}`;
    case 429:
      return `Demasiados pedidos. Tente novamente dentro de momentos.${cid}`;
    case 502:
    case 503:
      return `Serviço temporariamente indisponível. Tente mais tarde.${cid}`;
    default: {
      const base = e.message && e.message !== 'undefined' ? e.message : 'Erro na operação.';
      return `${base}${cid}`;
    }
  }
}
