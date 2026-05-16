/**
 * Query string a partir de um objeto plano (valores omitidos se null/undefined/'').
 * Usado pelo cliente gateway para paths com filtros.
 */
export function buildQuery(obj: Record<string, unknown> | undefined): string {
  const q = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}
