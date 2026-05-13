import { describe, it, expect } from 'vitest';
import { normalizeListPayload } from './api-normalize';

describe('normalizeListPayload', () => {
  it('aceita array directo', () => {
    expect(normalizeListPayload([{ a: 1 }])).toEqual([{ a: 1 }]);
  });

  it('extrai items de envelope', () => {
    expect(normalizeListPayload({ items: [{ id: 'x' }] })).toEqual([{ id: 'x' }]);
  });

  it('extrai data.items aninhado', () => {
    expect(normalizeListPayload({ data: { items: [1, 2] } })).toEqual([1, 2]);
  });

  it('extrai array em data (envelope parcial)', () => {
    expect(normalizeListPayload({ data: [{ a: 1 }, { a: 2 }] })).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('null ou vazio → []', () => {
    expect(normalizeListPayload(null)).toEqual([]);
    expect(normalizeListPayload(undefined)).toEqual([]);
    expect(normalizeListPayload({})).toEqual([]);
  });
});
