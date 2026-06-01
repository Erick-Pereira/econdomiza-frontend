/**
 * Mensagens de erro HTTP alinhadas à matriz docs/frontend-routes-matrix.md
 */
import { isGatewayHttpError } from './gateway';

function isBareHttpStatusMessage(status: number | undefined, message: string): boolean {
  if (status == null) return false;
  const m = message.trim();
  return m === `HTTP ${status}` || m === '';
}

/**
 * Quando o gateway devolve corpo com mensagem concreta (ex.: login falhou), preferir essa mensagem
 * em vez de genéricos por código HTTP.
 */
function preferServerMessage(status: number | undefined, message: string): string | undefined {
  if (!message.trim() || isBareHttpStatusMessage(status, message)) return undefined;
  return message;
}

function formatApiErrorCore(status: number | undefined, message: string, correlationId?: string): string {
  const cid = correlationId ? ` (ref: ${correlationId})` : '';

  switch (status) {
    case 401: {
      const custom = preferServerMessage(status, message);
      if (custom) return `${custom}${cid}`;
      return `Sessão expirada ou você não está autenticado. Faça login novamente.${cid}`;
    }
    case 403: {
      const custom = preferServerMessage(status, message);
      if (custom) return `${custom}${cid}`;
      return `Você não tem permissão para esta operação no seu perfil ou condomínio.${cid}`;
    }
    case 400: {
      const custom = preferServerMessage(status, message);
      if (custom) return `${custom}${cid}`;
      return `Parâmetros inválidos na consulta. Verifique os filtros selecionados.${cid}`;
    }
    case 404:
      return `Recurso não encontrado ou indisponível neste ambiente.${cid}`;
    case 500: {
      const lower = message.toLowerCase();
      if (lower.includes('postgres') || lower.includes('database')) {
        return `Não foi possível carregar os dados desta despesa. O registro pode estar indisponível — volte à lista de compras ou tente novamente.${cid}`;
      }
      const custom = preferServerMessage(status, message);
      if (custom && !lower.includes('postgresexception')) {
        return `${custom}${cid}`;
      }
      return `Erro interno no servidor. Tente novamente em instantes.${cid}`;
    }
    case 429:
      return `Muitas solicitações. Tente novamente em alguns instantes.${cid}`;
    case 502:
    case 503:
      return `Serviço temporariamente indisponível. Tente mais tarde.${cid}`;
    default: {
      const base = message && message !== 'undefined' ? message : 'Erro na operação.';
      return `${base}${cid}`;
    }
  }
}

export function formatApiError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return 'Ocorreu um erro inesperado.';
  }
  if (isGatewayHttpError(err)) {
    return formatApiErrorCore(err.status, err.message, err.correlationId);
  }
  const e = err as Error & { status?: number; correlationId?: string };
  return formatApiErrorCore(e.status, e.message, e.correlationId);
}
