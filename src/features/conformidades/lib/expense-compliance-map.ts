export function pickStr(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

export function pickNum(o: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k];
    if (v == null) continue;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function parseEvidenceIds(json: string | null | undefined): string[] {
  if (!json || !json.trim()) return [];
  try {
    const v = JSON.parse(json) as unknown;
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  } catch {
    /* ignore */
  }
  return [];
}

export function mapExpenseComplianceRaw(data: unknown): Record<string, unknown> | null {
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
}

export function extractFindings(raw: Record<string, unknown> | null): Record<string, unknown>[] {
  if (!raw) return [];
  const f = raw.findings ?? raw.Findings;
  if (!Array.isArray(f)) return [];
  return f.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
}

export function buildEvidenceDrafts(findings: Record<string, unknown>[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const f of findings) {
    const id = pickStr(f, 'id', 'Id');
    const ej = pickStr(f, 'evidenceDocumentIdsJson', 'EvidenceDocumentIdsJson');
    if (id) next[id] = parseEvidenceIds(ej).join(', ');
  }
  return next;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseDocumentIdList(s: string): string[] {
  return s
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
