import { beforeEach, describe, expect, it } from 'vitest';

import { buildDriftReportMeta } from '@/core/drift/reportMeta';

describe('buildDriftReportMeta', () => {
  beforeEach(function () {
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = { fileKey: '' };
  });

  it('allows empty figma file key', () => {
    const meta = buildDriftReportMeta('https://github.com/detroitlabs/fighub');
    expect(meta.repoUrl).toContain('fighub');
    expect(meta.figmaFileKey).toBe('');
    expect(meta.generatedAt.length).toBeGreaterThan(0);
  });
});
