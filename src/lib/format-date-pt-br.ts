/**
 * Datas vindas da API (só dia ou meia-noite UTC) em pt-BR sem “-1 dia”:
 * `new Date("2025-05-15")` é UTC 00:00 → em fusos como America/Sao_Paulo vira o dia anterior ao formatar.
 */

const RE_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_UTC_MIDNIGHT_Z = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(\.\d+)?Z$/;

function localCalendarDate(y: number, monthIndex: number, day: number): Date {
  return new Date(y, monthIndex, day);
}

/** Para comparações de prazo; mesmo critério que {@link formatDatePtBr} (calendário local). */
export function parseApiDateLocal(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const t = iso.trim();
  let m = RE_DATE_ONLY.exec(t);
  if (m) {
    const y = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return null;
    return localCalendarDate(y, monthIndex, day);
  }
  m = RE_UTC_MIDNIGHT_Z.exec(t);
  if (m) {
    const y = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return null;
    return localCalendarDate(y, monthIndex, day);
  }
  const parsed = new Date(t);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Só data (calendário); `empty` quando string vazia ou inválida. */
export function formatDatePtBr(iso: string | null | undefined, empty = '—'): string {
  if (!iso?.trim()) return empty;
  const t = iso.trim();
  let m = RE_DATE_ONLY.exec(t);
  if (m) {
    const y = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return empty;
    try {
      return localCalendarDate(y, monthIndex, day).toLocaleDateString('pt-BR');
    } catch {
      return empty;
    }
  }
  m = RE_UTC_MIDNIGHT_Z.exec(t);
  if (m) {
    const y = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return empty;
    try {
      return localCalendarDate(y, monthIndex, day).toLocaleDateString('pt-BR');
    } catch {
      return empty;
    }
  }
  const parsed = new Date(t);
  if (Number.isNaN(parsed.getTime())) return empty;
  try {
    return parsed.toLocaleDateString('pt-BR');
  } catch {
    return empty;
  }
}

/** Data e hora em pt-BR; meia-noite Z trata-se como dia civil local (como formatDatePtBr + hora local 00:00). */
export function formatDateTimePtBr(iso: string | null | undefined, empty = '—'): string {
  if (!iso?.trim()) return empty;
  const t = iso.trim();
  const m = RE_UTC_MIDNIGHT_Z.exec(t);
  if (m) {
    const y = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return empty;
    try {
      return localCalendarDate(y, monthIndex, day).toLocaleString('pt-BR');
    } catch {
      return empty;
    }
  }
  const parsed = new Date(t);
  if (Number.isNaN(parsed.getTime())) return empty;
  try {
    return parsed.toLocaleString('pt-BR');
  } catch {
    return empty;
  }
}
