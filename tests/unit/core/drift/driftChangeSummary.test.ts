import { describe, expect, it } from 'vitest';

import { driftChangeRows, renderDriftChangeTableMarkdown } from '@/core/drift/driftChangeSummary';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

describe('driftChangeSummary', () => {
  const report: DriftReportV1 = {
    v: 1,
    kind: 'drift-report',
    meta: { generatedAt: '2026-05-28T00:00:00.000Z', figmaFileKey: '', repoUrl: '' },
    summary: { push: 1, pull: 0, conflict: 0, synced: 0 },
    drifts: [
      {
        id: 'var/Theme/color/primary',
        kind: 'variable',
        direction: 'push',
        figma: { valuesByMode: { Default: { r: 0.1, g: 0.2, b: 0.3, a: 1 } } },
        repo: { valuesByMode: { Default: { r: 0.9, g: 0.9, b: 0.9, a: 1 } } },
        lastSynced: {},
      },
    ],
  };

  it('builds before/after rows for PR table', () => {
    const rows = driftChangeRows(report, ['var/Theme/color/primary']);
    expect(rows).toHaveLength(1);
    expect(rows[0].repoValue).toContain('#');
    expect(rows[0].figmaValue).toContain('#');
    const table = renderDriftChangeTableMarkdown(report, ['var/Theme/color/primary']);
    expect(table).toContain('var/Theme/color/primary');
    expect(table).toContain('Repo (before)');
    expect(table).toContain('Figma (after)');
  });
});
