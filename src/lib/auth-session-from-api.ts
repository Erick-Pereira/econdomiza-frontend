import type { AuthTokens, UserProfile } from '../context/AuthSessionContext';
import { mapGatewayUserProfile } from '../domain/user-profile';

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Constrói `AuthTokens` a partir do payload típico de `POST /api/auth/login` (já unwrapped).
 */
export function authTokensFromLoginPayload(payload: Record<string, unknown>): AuthTokens | null {
  const accessToken = payload.accessToken != null ? String(payload.accessToken) : '';
  if (!accessToken) return null;

  const refreshToken =
    payload.refreshToken != null && String(payload.refreshToken) !== ''
      ? String(payload.refreshToken)
      : undefined;

  const expiresIn = num(payload.expiresIn ?? payload.expires_in, 3600);
  const expiresAtRaw = payload.expiresAt ?? payload.expires_at;
  const expiresAt =
    expiresAtRaw != null && String(expiresAtRaw) !== ''
      ? new Date(String(expiresAtRaw)).toISOString()
      : new Date(Date.now() + Math.max(60, expiresIn) * 1000).toISOString();

  return {
    accessToken,
    refreshToken,
    expiresIn,
    expiresAt,
  };
}

/** Fallback se o gateway não devolver `expiresIn` explícito no envelope. */
export function authTokensFromGatewayStorage(): AuthTokens | null {
  const accessToken = localStorage.getItem('simcag.accessToken') || '';
  if (!accessToken) return null;
  const refreshToken = localStorage.getItem('simcag.refreshToken') || undefined;
  const expiresIn = 3600;
  return {
    accessToken,
    refreshToken,
    expiresIn,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/**
 * Normaliza `GET /api/auth/me` (ou objeto equivalente) para `UserProfile`.
 * Usa `domain/user-profile` como única fonte de mapeamento a partir do gateway.
 */
export function userProfileFromMePayload(data: unknown): UserProfile | null {
  const u = mapGatewayUserProfile(data);
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    tenantId: u.tenantId,
    createdAt: u.createdAt ?? '',
  };
}
