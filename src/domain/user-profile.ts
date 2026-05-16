/**
 * Perfil do utilizador autenticado (contrato `GET /api/auth/me` após unwrap do gateway).
 * Camada de domínio leve — sem dependência de React ou HTTP.
 *
 * `role`: espelha o backend (Admin, Sindico, Conselho) — ver `domain/auth-roles.ts`.
 */

export type AuthUserProfile = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
  isActive?: boolean;
};

export function mapGatewayUserProfile(raw: unknown): AuthUserProfile | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = o.id ?? o.Id;
  if (id == null || String(id).trim() === '') return null;
  const created = o.createdAt ?? o.CreatedAt;
  const active = o.isActive ?? o.IsActive;
  return {
    id: String(id),
    tenantId: String(o.tenantId ?? o.TenantId ?? ''),
    email: String(o.email ?? o.Email ?? ''),
    name: String(o.name ?? o.Name ?? ''),
    role: String(o.role ?? o.Role ?? ''),
    ...(created != null ? { createdAt: String(created) } : {}),
    ...(typeof active === 'boolean' ? { isActive: active } : {}),
  };
}
