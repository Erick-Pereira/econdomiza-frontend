import { useCallback } from 'react';
import type { AuthTokens, UserProfile } from '../../../context/AuthSessionContext';
import { useAuthSession } from '../../../context/AuthSessionContext';
import { formatApiError } from '../../../lib/api-error-message';
import {
  authTokensFromGatewayStorage,
  authTokensFromLoginPayload,
  userProfileFromMePayload,
} from '../../../lib/auth-session-from-api';
import { EcondomizaApi } from '../../../services';
import { AUTH_COPY } from '../constants';

export type EstablishSessionFailureCode = 'no_tokens' | 'no_profile' | 'api';

export type EstablishSessionResult =
  | { ok: true }
  | { ok: false; code: EstablishSessionFailureCode; message: string };

/**
 * Após `login` ou `register` no gateway, materializa tokens + perfil no `AuthSessionContext`.
 * Único sítio para evitar divergência entre LoginForm e RegisterForm.
 */
export async function establishSessionFromAuthEnvelope(
  loginAction: (profile: UserProfile, tokens: AuthTokens) => Promise<void>,
  envelopeData: unknown
): Promise<EstablishSessionResult> {
  const raw =
    envelopeData && typeof envelopeData === 'object' ? (envelopeData as Record<string, unknown>) : {};
  const tokens = authTokensFromLoginPayload(raw) ?? authTokensFromGatewayStorage();
  if (!tokens) {
    return { ok: false, code: 'no_tokens', message: AUTH_COPY.loginNoTokens };
  }
  try {
    const me = await EcondomizaApi.profile();
    const profile = userProfileFromMePayload(me.data);
    if (!profile) {
      return { ok: false, code: 'no_profile', message: AUTH_COPY.loginNoProfile };
    }
    await loginAction(profile, tokens);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, code: 'api', message: formatApiError(err) };
  }
}

export function useEstablishGatewaySession() {
  const { actions } = useAuthSession();

  const loginWithCredentials = useCallback(
    async (tenantId: string, email: string, password: string): Promise<EstablishSessionResult> => {
      // TEMP_AUTH_DISABLED: Mockar sucesso de login se modo desativado
      const TEMP_AUTH_DISABLED = localStorage.getItem('TEMP_AUTH_DISABLED_MODE') === 'true';
      if (TEMP_AUTH_DISABLED) {
        console.warn('[TEMP_AUTH_DISABLED] loginWithCredentials bypassed - retornando sucesso fake');
        return { ok: true };
      }

      try {
        const loginRes = await EcondomizaApi.login(tenantId, email.trim(), password);
        return establishSessionFromAuthEnvelope(actions.login, loginRes.data);
      } catch (err: unknown) {
        return { ok: false, code: 'api', message: formatApiError(err) };
      }
    },
    [actions.login]
  );

  const establishFromEnvelope = useCallback(
    (envelopeData: unknown) => establishSessionFromAuthEnvelope(actions.login, envelopeData),
    [actions.login]
  );

  return { loginWithCredentials, establishFromEnvelope };
}
