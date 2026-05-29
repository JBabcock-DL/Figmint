import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';

import type { ResolutionChoice } from '@/io/messages/drift';

export interface ResolutionState {
  report: DriftReportV1 | null;
  /** Checkbox selection in the push accordion (pre-commit). */
  checkedIds: Set<string>;
  /** Committed for push — included when Push (badge) is clicked. */
  stagedPushIds: Set<string>;
  /** Pull rows dismissed until the next fetch/detect. */
  deniedPullIds: Set<string>;
  resolutions: Map<string, ResolutionChoice>;
  loading: boolean;
  error: string | null;
  openConflictId: string | null;
  pullPanelOpen: boolean;
}

export type ResolutionReducerAction =
  | { type: 'report/loaded'; report: DriftReportV1 }
  | { type: 'checkbox/toggle'; driftId: string }
  | { type: 'checkbox/select-all'; driftIds: string[] }
  | { type: 'checkbox/clear' }
  | { type: 'staging/commit-push'; driftIds: string[] }
  | { type: 'staging/clear-after-push'; driftIds: string[] }
  | { type: 'row/resolve'; driftId: string; choice: ResolutionChoice }
  | { type: 'detect/start' }
  | { type: 'detect/error'; message: string }
  | { type: 'conflict/open'; driftId: string }
  | { type: 'conflict/close' }
  | { type: 'pull/panel-open' }
  | { type: 'pull/panel-close' }
  | { type: 'pull/deny'; driftId: string };

export function createInitialResolutionState(): ResolutionState {
  return {
    report: null,
    checkedIds: new Set<string>(),
    stagedPushIds: new Set<string>(),
    deniedPullIds: new Set<string>(),
    resolutions: new Map<string, ResolutionChoice>(),
    loading: false,
    error: null,
    openConflictId: null,
    pullPanelOpen: false,
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
        checkedIds: new Set<string>(),
        stagedPushIds: new Set<string>(),
        deniedPullIds: new Set<string>(),
        resolutions: new Map<string, ResolutionChoice>(),
        loading: false,
        error: null,
        openConflictId: null,
        pullPanelOpen: false,
      };
    case 'checkbox/toggle': {
      const checkedIds = cloneSet(state.checkedIds);
      if (checkedIds.has(action.driftId)) {
        checkedIds.delete(action.driftId);
      } else {
        checkedIds.add(action.driftId);
      }
      return Object.assign({}, state, { checkedIds: checkedIds });
    }
    case 'checkbox/select-all':
      return Object.assign({}, state, { checkedIds: new Set(action.driftIds) });
    case 'checkbox/clear':
      return Object.assign({}, state, { checkedIds: new Set<string>() });
    case 'staging/commit-push': {
      const stagedPushIds = cloneSet(state.stagedPushIds);
      for (let i = 0; i < action.driftIds.length; i++) {
        stagedPushIds.add(action.driftIds[i]);
      }
      return Object.assign({}, state, {
        stagedPushIds: stagedPushIds,
        checkedIds: new Set<string>(),
      });
    }
    case 'staging/clear-after-push': {
      const stagedPushIds = cloneSet(state.stagedPushIds);
      for (let i = 0; i < action.driftIds.length; i++) {
        stagedPushIds.delete(action.driftIds[i]);
      }
      return Object.assign({}, state, { stagedPushIds: stagedPushIds });
    }
    case 'row/resolve': {
      const resolutions = cloneMap(state.resolutions);
      resolutions.set(action.driftId, action.choice);
      return Object.assign({}, state, { resolutions: resolutions, openConflictId: null });
    }
    case 'detect/start':
      return Object.assign({}, state, { loading: true, error: null });
    case 'detect/error':
      return Object.assign({}, state, { loading: false, error: action.message });
    case 'conflict/open':
      return Object.assign({}, state, { openConflictId: action.driftId });
    case 'conflict/close':
      return Object.assign({}, state, { openConflictId: null });
    case 'pull/panel-open':
      return Object.assign({}, state, { pullPanelOpen: true });
    case 'pull/panel-close':
      return Object.assign({}, state, { pullPanelOpen: false });
    case 'pull/deny': {
      const deniedPullIds = cloneSet(state.deniedPullIds);
      deniedPullIds.add(action.driftId);
      return Object.assign({}, state, { deniedPullIds: deniedPullIds });
    }
    default:
      return state;
  }
}
