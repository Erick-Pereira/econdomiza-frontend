/**
 * Ordenação defensiva por data (API pode vir sem sort ou com campos PascalCase).
 */

export function readIsoTimestamp(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    const n = new Date(s).getTime();
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function sortByCreatedAtDesc<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      readIsoTimestamp(b as unknown as Record<string, unknown>, 'createdAt') -
      readIsoTimestamp(a as unknown as Record<string, unknown>, 'createdAt')
  );
}

export function pickCreatedAtIso(item: Record<string, unknown>): string {
  return String(
    item.createdAt ??
      item.CreatedAt ??
      item.analyzedAt ??
      item.AnalyzedAt ??
      item.occurredAt ??
      item.OccurredAt ??
      ''
  );
}
