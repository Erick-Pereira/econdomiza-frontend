/**
 * Normaliza respostas de listagem do gateway: array direto, `{ items }`, `{ data: [...] }`
 * ou `{ data: { items: [...] } }` (envelopes parciais após unwrap).
 */

export function normalizeListPayload(data: unknown): unknown[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items;
    const inner = o.data;
    if (Array.isArray(inner)) return inner;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const mid = inner as Record<string, unknown>;
      if (Array.isArray(mid.items)) return mid.items;
    }
  }
  return [];
}
