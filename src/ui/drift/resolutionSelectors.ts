import type { DriftEntry } from '@detroitlabs/fighub-contracts';

import { effectiveResolutionDirection, resolutionsForBulkPush } from '@/core/drift/applyPushResolutions';
import type { ResolutionChoice } from '@/io/messages/drift';

import type { ResolutionState } from './resolutionReducer';

function resolutionsRecord(state: ResolutionState): Record<string, ResolutionChoice> {
  const record: Record<string, ResolutionChoice> = {};
  for (const entry of state.resolutions.entries()) {
    record[entry[0]] = entry[1];
  }
  return record;
}

function pushResolutions(state: ResolutionState): Record<string, ResolutionChoice> {
  if (state.report === null) {
    return resolutionsRecord(state);
  }
  const allIds = state.report.drifts.map(function (d) {
    return d.id;
  });
  return resolutionsForBulkPush(state.report, resolutionsRecord(state), allIds);
}

export function isPushDrift(drift: DriftEntry, resolutions: Record<string, ResolutionChoice>): boolean {
  return effectiveResolutionDirection(drift, resolutions) === 'push';
}

export function isPullDrift(drift: DriftEntry, resolutions: Record<string, ResolutionChoice>): boolean {
  return effectiveResolutionDirection(drift, resolutions) === 'pull';
}

export function pushDrifts(state: ResolutionState): DriftEntry[] {
  if (state.report === null) {
    return [];
  }
  const resolutions = pushResolutions(state);
  return state.report.drifts.filter(function (drift) {
    return isPushDrift(drift, resolutions);
  });
}

/** Push drifts not yet committed to the push queue. */
export function pushDriftsPendingCommit(state: ResolutionState): DriftEntry[] {
  return pushDrifts(state).filter(function (drift) {
    return !state.stagedPushIds.has(drift.id);
  });
}

export function pullDrifts(state: ResolutionState): DriftEntry[] {
  if (state.report === null) {
    return [];
  }
  const resolutions = resolutionsRecord(state);
  return state.report.drifts.filter(function (drift) {
    return isPullDrift(drift, resolutions) && !state.deniedPullIds.has(drift.id);
  });
}

export function conflictDrifts(state: ResolutionState): DriftEntry[] {
  if (state.report === null) {
    return [];
  }
  return state.report.drifts.filter(function (drift) {
    return drift.direction === 'conflict' && !state.resolutions.has(drift.id);
  });
}

export function stagedPushCount(state: ResolutionState): number {
  return state.stagedPushIds.size;
}

export function pullPendingCount(state: ResolutionState): number {
  return pullDrifts(state).length;
}

export function driftIdsForStagedPush(state: ResolutionState): string[] {
  return Array.from(state.stagedPushIds);
}

export function checkedPushDriftIds(state: ResolutionState): string[] {
  const pending = pushDriftsPendingCommit(state);
  const ids: string[] = [];
  for (let i = 0; i < pending.length; i++) {
    if (state.checkedIds.has(pending[i].id)) {
      ids.push(pending[i].id);
    }
  }
  return ids;
}

export function allPendingPushDriftIds(state: ResolutionState): string[] {
  return pushDriftsPendingCommit(state).map(function (d) {
    return d.id;
  });
}

export function buildResolutionsForDriftIds(
  state: ResolutionState,
  driftIds: string[],
): Record<string, ResolutionChoice> {
  if (state.report === null) {
    return resolutionsRecord(state);
  }
  return resolutionsForBulkPush(state.report, resolutionsRecord(state), driftIds);
}
