/** Formata dígitos como moeda BRL enquanto o usuário digita (ex.: 1234 → 12,34). */
export function formatBrlInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const cents = Number(digits);
  if (!Number.isFinite(cents)) return '';
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte string formatada pt-BR para número decimal. */
export function parseBrlInput(formatted: string): number {
  const trimmed = formatted.trim();
  if (!trimmed) return NaN;
  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  return Number(normalized);
}
