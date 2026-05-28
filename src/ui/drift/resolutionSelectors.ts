import type { DriftEntry } from '@detroitlabs/fighub-contracts';

import type { DriftFilter, ResolutionState } from './resolutionReducer';

function getDrift(state: ResolutionState, driftId: string): DriftEntry | null {
  if (state.report === null) {
    return null;
  }
  for (let i = 0; i < state.report.drifts.length; i++) {
    if (state.report.drifts[i].id === driftId) {
      return state.report.drifts[i];
    }
  }
  return null;
}

function hasUnresolvedConflictInSelection(state: ResolutionState): boolean {
  for (const driftId of state.selectedIds) {
    const drift = getDrift(state, driftId);
    if (drift !== null && drift.direction === 'conflict' && !state.resolutions.has(driftId)) {
      return true;
    }
  }
  return false;
}

export function filteredDrifts(state: ResolutionState): DriftEntry[] {
  if (state.report === null) {
    return [];
  }
  if (state.filter === 'all') {
    return state.report.drifts.slice();
  }
  return state.report.drifts.filter(function (entry) {
    return entry.direction === state.filter;
  });
}

export function unresolvedConflictSelected(state: ResolutionState): boolean {
  return hasUnresolvedConflictInSelection(state);
}

export function canBulkPush(state: ResolutionState): boolean {
  if (state.selectedIds.size === 0 || hasUnresolvedConflictInSelection(state)) {
    return false;
  }
  for (const driftId of state.selectedIds) {
    const drift = getDrift(state, driftId);
    if (drift === null) {
      continue;
    }
    if (drift.direction === 'push') {
      return true;
    }
    if (drift.direction === 'conflict') {
      const choice = state.resolutions.get(driftId);
      if (choice !== undefined && choice.type === 'push') {
        return true;
      }
    }
  }
  return false;
}

export function canBulkPull(state: ResolutionState): boolean {
  if (state.selectedIds.size === 0 || hasUnresolvedConflictInSelection(state)) {
    return false;
  }
  for (const driftId of state.selectedIds) {
    const drift = getDrift(state, driftId);
    if (drift === null) {
      continue;
    }
    if (drift.direction === 'pull') {
      return true;
    }
    if (drift.direction === 'conflict') {
      const choice = state.resolutions.get(driftId);
      if (choice !== undefined && choice.type === 'pull') {
        return true;
      }
    }
  }
  return false;
}
