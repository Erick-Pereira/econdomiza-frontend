/**
 * Implementação do cliente gateway (`lib/econdomiza-api.ts`).
 * Imports da aplicação devem preferir `services/index` (barrel público).
 * Sessão: `context/AuthSessionContext` + `lib/auth-session-from-api.ts` + `domain/user-profile.ts`.
 */
import { EcondomizaApi as EcondomizaApi } from '../lib/econdomiza-api';

export { EcondomizaApi };
