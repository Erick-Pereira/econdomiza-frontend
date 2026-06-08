import { describe, expect, it } from 'vitest';
import { formatPhoneFromApi, formatPhoneInput, normalizePhoneForApi } from './phone-format';

describe('formatPhoneInput', () => {
  it('formats national BR digits with default +55', () => {
    expect(formatPhoneInput('11912345678')).toBe('+55 (11) 91234-5678');
  });

  it('formats progressive BR typing', () => {
    expect(formatPhoneInput('11')).toBe('+55 (11');
    expect(formatPhoneInput('1191234')).toBe('+55 (11) 91234');
  });

  it('respects explicit +55', () => {
    expect(formatPhoneInput('+55 11 91234-5678')).toBe('+55 (11) 91234-5678');
  });

  it('does not force +351 when user types another country code', () => {
    expect(formatPhoneInput('+351')).toBe('+351');
    expect(formatPhoneInput('+351912345678')).toBe('+351 912 345 678');
  });

  it('allows other country codes like +1 without forcing +55', () => {
    const formatted = formatPhoneInput('+15551234567');
    expect(formatted.startsWith('+1')).toBe(true);
    expect(formatted.startsWith('+55')).toBe(false);
  });
});

describe('normalizePhoneForApi', () => {
  it('normalizes formatted BR number to E.164', () => {
    expect(normalizePhoneForApi('+55 (11) 91234-5678')).toBe('+5511912345678');
  });

  it('adds +55 to 11-digit national numbers without plus', () => {
    expect(normalizePhoneForApi('11912345678')).toBe('+5511912345678');
  });

  it('preserves explicit international codes', () => {
    expect(normalizePhoneForApi('+351 912 345 678')).toBe('+351912345678');
  });
});

describe('formatPhoneFromApi', () => {
  it('formats stored BR E.164 for display', () => {
    expect(formatPhoneFromApi('+5511912345678')).toBe('+55 (11) 91234-5678');
  });

  it('formats stored PT E.164 without forcing +55', () => {
    expect(formatPhoneFromApi('+351912345678')).toBe('+351 912 345 678');
  });
});
