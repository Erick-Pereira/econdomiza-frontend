import { describe, expect, it } from 'vitest';
import { formatDatePtBr, parseApiDateLocal } from './format-date-pt-br';

describe('formatDatePtBr', () => {
  it('interpreta YYYY-MM-DD como dia civil local (não UTC meia-noite)', () => {
    expect(formatDatePtBr('2025-05-15')).toBe('15/05/2025');
  });

  it('interpreta meia-noite Z como o mesmo dia civil', () => {
    expect(formatDatePtBr('2025-05-15T00:00:00.000Z')).toBe('15/05/2025');
    expect(formatDatePtBr('2026-05-16T00:00:00Z')).toBe('16/05/2026');
  });

  it('devolve traço para vazio', () => {
    expect(formatDatePtBr('')).toBe('—');
    expect(formatDatePtBr(null)).toBe('—');
  });
});

describe('parseApiDateLocal', () => {
  it('alinha com data civil para YYYY-MM-DD', () => {
    const d = parseApiDateLocal('2025-05-15');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(4);
    expect(d!.getDate()).toBe(15);
  });
});
