const DEFAULT_COUNTRY_CODE = '55';
const BR_NATIONAL_MAX = 11;

/** Agrupa dígitos em blocos de `size`. */
function chunkDigits(digits: string, size: number): string {
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += size) {
    parts.push(digits.slice(i, i + size));
  }
  return parts.join(' ').trim();
}

/** Formato BR: +55 (DD) 9XXXX-XXXX ou +55 (DD) XXXX-XXXX */
function formatBrazilNational(countryCode: string, national: string): string {
  const n = national.slice(0, BR_NATIONAL_MAX);
  if (!n) return `+${countryCode}`;

  const ddd = n.slice(0, 2);
  if (n.length <= 2) {
    return `+${countryCode} (${ddd}`;
  }

  const rest = n.slice(2);
  if (rest.length === 0) {
    return `+${countryCode} (${ddd})`;
  }

  if (rest[0] === '9') {
    const block = rest.slice(0, 5);
    const tail = rest.slice(5, 9);
    if (rest.length <= 5) {
      return `+${countryCode} (${ddd}) ${block}`;
    }
    return `+${countryCode} (${ddd}) ${block}-${tail}`;
  }

  const block = rest.slice(0, 4);
  const tail = rest.slice(4, 8);
  if (rest.length <= 4) {
    return `+${countryCode} (${ddd}) ${block}`;
  }
  return `+${countryCode} (${ddd}) ${block}-${tail}`;
}

/** Formato genérico internacional — não impõe código de país. */
function formatGenericInternational(digits: string): string {
  if (!digits) return '+';

  if (digits.startsWith('55')) {
    return formatBrazilNational('55', digits.slice(2));
  }

  if (digits.startsWith('351')) {
    const national = digits.slice(3, 12);
    const body = chunkDigits(national, 3);
    return body ? `+351 ${body}` : '+351';
  }

  if (digits.startsWith('1')) {
    const national = digits.slice(1);
    const body = chunkDigits(national, 3);
    return body ? `+1 ${body}` : '+1';
  }

  if (digits.length <= 3) {
    return `+${digits}`;
  }

  const cc = digits.slice(0, 2);
  const rest = digits.slice(2);
  const body = chunkDigits(rest, 3);
  return body ? `+${cc} ${body}` : `+${cc}`;
}

/**
 * Formata telefone enquanto o utilizador digita.
 * Sem `+` no início assume Brasil (+55). Com `+`, respeita o código escolhido.
 */
export function formatPhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed === '+') return '+';

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed.startsWith('+') ? '+' : '';

  if (trimmed.startsWith('+')) {
    return formatGenericInternational(digits);
  }

  return formatBrazilNational(DEFAULT_COUNTRY_CODE, digits);
}

/** @deprecated Use formatPhoneInput */
export const formatPhonePtInput = formatPhoneInput;

/** Normaliza para envio à API (E.164 simplificado). */
export function normalizePhoneForApi(display: string): string {
  const digits = display.replace(/\D/g, '');
  if (!digits) return '';

  if (display.trim().startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  if (digits.startsWith('55')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

/** Formata valor vindo da API para exibição no input. */
export function formatPhoneFromApi(stored: string | null | undefined): string {
  const t = String(stored ?? '').trim();
  if (!t) return '';

  const normalized = t.startsWith('+') ? t : `+${t.replace(/\D/g, '')}`;
  const digits = normalized.replace(/\D/g, '');

  if (digits.startsWith('55')) {
    return formatBrazilNational('55', digits.slice(2));
  }

  return formatGenericInternational(digits);
}
