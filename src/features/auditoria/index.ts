/**
 * Feature **Auditoria** — superfície pública para outras áreas da app.
 * Preferir importar daqui (em vez de `lib/permissions` direto) para manter limites de módulo claros.
 */
export { roleAllowsAuditDocumentUpload } from '../../lib/permissions/rbac';
export { useAuditoriaData } from './hooks/useAuditoriaData';
export type { AuditoriaExpenseRow } from './lib/expense-map';
