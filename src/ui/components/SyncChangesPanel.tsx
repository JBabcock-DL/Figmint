import type { Dispatch } from 'react';

import type { DriftEntry } from '@detroitlabs/fighub-contracts';

import { ConflictResolver } from '@/ui/components/ConflictResolver';
import type { ResolutionReducerAction, ResolutionState } from '@/ui/drift/resolutionReducer';
import {
  allPendingPushDriftIds,
  checkedPushDriftIds,
  conflictDrifts,
  pullDrifts,
  pullPendingCount,
  pushDriftsPendingCommit,
  stagedPushCount,
} from '@/ui/drift/resolutionSelectors';

const listStyle = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
} as const;

const rowStyle = {
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '8px',
  fontSize: '11px',
} as const;

const actionRowStyle = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
  marginTop: '8px',
} as const;

function DriftRowLabel(props: { drift: DriftEntry }) {
  return (
    <span>
      <strong>{props.drift.id}</strong>
      <span style={{ color: '#666', marginLeft: '6px' }}>{props.drift.kind}</span>
    </span>
  );
}

export interface SyncChangesPanelProps {
  state: ResolutionState;
  dispatch: Dispatch<ResolutionReducerAction>;
  busy?: boolean;
  onAcceptPull?: (driftId: string) => void;
}

export function SyncChangesPanel(props: SyncChangesPanelProps) {
  const pendingPush = pushDriftsPendingCommit(props.state);
  const stagedCount = stagedPushCount(props.state);
  const pullItems = pullDrifts(props.state);
  const pullCount = pullPendingCount(props.state);
  const conflicts = conflictDrifts(props.state);
  const checkedIds = props.state.checkedIds;
  const allPendingIds = allPendingPushDriftIds(props.state);
  const allChecked =
    pendingPush.length > 0 &&
    pendingPush.every(function (drift) {
      return checkedIds.has(drift.id);
    });

  if (props.state.report === null) {
    return (
      <p style={{ color: '#666', fontSize: '11px', margin: '8px 0 0' }}>
        Fetch latest to compare Figma with the repo and list changes here.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
      {props.state.error ? (
        <p role="alert" style={{ color: '#8a1f1f', fontSize: '11px', margin: 0 }}>
          {props.state.error}
        </p>
      ) : null}

      {conflicts.length > 0 ? (
        <details style={{ border: '1px solid #e6c200', borderRadius: '6px', padding: '8px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            Conflicts ({String(conflicts.length)}) — resolve before commit
          </summary>
          <ul style={{ ...listStyle, marginTop: '8px' }}>
            {conflicts.map(function (drift) {
              return (
                <li key={drift.id} style={rowStyle}>
                  <DriftRowLabel drift={drift} />
                  <div style={actionRowStyle}>
                    <button
                      type="button"
                      onClick={function () {
                        props.dispatch({ type: 'conflict/open', driftId: drift.id });
                      }}
                      style={{ fontSize: '10px', minHeight: '32px', padding: '4px 8px' }}
                    >
                      Resolve…
                    </button>
                  </div>
                  {props.state.openConflictId === drift.id ? (
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
                  ) : null}
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}

      <details
        open={pendingPush.length > 0 || stagedCount > 0}
        style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '8px' }}
      >
        <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
          Changes to push ({String(pendingPush.length)} pending
          {stagedCount > 0 ? ', ' + String(stagedCount) + ' committed' : ''})
        </summary>
        {pendingPush.length === 0 && stagedCount === 0 ? (
          <p style={{ color: '#767676', fontSize: '10px', margin: '8px 0 0' }}>Nothing to push.</p>
        ) : (
          <>
            {pendingPush.length > 0 ? (
              <>
                <label
                  style={{
                    alignItems: 'center',
                    display: 'flex',
                    fontSize: '11px',
                    gap: '8px',
                    marginTop: '8px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={function () {
                      if (allChecked) {
                        props.dispatch({ type: 'checkbox/clear' });
                      } else {
                        props.dispatch({ type: 'checkbox/select-all', driftIds: allPendingIds });
                      }
                    }}
                  />
                  Select all
                </label>
                <ul style={{ ...listStyle, marginTop: '6px' }}>
                  {pendingPush.map(function (drift) {
                    return (
                      <li key={drift.id} style={rowStyle}>
                        <label style={{ alignItems: 'flex-start', display: 'flex', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={checkedIds.has(drift.id)}
                            onChange={function () {
                              props.dispatch({ type: 'checkbox/toggle', driftId: drift.id });
                            }}
                          />
                          <DriftRowLabel drift={drift} />
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div style={actionRowStyle}>
                  <button
                    type="button"
                    disabled={checkedPushDriftIds(props.state).length === 0 || props.busy === true}
                    onClick={function () {
                      props.dispatch({
                        type: 'staging/commit-push',
                        driftIds: checkedPushDriftIds(props.state),
                      });
                    }}
                    style={{ fontSize: '11px', fontWeight: 600, padding: '6px 12px' }}
                  >
                    Commit
                  </button>
                  <button
                    type="button"
                    disabled={checkedIds.size === 0}
                    onClick={function () {
                      props.dispatch({ type: 'checkbox/clear' });
                    }}
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                  >
                    Clear
                  </button>
                </div>
              </>
            ) : null}
            {stagedCount > 0 ? (
              <p style={{ color: '#333', fontSize: '10px', margin: '8px 0 0' }}>
                {String(stagedCount)} change{stagedCount === 1 ? '' : 's'} committed — use{' '}
                <strong>Push</strong> above to open a PR.
              </p>
            ) : null}
          </>
        )}
      </details>

      <details
        open={props.state.pullPanelOpen && pullCount > 0}
        style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '8px' }}
      >
        <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
          Changes to pull ({String(pullCount)})
        </summary>
        {pullCount === 0 ? (
          <p style={{ color: '#767676', fontSize: '10px', margin: '8px 0 0' }}>
            No repo changes waiting. Tap <strong>Pull</strong> when the badge shows incoming
            changes.
          </p>
        ) : (
          <ul style={{ ...listStyle, marginTop: '8px' }}>
            {pullItems.map(function (drift) {
              return (
                <li key={drift.id} style={rowStyle}>
                  <DriftRowLabel drift={drift} />
                  <div style={actionRowStyle}>
                    <button
                      type="button"
                      disabled={props.busy === true}
                      onClick={function () {
                        if (props.onAcceptPull !== undefined) {
                          props.onAcceptPull(drift.id);
                        }
                      }}
                      style={{
                        fontSize: '10px',
                        minHeight: '32px',
                        padding: '4px 8px',
                        fontWeight: 600,
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={props.busy === true}
                      onClick={function () {
                        props.dispatch({ type: 'pull/deny', driftId: drift.id });
                      }}
                      style={{ fontSize: '10px', minHeight: '32px', padding: '4px 8px' }}
                    >
                      Deny
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </details>
    </div>
  );
}
