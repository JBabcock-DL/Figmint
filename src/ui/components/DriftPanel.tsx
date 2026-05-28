import type { Dispatch } from 'react';

import { ConflictResolver } from '@/ui/components/ConflictResolver';
import { DriftList, DriftSummaryBadge } from '@/ui/components/DriftList';
import {
  canBulkPull,
  canBulkPush,
  filteredDrifts,
} from '@/ui/drift/resolutionSelectors';
import type { ResolutionReducerAction, ResolutionState } from '@/ui/drift/resolutionReducer';

export interface DriftPanelProps {
  state: ResolutionState;
  dispatch: Dispatch<ResolutionReducerAction>;
  onDetect: () => void;
  onBulkPush?: () => void;
  onBulkPull?: () => void;
  busy?: boolean;
}

export function DriftPanel(props: DriftPanelProps) {
  const drifts = filteredDrifts(props.state);

  return (
    <section aria-label="Drift resolution" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ alignItems: 'center', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
        <DriftSummaryBadge summary={props.state.report !== null ? props.state.report.summary : null} />
        <button
          type="button"
          disabled={props.state.loading}
          onClick={props.onDetect}
          style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px' }}
        >
          {props.state.loading ? 'Detecting…' : 'Detect drift'}
        </button>
      </div>

      {props.state.error ? (
        <p role="alert" style={{ color: '#8a1f1f', fontSize: '11px', margin: 0 }}>
          {props.state.error}
        </p>
      ) : null}

      {props.state.report !== null ? (
        <>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={!canBulkPush(props.state) || props.busy === true}
              onClick={props.onBulkPush}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Push selected → PR
            </button>
            <button
              type="button"
              disabled={!canBulkPull(props.state) || props.busy === true}
              onClick={props.onBulkPull}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Pull selected → apply
            </button>
          </div>
          <DriftList
            drifts={drifts}
            filter={props.state.filter}
            selectedIds={props.state.selectedIds}
            resolutions={props.state.resolutions}
            openConflictId={props.state.openConflictId}
            onFilterChange={function (filter) {
              props.dispatch({ type: 'filter/set', filter: filter });
            }}
            onToggleSelect={function (driftId) {
              props.dispatch({ type: 'row/toggle', driftId: driftId });
            }}
            onRowAction={function (driftId, action) {
              props.dispatch({
                type: 'row/resolve',
                driftId: driftId,
                choice: { type: action },
              });
            }}
            onOpenConflict={function (driftId) {
              props.dispatch({ type: 'conflict/open', driftId: driftId });
            }}
            renderConflictResolver={function (drift) {
              return (
                <ConflictResolver
                  drift={drift}
                  onKeepFigma={function () {
                    props.dispatch({
                      type: 'row/resolve',
                      driftId: drift.id,
                      choice: { type: 'push' },
                    });
                  }}
                  onKeepRepo={function () {
                    props.dispatch({
                      type: 'row/resolve',
                      driftId: drift.id,
                      choice: { type: 'pull' },
                    });
                  }}
                  onSkip={function () {
                    props.dispatch({
                      type: 'row/resolve',
                      driftId: drift.id,
                      choice: { type: 'skip' },
                    });
                  }}
                  onClose={function () {
                    props.dispatch({ type: 'conflict/close' });
                  }}
                />
              );
            }}
          />
        </>
      ) : (
        <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>
          Run detect to compare Figma, repo, and canvas snapshot.
        </p>
      )}
    </section>
  );
}
