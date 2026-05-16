/**
 * Erro HTTP do gateway com metadados estáveis para UI e observabilidade futura.
 * Lançado por `EcondomizaApi` em respostas não OK; substitui `Error` ad hoc com `status` opcional.
 */
export class GatewayHttpError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly correlationId?: string;

  constructor(
    message: string,
    init: {
      status: number;
      body?: unknown;
      correlationId?: string;
    }
  ) {
    super(message);
    this.name = 'GatewayHttpError';
    this.status = init.status;
    this.body = init.body;
    this.correlationId = init.correlationId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isGatewayHttpError(e: unknown): e is GatewayHttpError {
  return e instanceof GatewayHttpError;
}
