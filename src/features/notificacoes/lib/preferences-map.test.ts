import { describe, expect, it } from 'vitest';
import {
  formStateToPayload,
  isPreferencesUnset,
  validatePreferencesForm,
  type PreferencesFormState,
} from './preferences-map';

const validForm: PreferencesFormState = {
  emailEnabled: true,
  smsEnabled: false,
  emailAddress: 'a@b.com',
  phoneNumber: '',
  alertDrop: true,
  alertRise: true,
  alertTrend: false,
  minimumSeverity: 'Info',
  muteLocal: '',
  snoozeLocal: '',
};

describe('isPreferencesUnset', () => {
  it('detects empty API payload as unset even when caller has userId', () => {
    expect(isPreferencesUnset({})).toBe(true);
    expect(isPreferencesUnset({ emailEnabled: false })).toBe(true);
  });

  it('detects persisted preferences by contact info', () => {
    expect(
      isPreferencesUnset({
        userId: 'abc',
        emailAddress: 'x@y.com',
      })
    ).toBe(false);
  });
});

describe('validatePreferencesForm', () => {
  it('accepts valid email-only config', () => {
    expect(validatePreferencesForm(validForm).ok).toBe(true);
  });

  it('rejects email enabled without address', () => {
    const r = validatePreferencesForm({ ...validForm, emailAddress: '' });
    expect(r.ok).toBe(false);
  });

  it('rejects all channels disabled', () => {
    const r = validatePreferencesForm({ ...validForm, emailEnabled: false, smsEnabled: false });
    expect(r.ok).toBe(false);
  });

  it('rejects all alert types disabled', () => {
    const r = validatePreferencesForm({
      ...validForm,
      alertDrop: false,
      alertRise: false,
      alertTrend: false,
    });
    expect(r.ok).toBe(false);
  });
});

describe('formStateToPayload', () => {
  it('normalizes phone number for API', () => {
    const body = formStateToPayload(
      'user-1',
      { ...validForm, phoneNumber: '+55 (11) 91234-5678', smsEnabled: true },
      {
        applyMuteSnooze: true,
        muteIso: null,
        snoozeIso: null,
      }
    );
    expect(body.phoneNumber).toBe('+5511912345678');
  });
});
