import { describe, expect, it } from 'vitest';
import { AUTH_COPY, isWrongCondominioLoginError } from './constants';

describe('auth constants', () => {
  it('detects wrong condominio login message', () => {
    expect(isWrongCondominioLoginError(AUTH_COPY.wrongCondominio)).toBe(true);
    expect(isWrongCondominioLoginError('Email ou senha inválidos')).toBe(false);
  });
});
