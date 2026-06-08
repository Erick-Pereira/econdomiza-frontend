import { formatPhoneFromApi, normalizePhoneForApi } from './phone-format';

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalToUtcIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function readPrefs(raw: unknown, fallbackUserId: string): Record<string, unknown> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (!o.userId && !o.UserId && fallbackUserId) {
    return { ...o, userId: fallbackUserId };
  }
  return o;
}

export type PreferencesFormState = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailAddress: string;
  phoneNumber: string;
  alertDrop: boolean;
  alertRise: boolean;
  alertTrend: boolean;
  minimumSeverity: string;
  muteLocal: string;
  snoozeLocal: string;
};

export function prefsToFormState(p: Record<string, unknown>): PreferencesFormState {
  const phoneRaw = String(p.phoneNumber ?? p.PhoneNumber ?? '');
  return {
    emailEnabled: Boolean(p.emailEnabled ?? p.EmailEnabled ?? true),
    smsEnabled: Boolean(p.smsEnabled ?? p.SmsEnabled ?? false),
    emailAddress: String(p.emailAddress ?? p.EmailAddress ?? ''),
    phoneNumber: formatPhoneFromApi(phoneRaw),
    alertDrop: Boolean(p.alertDropEnabled ?? p.AlertDropEnabled ?? true),
    alertRise: Boolean(p.alertRiseEnabled ?? p.AlertRiseEnabled ?? true),
    alertTrend: Boolean(p.alertTrendEnabled ?? p.AlertTrendEnabled ?? true),
    minimumSeverity: String(p.minimumSeverity ?? p.MinimumSeverity ?? 'Info'),
    muteLocal: toDatetimeLocalValue(String(p.muteAllUntilUtc ?? p.MuteAllUntilUtc ?? '') || undefined),
    snoozeLocal: toDatetimeLocalValue(
      String(p.snoozePriceAlertsUntilUtc ?? p.SnoozePriceAlertsUntilUtc ?? '') || undefined
    ),
  };
}

/** Utilizador ainda não gravou contactos — sem isto o notification-service não envia. */
export function isPreferencesUnset(raw: unknown): boolean {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const hasEmail = String(p.emailAddress ?? p.EmailAddress ?? '').trim().length > 0;
  const hasPhone = String(p.phoneNumber ?? p.PhoneNumber ?? '').trim().length > 0;
  return !hasEmail && !hasPhone;
}

export type PreferencesValidationResult = { ok: true } | { ok: false; message: string };

/** Validação client-side alinhada às regras do notification-service. */
export function validatePreferencesForm(form: PreferencesFormState): PreferencesValidationResult {
  if (form.emailEnabled && !form.emailAddress.trim()) {
    return { ok: false, message: 'Indique o e-mail ou desactive o canal de e-mail.' };
  }
  if (form.smsEnabled && !form.phoneNumber.trim()) {
    return { ok: false, message: 'Indique o telemóvel ou desactive o canal SMS.' };
  }
  if (!form.emailEnabled && !form.smsEnabled) {
    return { ok: false, message: 'Active pelo menos um canal (e-mail ou SMS) para receber alertas.' };
  }
  if (!form.alertDrop && !form.alertRise && !form.alertTrend) {
    return { ok: false, message: 'Seleccione pelo menos um tipo de alerta de preço.' };
  }
  return { ok: true };
}

export function mergeProfileEmailIntoForm(
  form: PreferencesFormState,
  profileEmail?: string | null
): PreferencesFormState {
  const email = profileEmail?.trim() ?? '';
  if (!email || form.emailAddress.trim()) return form;
  return { ...form, emailAddress: email, emailEnabled: true };
}

export function formStateToPayload(
  userId: string,
  form: PreferencesFormState,
  options: { applyMuteSnooze: boolean; muteIso?: string | null; snoozeIso?: string | null }
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    userId,
    emailEnabled: form.emailEnabled,
    smsEnabled: form.smsEnabled,
    emailAddress: form.emailAddress.trim() || null,
    phoneNumber: form.phoneNumber.trim() ? normalizePhoneForApi(form.phoneNumber) : null,
    alertDropEnabled: form.alertDrop,
    alertRiseEnabled: form.alertRise,
    alertTrendEnabled: form.alertTrend,
    minimumSeverity: form.minimumSeverity.trim() || 'Info',
    applyMuteSnooze: true,
    muteAllUntilUtc: options.muteIso ?? null,
    snoozePriceAlertsUntilUtc: options.snoozeIso ?? null,
  };
  return body;
}
