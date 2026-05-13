/**
 * Fachada do cliente gateway (`lib/econdomiza-api.ts`).
 * Sessão na shell autenticada: `context/AuthSessionContext` + `domain/user-profile.ts`.
 */
import { EcondomizaApi } from '../lib/econdomiza-api';

export { EcondomizaApi };

export const apiService = {
  login: (condominioId: string, email: string, password: string) => EcondomizaApi.login(condominioId, email, password),
  register: (params: Parameters<typeof EcondomizaApi.register>[0]) => EcondomizaApi.register(params),
  logout: () => EcondomizaApi.logout(),
  profile: () => EcondomizaApi.profile(),
  getCondominio: (id: string) => EcondomizaApi.getCondominio(id),
  getMyCondominio: () => EcondomizaApi.getMyCondominio(),
  listConformities: (condominioId: string) => EcondomizaApi.listConformities(condominioId),
  dashboardSummary: (params?: { year?: number }) => EcondomizaApi.dashboardSummary(params),
  listExpenses: (filters: Record<string, unknown>) => EcondomizaApi.listExpenses(filters),
  listSuppliers: (filters: Record<string, unknown>) => EcondomizaApi.listSuppliers(filters),
  createSupplier: (payload: Parameters<typeof EcondomizaApi.createSupplier>[0]) => EcondomizaApi.createSupplier(payload),
  updateSupplier: (id: string, body: Parameters<typeof EcondomizaApi.updateSupplier>[1]) =>
    EcondomizaApi.updateSupplier(id, body),
  deactivateSupplier: (id: string) => EcondomizaApi.deactivateSupplier(id),
  listAlerts: (params?: Parameters<typeof EcondomizaApi.listAlerts>[0]) => EcondomizaApi.listAlerts(params),
  listAuditLogs: (filters: Record<string, unknown>) => EcondomizaApi.listAuditLogs(filters),
  uploadDocument: (file: File, options?: { documentType?: string; source?: string }) =>
    EcondomizaApi.uploadDocument(file, options),
  getNotificationPreferences: () => EcondomizaApi.getNotificationPreferences(),
  updateNotificationPreferences: (payload: unknown) => EcondomizaApi.updateNotificationPreferences(payload),
  getYearOverYear: (yearsBack?: number) => EcondomizaApi.getYearOverYear(yearsBack),
  getMonthlyDashboard: (year: number) => EcondomizaApi.getMonthlyDashboard(year),
};
