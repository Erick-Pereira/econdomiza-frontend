/**
 * Superfície pública da camada de serviços (gateway).
 * Preferir importar daqui em vez de `lib/econdomiza-api` para acoplamento estável.
 */
export { EcondomizaApi } from './api';
export { GatewayHttpError, isGatewayHttpError, isAuthPathNoRefresh, resolveGatewayBase } from '../lib/gateway';
