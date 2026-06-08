import { describe, expect, it } from 'vitest';
import { canConfigureNotificationPreferences, canViewNotificacoes } from './rbac';

describe('notification rbac', () => {
  it('allows sindico and conselho to configure preferences', () => {
    expect(canConfigureNotificationPreferences('Sindico')).toBe(true);
    expect(canConfigureNotificationPreferences('Conselho')).toBe(true);
    expect(canConfigureNotificationPreferences('Admin')).toBe(true);
  });

  it('blocks morador from preferences and operational hub', () => {
    expect(canConfigureNotificationPreferences('Morador')).toBe(false);
    expect(canViewNotificacoes('Morador')).toBe(false);
    expect(canViewNotificacoes('Sindico')).toBe(false);
  });

  it('keeps operational hub admin-only', () => {
    expect(canViewNotificacoes('Admin')).toBe(true);
  });
});
