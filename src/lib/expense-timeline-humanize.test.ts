import { describe, expect, it } from 'vitest';
import {
  humanizeTimelineDetail,
  isTechnicalAuditUpdate,
  timelineTabFilter,
} from './expense-timeline-humanize';

describe('expense-timeline-humanize', () => {
  it('humaniza JSON de auditoria UPDATE', () => {
    const r = humanizeTimelineDetail({
      title: 'Auditoria: UPDATE',
      action: 'UPDATE',
      source: 'audit',
      detail:
        '{"UpdatedAt":"2026-06-10T21:04:37Z","ProcessingStatus":5,"LastPipelineTransitionAt":"2026-06-10T21:04:37Z"}',
    });
    expect(r.summary).toContain('Processamento');
    expect(r.summary).toContain('concluído');
    expect(r.technicalDetail).toContain('ProcessingStatus');
  });

  it('filtra updates técnicos na aba Decisões', () => {
    const entry = {
      title: 'Auditoria: UPDATE',
      action: 'UPDATE',
      source: 'audit',
      detail: '{"ProcessingStatus":5}',
    };
    expect(isTechnicalAuditUpdate(entry)).toBe(true);
    expect(timelineTabFilter('decisions', entry)).toBe(false);
    expect(timelineTabFilter('processing', entry)).toBe(true);
  });
});
