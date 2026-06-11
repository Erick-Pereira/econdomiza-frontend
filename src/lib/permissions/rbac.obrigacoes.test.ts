import { describe, expect, it } from 'vitest';
import { canManageObrigacoes, canViewCompras, canViewExpenseDetail, canViewObrigacoes } from './rbac';

describe('obrigacoes rbac', () => {
  it('allows sindico, conselho and admin to manage', () => {
    expect(canManageObrigacoes('Sindico')).toBe(true);
    expect(canManageObrigacoes('Conselho')).toBe(true);
    expect(canManageObrigacoes('Admin')).toBe(true);
  });

  it('blocks morador from managing but allows view', () => {
    expect(canManageObrigacoes('Morador')).toBe(false);
    expect(canViewObrigacoes('Morador')).toBe(true);
  });
});

describe('expense detail rbac', () => {
  it('allows morador to view NF detail but not compras list', () => {
    expect(canViewExpenseDetail('Morador')).toBe(true);
    expect(canViewCompras('Morador')).toBe(false);
  });

  it('allows operational roles to view expense detail', () => {
    expect(canViewExpenseDetail('Sindico')).toBe(true);
    expect(canViewExpenseDetail('Admin')).toBe(true);
  });
});
