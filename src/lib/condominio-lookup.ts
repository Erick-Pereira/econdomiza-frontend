import { normalizeListPayload } from './api-normalize';

export interface CondoRow {
  id: string;
  nome: string;
  cnpj: string;
  label: string;
}

export function formatCondoRow(c: Record<string, unknown>): CondoRow {
  const nome = String(c.nome ?? c.Nome ?? c.name ?? '');
  const cnpj = String(c.cnpj ?? c.Cnpj ?? '');
  const id = String(c.id ?? c.Id ?? '');
  return { id, nome, cnpj, label: nome ? `${nome} — ${cnpj || '—'}` : cnpj || id };
}

function digitsOnly(s: string): string {
  return String(s || '').replace(/\D/g, '');
}

/** Filtro local por nome, CNPJ (dígitos) ou subcadeia do GUID. */
export function filterCondoList(items: CondoRow[], q: string): CondoRow[] {
  const term = (q || '').trim().toLowerCase();
  const digitTerm = digitsOnly(q);
  const guidTerm = term.replace(/[^0-9a-f-]/g, '');
  if (!term && !digitTerm) return items.slice();
  return items.filter((row) => {
    const nome = (row.nome || '').toLowerCase();
    const cnpjDigits = digitsOnly(row.cnpj);
    if (term && nome.includes(term)) return true;
    if (digitTerm && cnpjDigits.includes(digitTerm)) return true;
    if (term && (row.cnpj || '').toLowerCase().includes(term)) return true;
    if (guidTerm.length >= 8 && row.id.toLowerCase().includes(guidTerm)) return true;
    return false;
  });
}

export function parseLookupData(data: unknown): CondoRow[] {
  const raw = normalizeListPayload(data);
  return raw
    .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
    .map((x) => formatCondoRow(x))
    .filter((r) => r.id.length > 0);
}
