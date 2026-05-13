// Exporta utilitários globais
export { formatApiError } from '../lib/api-error-message';
export { parseLookupData } from '../lib/condominio-lookup';
export { buildDashboardKpisFromMonthlyPayload } from '../lib/dashboard-from-monthly';
export { normalizeListPayload } from '../lib/api-normalize';
export { MercadoService } from '../services/MercadoService';
export { EcondomizaApi } from '../services/api';
export { useLoginForm } from '../features/auth/hooks/useLoginForm';
export { useRegisterForm } from '../features/auth/hooks/useRegisterForm';
export { useAuthSession } from '../context/AuthSessionContext';