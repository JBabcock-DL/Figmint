import { describe, expect, it } from 'vitest';

import { createInitialResolutionState, reduceResolution } from '@/ui/drift/resolutionReducer';

import driftPayload from '../../../fixtures/ui/export/drift-report.json';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

const report = driftPayload as DriftReportV1;

describe('resolutionReducer', () => {
  it('loads report and resets staging state', () => {
    const next = reduceResolution(createInitialResolutionState(), {
      type: 'report/loaded',
      report: report,
    });
    expect(next.report).toEqual(report);
    expect(next.checkedIds.size).toBe(0);
    expect(next.stagedPushIds.size).toBe(0);
    expect(next.deniedPullIds.size).toBe(0);
    expect(next.loading).toBe(false);
  });

  it('commits checked ids into staged push queue', () => {
    const loaded = reduceResolution(createInitialResolutionState(), {
      type: 'report/loaded',
      report: report,
    });
    const driftId = report.drifts[0].id;
    const checked = reduceResolution(loaded, {
      type: 'checkbox/select-all',
      driftIds: [driftId],
    });
    const committed = reduceResolution(checked, {
      type: 'staging/commit-push',
      driftIds: [driftId],
    });
    expect(committed.stagedPushIds.has(driftId)).toBe(true);
    expect(committed.checkedIds.size).toBe(0);
  });

  it('denies pull rows until next fetch', () => {
    const loaded = reduceResolution(createInitialResolutionState(), {
      type: 'report/loaded',
      report: report,
    });
    const denied = reduceResolution(loaded, { type: 'pull/deny', driftId: 'var/x' });
    expect(denied.deniedPullIds.has('var/x')).toBe(true);
  });
});
