import { describe, expect, it } from 'vitest';
import { extractUploadPipelineWarning } from './econdomiza-api';

describe('extractUploadPipelineWarning', () => {
  it('returns processingNote when present', () => {
    expect(
      extractUploadPipelineWarning({
        publishedDataIngestedEvent: false,
        processingNote: 'DataIngestedEvent não foi publicado',
      })
    ).toBe('DataIngestedEvent não foi publicado');
  });

  it('returns fallback when event not published and no note', () => {
    const msg = extractUploadPipelineWarning({ publishedDataIngestedEvent: false });
    expect(msg).toMatch(/evento de processamento não foi publicado/i);
  });

  it('returns null on successful publish', () => {
    expect(extractUploadPipelineWarning({ publishedDataIngestedEvent: true })).toBeNull();
  });
});
