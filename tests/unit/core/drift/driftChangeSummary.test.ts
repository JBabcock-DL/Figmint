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
        figma: {
          valuesByMode: { Default: { r: 0.1, g: 0.2, b: 0.3, a: 1 } },
          codeSyntax: {
            WEB: 'var(--color-primary)',
            ANDROID: 'color-primary',
            iOS: '.Palette.primary',
          },
        },
        repo: {
          valuesByMode: { Default: { r: 0.9, g: 0.9, b: 0.9, a: 1 } },
          codeSyntax: {
            WEB: 'var(--color-primary-old)',
            ANDROID: 'color-primary-old',
            iOS: '.Palette.primaryOld',
          },
        },
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
    expect(table).toContain('Repo dev syntax');
    expect(table).toContain('Figma dev syntax');
  });

  it('includes all platform dev syntax in PR table cells', () => {
    const rows = driftChangeRows(report, ['var/Theme/color/primary']);
    expect(rows[0].repoDevSyntax).toContain('Web:');
    expect(rows[0].repoDevSyntax).toContain('var(--color-primary-old)');
    expect(rows[0].repoDevSyntax).toContain('Android:');
    expect(rows[0].repoDevSyntax).toContain('color-primary-old');
    expect(rows[0].repoDevSyntax).toContain('iOS:');
    expect(rows[0].repoDevSyntax).toContain('.Palette.primaryOld');

    expect(rows[0].figmaDevSyntax).toContain('var(--color-primary)');
    expect(rows[0].figmaDevSyntax).toContain('color-primary');
    expect(rows[0].figmaDevSyntax).toContain('.Palette.primary');

    const table = renderDriftChangeTableMarkdown(report, ['var/Theme/color/primary']);
    expect(table).toContain('Web:');
    expect(table).toContain('Android:');
    expect(table).toContain('iOS:');
    expect(table).toContain('<br>');
  });

  it('shows em dash for component rows without token codeSyntax', () => {
    const componentReport: DriftReportV1 = {
      ...report,
      drifts: [
        {
          id: 'comp/Button',
          kind: 'component',
          direction: 'push',
          figma: {
            comparable: { specName: 'Button', variantMatrixHash: 'a', props: [], bindings: [] },
          },
          repo: null,
          lastSynced: null,
        },
      ],
    };
    const rows = driftChangeRows(componentReport, ['comp/Button']);
    expect(rows[0].repoDevSyntax).toBe('—');
    expect(rows[0].figmaDevSyntax).toBe('—');
  });
});
