import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { DriftReportV1 } from '@detroitlabs/figmint-contracts';

import { format } from '@/io/formats';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../src/io/formats/__fixtures__',
);

describe('renderDriftReportMarkdown', () => {
  it('renders AC headings with summary counts', () => {
    const doc = JSON.parse(
      readFileSync(join(fixturesDir, 'drift-report-ac.json'), 'utf8'),
    ) as DriftReportV1;
    const markdown = format(doc, 'md');

    expect(markdown).toMatch(/## ↑ Push \(4\)/);
    expect(markdown).toMatch(/## ↓ Pull \(2\)/);
    expect(markdown).toMatch(/## ⚠ Conflicts \(1\)/);
    expect(doc.summary.push).toBe(4);
    expect(doc.summary.pull).toBe(2);
    expect(doc.summary.conflict).toBe(1);
    expect(doc.drifts.filter((entry) => entry.direction === 'push').length).toBe(4);
    expect(doc.drifts.filter((entry) => entry.direction === 'pull').length).toBe(2);
    expect(doc.drifts.filter((entry) => entry.direction === 'conflict').length).toBe(1);
  });

  it('omits zero-count drift sections', () => {
    const doc: DriftReportV1 = {
      v: 1,
      kind: 'drift-report',
      meta: {
        generatedAt: '2026-01-01T00:00:00.000Z',
        figmaFileKey: 'abc',
        repoUrl: 'https://example.com/repo',
      },
      summary: { push: 1, pull: 0, conflict: 0, synced: 5 },
      drifts: [
        {
          id: 'var/a',
          kind: 'variable',
          direction: 'push',
          figma: { value: 1 },
          repo: { value: 2 },
          lastSynced: null,
        },
      ],
    };

    const markdown = format(doc, 'md');
    expect(markdown).toMatch(/## ↑ Push \(1\)/);
    expect(markdown).not.toMatch(/## ↓ Pull/);
    expect(markdown).not.toMatch(/## ⚠ Conflicts/);
  });
});

describe('shared markdown helpers', () => {
  it('truncates long unknown values', async () => {
    const { truncateUnknown } = await import('@/io/formats/markdown/shared');
    const long = { data: 'x'.repeat(200) };
    const truncated = truncateUnknown(long, 120);
    expect(truncated.endsWith('…')).toBe(true);
    expect(truncated.length).toBeLessThanOrEqual(120);
  });

  it('renders empty GFM tables with headers only', async () => {
    const { renderGfmTable } = await import('@/io/formats/markdown/shared');
    const table = renderGfmTable(['A', 'B'], []);
    expect(table).toBe('| A | B |\n| --- | --- |');
  });
});
