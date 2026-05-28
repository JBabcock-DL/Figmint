import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

import type { ResolutionChoice } from '@/io/messages/drift';

export type DriftFilter = 'all' | 'push' | 'pull' | 'conflict';

export interface ResolutionState {
  report: DriftReportV1 | null;
  filter: DriftFilter;
  selectedIds: Set<string>;
  resolutions: Map<string, ResolutionChoice>;
  loading: boolean;
  error: string | null;
  openConflictId: string | null;
}

export type ResolutionReducerAction =
  | { type: 'report/loaded'; report: DriftReportV1 }
  | { type: 'filter/set'; filter: DriftFilter }
  | { type: 'row/toggle'; driftId: string }
  | { type: 'row/resolve'; driftId: string; choice: ResolutionChoice }
  | { type: 'bulk/select-direction'; direction: 'push' | 'pull' }
  | { type: 'detect/start' }
  | { type: 'detect/error'; message: string }
  | { type: 'conflict/open'; driftId: string }
  | { type: 'conflict/close' };

export function createInitialResolutionState(): ResolutionState {
  return {
    report: null,
    filter: 'all',
    selectedIds: new Set<string>(),
    resolutions: new Map<string, ResolutionChoice>(),
    loading: false,
    error: null,
    openConflictId: null,
  };
}

function cloneSet(source: Set<string>): Set<string> {
  return new Set(Array.from(source));
}

function cloneMap(source: Map<string, ResolutionChoice>): Map<string, ResolutionChoice> {
  return new Map(Array.from(source.entries()));
}

export function reduceResolution(
  state: ResolutionState,
  action: ResolutionReducerAction,
): ResolutionState {
  switch (action.type) {
    case 'report/loaded':
      return {
        report: action.report,
        filter: 'all',
        selectedIds: new Set<string>(),
        resolutions: new Map<string, ResolutionChoice>(),
        loading: false,
        error: null,
        openConflictId: null,
      };
    case 'filter/set':
      return Object.assign({}, state, { filter: action.filter });
    case 'row/toggle': {
      const selectedIds = cloneSet(state.selectedIds);
      if (selectedIds.has(action.driftId)) {
        selectedIds.delete(action.driftId);
      } else {
        selectedIds.add(action.driftId);
      }
      return Object.assign({}, state, { selectedIds: selectedIds });
    }
    case 'row/resolve': {
      const resolutions = cloneMap(state.resolutions);
      resolutions.set(action.driftId, action.choice);
      return Object.assign({}, state, { resolutions: resolutions, openConflictId: null });
    }
    case 'bulk/select-direction': {
      if (state.report === null) {
        return state;
      }
      const selectedIds = new Set<string>();
      for (let i = 0; i < state.report.drifts.length; i++) {
        const drift = state.report.drifts[i];
        if (drift.direction === action.direction) {
          selectedIds.add(drift.id);
        }
      }
      return Object.assign({}, state, { selectedIds: selectedIds });
    }
    case 'detect/start':
      return Object.assign({}, state, { loading: true, error: null });
    case 'detect/error':
      return Object.assign({}, state, { loading: false, error: action.message });
    case 'conflict/open':
      return Object.assign({}, state, { openConflictId: action.driftId });
    case 'conflict/close':
      return Object.assign({}, state, { openConflictId: null });
    default:
      return state;
  }
}
