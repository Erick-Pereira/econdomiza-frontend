import { describe, expect, it } from 'vitest';
import {
  formatAlertDatePtBr,
  formatAlertDateTimePtBr,
  isAlertRowResolved,
  mapSeverityToDashboardLevel,
  prioridadeLabelFromSeverity,
  severityUpperFromAlertRow,
} from './alert-row';

describe('isAlertRowResolved', () => {
  it('detects camelCase flags', () => {
    expect(isAlertRowResolved({ isResolved: true })).toBe(true);
    expect(isAlertRowResolved({ resolved: true })).toBe(true);
    expect(isAlertRowResolved({ IsResolved: true })).toBe(true);
  });
  it('returns false when open', () => {
    expect(isAlertRowResolved({ isResolved: false })).toBe(false);
  });
});

describe('severityUpperFromAlertRow', () => {
  it('prefers severity', () => {
    expect(severityUpperFromAlertRow({ severity: 'warning' })).toBe('WARNING');
  });
});

describe('mapSeverityToDashboardLevel', () => {
  it('maps CRITICAL and HIGH to high', () => {
    expect(mapSeverityToDashboardLevel('CRITICAL')).toBe('high');
    expect(mapSeverityToDashboardLevel('HIGH')).toBe('high');
  });
});

describe('prioridadeLabelFromSeverity', () => {
  it('maps to Portuguese labels', () => {
    expect(prioridadeLabelFromSeverity('CRITICAL')).toBe('alta');
    expect(prioridadeLabelFromSeverity('WARNING')).toBe('media');
  });
});

describe('formatAlertDate*', () => {
  it('returns em dash for invalid', () => {
    expect(formatAlertDatePtBr('')).toBe('—');
    expect(formatAlertDatePtBr('not-a-date')).toBe('—');
  });
  it('formats valid ISO', () => {
    const s = formatAlertDatePtBr('2026-01-15T12:00:00.000Z');
    expect(s).not.toBe('—');
    expect(s.length).toBeGreaterThan(0);
  });
  it('formatAlertDateTimePtBr handles empty', () => {
    expect(formatAlertDateTimePtBr('')).toBe('—');
  });
});
