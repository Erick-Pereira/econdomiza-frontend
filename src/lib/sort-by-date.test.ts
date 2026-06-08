import { describe, expect, it } from 'vitest';
import { pickCreatedAtIso, sortByCreatedAtDesc } from './sort-by-date';

describe('sortByCreatedAtDesc', () => {
  it('ordena do mais recente para o mais antigo', () => {
    const rows = sortByCreatedAtDesc([
      { id: '1', createdAt: '2026-01-01T10:00:00Z' },
      { id: '2', createdAt: '2026-06-02T10:00:00Z' },
      { id: '3', createdAt: '2026-03-15T10:00:00Z' },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('pickCreatedAtIso aceita PascalCase e analyzedAt', () => {
    expect(pickCreatedAtIso({ CreatedAt: '2026-06-02T12:00:00Z' })).toBe('2026-06-02T12:00:00Z');
    expect(pickCreatedAtIso({ AnalyzedAt: '2026-05-01T08:00:00Z' })).toBe('2026-05-01T08:00:00Z');
  });
});
