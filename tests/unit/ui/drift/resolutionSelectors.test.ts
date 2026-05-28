import { describe, expect, it } from 'vitest';

import {
  canBulkPull,
  canBulkPush,
} from '@/ui/drift/resolutionSelectors';
import type { ResolutionState } from '@/ui/drift/resolutionReducer';
import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

function buildState(report: DriftReportV1, selectedIds: string[], resolutions: Record<string, { type: 'push' | 'pull' | 'skip' }>): ResolutionState {
  const resolutionMap = new Map(Object.entries(resolutions));
  return {
    report: report,
    filter: 'all',
    selectedIds: new Set(selectedIds),
    resolutions: resolutionMap,
    loading: false,
    error: null,
    openConflictId: null,
  };
}

describe('resolutionSelectors bulk rules', () => {
  const report: DriftReportV1 = {
    v: 1,
    kind: 'drift-report',
    meta: { generatedAt: '2026-05-28T00:00:00.000Z', figmaFileKey: '', repoUrl: '' },
    summary: { push: 4, pull: 3, conflict: 3, synced: 0 },
    drifts: [
      { id: 'var/a', kind: 'variable', direction: 'push', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/b', kind: 'variable', direction: 'push', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/c', kind: 'variable', direction: 'push', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/d', kind: 'variable', direction: 'push', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/e', kind: 'variable', direction: 'pull', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/f', kind: 'variable', direction: 'pull', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/g', kind: 'variable', direction: 'pull', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/h', kind: 'variable', direction: 'conflict', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/i', kind: 'variable', direction: 'conflict', figma: {}, repo: {}, lastSynced: {} },
      { id: 'var/j', kind: 'variable', direction: 'conflict', figma: {}, repo: {}, lastSynced: {} },
    ],
  };

  it('enables bulk push for push-only selection', () => {
    const state = buildState(report, ['var/a', 'var/b', 'var/c', 'var/d'], {});
    expect(canBulkPush(state)).toBe(true);
    expect(canBulkPull(state)).toBe(false);
  });

  it('enables bulk pull for pull-only selection', () => {
    const state = buildState(report, ['var/e', 'var/f', 'var/g'], {});
    expect(canBulkPush(state)).toBe(false);
    expect(canBulkPull(state)).toBe(true);
  });

  it('disables bulk actions when selected conflict is unresolved', () => {
    const state = buildState(report, ['var/a', 'var/b', 'var/h'], {});
    expect(canBulkPush(state)).toBe(false);
    expect(canBulkPull(state)).toBe(false);
  });

  it('enables bulk push when conflict is resolved to push', () => {
    const state = buildState(report, ['var/a', 'var/b', 'var/h'], { 'var/h': { type: 'push' } });
    expect(canBulkPush(state)).toBe(true);
    expect(canBulkPull(state)).toBe(false);
  });

  it('disables bulk actions when nothing selected', () => {
    const state = buildState(report, [], {});
    expect(canBulkPush(state)).toBe(false);
    expect(canBulkPull(state)).toBe(false);
  });
});
