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
  return {
    emailEnabled: Boolean(p.emailEnabled ?? p.EmailEnabled ?? true),
    smsEnabled: Boolean(p.smsEnabled ?? p.SmsEnabled ?? false),
    emailAddress: String(p.emailAddress ?? p.EmailAddress ?? ''),
    phoneNumber: String(p.phoneNumber ?? p.PhoneNumber ?? ''),
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
    phoneNumber: form.phoneNumber.trim() || null,
    alertDropEnabled: form.alertDrop,
    alertRiseEnabled: form.alertRise,
    alertTrendEnabled: form.alertTrend,
    minimumSeverity: form.minimumSeverity.trim() || 'Info',
    applyMuteSnooze: options.applyMuteSnooze,
  };
  if (options.applyMuteSnooze) {
    body.muteAllUntilUtc = options.muteIso ?? null;
    body.snoozePriceAlertsUntilUtc = options.snoozeIso ?? null;
  }
  return body;
}
