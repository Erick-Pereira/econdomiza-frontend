import { describe, expect, it } from 'vitest';
import { resolveNotificationContextLink, sortDeliveriesRecent } from './notifications-model';

describe('notifications-model', () => {
  it('sorts deliveries newest first by sentAt/createdAt', () => {
    const sorted = sortDeliveriesRecent([
      { createdAt: '2026-06-01T10:00:00Z' },
      { sentAt: '2026-06-09T12:00:00Z', createdAt: '2026-06-08T10:00:00Z' },
      { createdAt: '2026-06-05T10:00:00Z' },
    ]);
    expect(sorted[0].sentAt).toBe('2026-06-09T12:00:00Z');
    expect(sorted[2].createdAt).toBe('2026-06-01T10:00:00Z');
  });

  it('resolves expense link from contextJson over legacy insights operationalLink', () => {
    const link = resolveNotificationContextLink({
      operationalLink: '/insights?productId=abc',
      contextJson: JSON.stringify({ expenseId: '11111111-2222-3333-4444-555555555555' }),
    });
    expect(link).toBe('/compras/11111111-2222-3333-4444-555555555555');
  });

  it('uses operationalLink when it points to compras', () => {
    const link = resolveNotificationContextLink({
      operationalLink: '/compras/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });
    expect(link).toBe('/compras/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('ignores legacy insights operationalLink without expense in context', () => {
    const link = resolveNotificationContextLink({
      operationalLink: '/insights?productId=abc',
      contextJson: JSON.stringify({ productId: 'abc' }),
    });
    expect(link).toBeNull();
  });
});
