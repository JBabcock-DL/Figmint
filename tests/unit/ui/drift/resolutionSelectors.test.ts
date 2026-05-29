import { describe, expect, it } from 'vitest';

import {
  pushDriftsPendingCommit,
  pullDrifts,
  stagedPushCount,
} from '@/ui/drift/resolutionSelectors';
import type { ResolutionState } from '@/ui/drift/resolutionReducer';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

function buildState(
  report: DriftReportV1,
  staged: string[],
  resolutions: Record<string, { type: 'push' | 'pull' | 'skip' }>,
  deniedPull: string[] = [],
): ResolutionState {
  return {
    report: report,
    checkedIds: new Set<string>(),
    stagedPushIds: new Set(staged),
    deniedPullIds: new Set(deniedPull),
    resolutions: new Map(Object.entries(resolutions)),
    loading: false,
    error: null,
    openConflictId: null,
    pullPanelOpen: false,
  };
}

describe('resolutionSelectors staging', () => {
  const report: DriftReportV1 = {
    v: 1,
    kind: 'drift-report',
    meta: { generatedAt: '2026-05-28T00:00:00.000Z', figmaFileKey: '', repoUrl: '' },
    summary: { push: 2, pull: 2, conflict: 1, synced: 0 },
    drifts: [
      { id: 'var/a', kind: 'variable', direction: 'push', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/b', kind: 'variable', direction: 'push', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/c', kind: 'variable', direction: 'pull', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/d', kind: 'variable', direction: 'pull', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/e', kind: 'variable', direction: 'conflict', figma: {}, repo: {}, lastSynced: {} },
    ],
  };

  it('lists push drifts excluding staged', () => {
    const state = buildState(report, ['var/a'], {});
    expect(
      pushDriftsPendingCommit(state).map(function (d) {
        return d.id;
      }),
    ).toEqual(['var/b']);
  });

  it('includes conflict resolved to push in pending commit list', () => {
    const state = buildState(report, [], { 'var/e': { type: 'push' } });
    const ids = pushDriftsPendingCommit(state).map(function (d) {
      return d.id;
    });
    expect(ids).toContain('var/e');
    expect(ids).toContain('var/a');
  });

  it('excludes denied pull drifts', () => {
    const state = buildState(report, [], {}, ['var/c']);
    expect(
      pullDrifts(state).map(function (d) {
        return d.id;
      }),
    ).toEqual(['var/d']);
  });

  it('counts staged push queue', () => {
    const state = buildState(report, ['var/a', 'var/b'], {});
    expect(stagedPushCount(state)).toBe(2);
  });
});
