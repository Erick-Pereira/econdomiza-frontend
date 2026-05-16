/**
 * Regras de papel no frontend — devem espelhar políticas do gateway (fonte de verdade).
 * Valores de `role` vêm de `GET /api/auth/me` (Admin, Sindico, Conselho).
 */
import { normalizeRoleKey } from '../../domain/auth-roles';

/** Usuários que podem enviar documentos na área de auditoria. */
export function roleAllowsAuditDocumentUpload(role: string | undefined): boolean {
  const r = normalizeRoleKey(role);
  return r === 'SINDICO' || r === 'ADMIN';
}
