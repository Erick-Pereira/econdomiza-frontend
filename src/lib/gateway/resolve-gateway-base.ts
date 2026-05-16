/**
 * Base URL do gateway (env build-time, override runtime, ou vazio para mesma origem).
 * Sem dependência de React — reutilizável por qualquer cliente HTTP da app.
 */
export function resolveGatewayBase(): string {
  const explicit = import.meta.env.VITE_SIMCAG_GATEWAY_URL;
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    return explicit.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && (window as unknown as { SIMCAG_GATEWAY?: string }).SIMCAG_GATEWAY) {
    return String((window as unknown as { SIMCAG_GATEWAY: string }).SIMCAG_GATEWAY).replace(/\/$/, '');
  }
  return '';
}
