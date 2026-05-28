import { describe, expect, it } from 'vitest';

import { buildDriftReport } from '@/core/drift/report';
import { format } from '@/io/formats';
import acReport from '../../../../src/io/formats/__fixtures__/drift-report-ac.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

describe('drift report emission integration', () => {
  it('renders push/pull/conflict markdown sections from built report', () => {
    const sample = acReport as DriftReportV1;
    const variableDrifts = sample.drifts.filter(function (entry) {
      return entry.kind === 'variable';
    });
    const componentDrifts = sample.drifts.filter(function (entry) {
      return entry.kind === 'component';
    });

    const report = buildDriftReport({
      variableDrifts: variableDrifts,
      componentDrifts: componentDrifts,
      meta: sample.meta,
      syncedCount: sample.summary.synced,
    });

    const markdown = format(report, 'md');
    expect(markdown).toContain('## ↑ Push');
    expect(markdown).toContain('## ↓ Pull');
    expect(markdown).toContain('## ⚠ Conflicts');
  });
});
