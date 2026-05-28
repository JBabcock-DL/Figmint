import { describe, expect, it } from 'vitest';

import { buildDriftReport } from '@/core/drift/report';

import acReport from '../../../../src/io/formats/__fixtures__/drift-report-ac.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

describe('buildDriftReport', () => {
  it('aggregates variable and component drifts with sorted ids', () => {
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

    expect(report.summary.push).toBe(4);
    expect(report.summary.pull).toBe(2);
    expect(report.summary.conflict).toBe(1);
    expect(report.summary.synced).toBe(410);
    expect(report.drifts).toHaveLength(7);
    expect(report.drifts[0].id.localeCompare(report.drifts[1].id)).toBeLessThanOrEqual(0);
  });
});
