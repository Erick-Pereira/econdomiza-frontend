/**
 * Parsing e normalização de corpos JSON do gateway (envelope `ApiResponse`, mensagens, correlationId).
 * Mantém a camada HTTP desacoplada dos métodos de recurso em `econdomiza-api.ts`.
 */

export function parseJsonBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

/** Unwrap uma ou mais camadas `{ success: true, data }` do gateway. */
export function unwrapGatewayJson(json: unknown): unknown {
  let cur: unknown = json;
  for (let depth = 0; depth < 8; depth++) {
    if (
      cur &&
      typeof cur === 'object' &&
      'success' in cur &&
      'data' in cur &&
      (cur as { success?: boolean }).success === true
    ) {
      cur = (cur as { data: unknown }).data;
    } else {
      break;
    }
  }
  return cur;
}

function firstString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

/**
 * Extrai mensagem legível de corpos do gateway / identity (`ApiResponse`, ProblemDetails, etc.).
 */
export function gatewayMessage(parsed: unknown, fallback: string): string {
  if (parsed && typeof parsed === 'object' && parsed !== null) {
    const o = parsed as Record<string, unknown>;

    const fromApiResponse = firstString(o.error, o.Error, o.message, o.Message, o.title, o.Title);
    if (fromApiResponse) return fromApiResponse;

    const errs = o.errors;
    if (Array.isArray(errs) && errs[0] && typeof errs[0] === 'object' && errs[0] !== null) {
      const e0 = errs[0] as Record<string, unknown>;
      const fromArr = firstString(e0.message, e0.description);
      if (fromArr) return fromArr;
    }

    if (errs && typeof errs === 'object' && !Array.isArray(errs)) {
      const dict = errs as Record<string, unknown>;
      for (const v of Object.values(dict)) {
        if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return String(v[0]).trim();
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
    }
  }
  return fallback;
}

export function gatewayCorrelationId(parsed: unknown): string | undefined {
  if (parsed && typeof parsed === 'object' && parsed !== null && 'metadata' in parsed) {
    const m = (parsed as { metadata?: { correlationId?: string } }).metadata;
    if (m?.correlationId) return String(m.correlationId);
  }
  return undefined;
}
