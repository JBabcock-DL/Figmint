import { describe, expect, it } from 'vitest';

import {
  createInitialResolutionState,
  reduceResolution,
} from '@/ui/drift/resolutionReducer';

import driftPayload from '../../../fixtures/ui/export/drift-report.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

const report = driftPayload as DriftReportV1;

describe('resolutionReducer', () => {
  it('loads report and resets selection state', () => {
    const next = reduceResolution(createInitialResolutionState(), {
      type: 'report/loaded',
      report: report,
    });
    expect(next.report).toEqual(report);
    expect(next.selectedIds.size).toBe(0);
    expect(next.loading).toBe(false);
  });

  it('stores row resolution choices', () => {
    const loaded = reduceResolution(createInitialResolutionState(), {
      type: 'report/loaded',
      report: report,
    });
    const next = reduceResolution(loaded, {
      type: 'row/resolve',
      driftId: report.drifts[0].id,
      choice: { type: 'push' },
    });
    expect(next.resolutions.get(report.drifts[0].id)).toEqual({ type: 'push' });
  });
});
