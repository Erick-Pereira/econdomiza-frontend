/**
 * Perfis de utilizador no condomínio — alinhados a
 * `Simcag.IdentityService.Domain.ValueObjects.Role` (Admin, Sindico, Conselho).
 * Não introduzir valores extra sem atualizar o backend.
 */
export const TENANT_ROLE_VALUES = ['Admin', 'Sindico', 'Conselho'] as const;

export type TenantRole = (typeof TENANT_ROLE_VALUES)[number];

export const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  Admin: 'Administrador',
  Sindico: 'Síndico',
  Conselho: 'Conselho',
};

/** Papel pré-selecionado em formulários de registo (fluxo típico do síndico). */
export const DEFAULT_REGISTER_ROLE: TenantRole = 'Sindico';

export function isTenantRole(value: string | undefined | null): value is TenantRole {
  return value != null && (TENANT_ROLE_VALUES as readonly string[]).includes(value);
}

export function normalizeRoleKey(role: string | undefined | null): string {
  return (role ?? '').trim().toUpperCase();
}

/** Opções do select de registo: mesmos valores que a API aceita. */
export const REGISTER_ROLE_OPTIONS: { value: TenantRole; label: string; helper?: string }[] = [
  { value: 'Sindico', label: TENANT_ROLE_LABELS.Sindico, helper: 'Gestão operacional do condomínio' },
  { value: 'Conselho', label: TENANT_ROLE_LABELS.Conselho, helper: 'Consulta e fiscalização' },
  {
    value: 'Admin',
    label: TENANT_ROLE_LABELS.Admin,
    helper: 'Administração da plataforma — use apenas quando aplicável',
  },
];
