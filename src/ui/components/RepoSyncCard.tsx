import { useReducer, useState } from 'react';

import type { ComponentSpecV1, TokensV1 } from '@detroitlabs/fighub-contracts';

import { DriftPanel } from '@/ui/components/DriftPanel';
import { formatRepoDisplay } from '@/ui/github/formatRepoDisplay';
import { requestDriftReport } from '@/ui/drift/loadDriftReport';
import { requestBulkPull, requestBulkPush } from '@/ui/drift/resolutionActions';
import {
  createInitialResolutionState,
  reduceResolution,
} from '@/ui/drift/resolutionReducer';

const DEFAULT_SPECS_PATH = 'components/';

export interface RepoSyncCardProps {
  repoUrl: string;
  tokensPath: string;
  connected: boolean;
  repoTokens?: TokensV1;
  specsPath?: string;
  repoSpecs?: Array<{ name: string; spec: ComponentSpecV1 }>;
}

export function RepoSyncCard(props: RepoSyncCardProps) {
  const [state, dispatch] = useReducer(reduceResolution, undefined, createInitialResolutionState);
  const [bulkBusy, setBulkBusy] = useState(false);
  const specsPath =
    props.specsPath !== undefined && props.specsPath.length > 0 ? props.specsPath : DEFAULT_SPECS_PATH;

  function runDetect() {
    if (!props.connected || props.repoTokens === undefined) {
      dispatch({ type: 'detect/error', message: 'Connect GitHub and load repo tokens first.' });
      return;
    }
    dispatch({ type: 'detect/start' });
    void requestDriftReport({
      repoUrl: props.repoUrl,
      repoTokens: props.repoTokens,
      repoSpecs: props.repoSpecs !== undefined ? props.repoSpecs : [],
    })
      .then(function (report) {
        dispatch({ type: 'report/loaded', report: report });
      })
      .catch(function (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        dispatch({ type: 'detect/error', message: message });
      });
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '10px' }}>
      <h2 style={{ fontSize: '13px', margin: '0 0 8px' }}>Repository sync</h2>
      <p style={{ color: '#666', fontSize: '11px', margin: '0 0 8px' }}>
        {formatRepoDisplay(props.repoUrl)} · tokens at <code>{props.tokensPath}</code>
      </p>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button type="button" disabled style={{ fontSize: '11px', padding: '4px 10px' }}>
          Fetch
        </button>
        <button type="button" disabled style={{ fontSize: '11px', padding: '4px 10px' }}>
          Pull
        </button>
        <button type="button" disabled style={{ fontSize: '11px', padding: '4px 10px' }}>
          Push
        </button>
      </div>
      <p style={{ color: '#888', fontSize: '10px', margin: '0 0 10px' }}>
        Fetch/Pull/Push ship in WO-058 Phase 2. Drift detection and bulk resolution are available now.
      </p>
      <DriftPanel
        state={state}
        dispatch={dispatch}
        busy={bulkBusy}
        onDetect={runDetect}
        onBulkPush={function () {
          if (bulkBusy || state.report === null || props.repoTokens === undefined) {
            return;
          }
          setBulkBusy(true);
          void requestBulkPush({
            repoUrl: props.repoUrl,
            report: state.report,
            state: state,
            repoTokens: props.repoTokens,
            tokensPath: props.tokensPath,
            specsPath: specsPath,
            repoSpecs: props.repoSpecs,
          })
            .then(function (result) {
              setBulkBusy(false);
              if (result.ok) {
                runDetect();
                return;
              }
              dispatch({ type: 'detect/error', message: result.error });
            })
            .catch(function (error: unknown) {
              setBulkBusy(false);
              const message = error instanceof Error ? error.message : String(error);
              dispatch({ type: 'detect/error', message: message });
            });
        }}
        onBulkPull={function () {
          if (bulkBusy || state.report === null) {
            return;
          }
          setBulkBusy(true);
          void requestBulkPull({
            report: state.report,
            state: state,
            repoSpecs: props.repoSpecs,
          })
            .then(function (result) {
              setBulkBusy(false);
              if (result.ok) {
                runDetect();
                return;
              }
              dispatch({ type: 'detect/error', message: result.error });
            })
            .catch(function (error: unknown) {
              setBulkBusy(false);
              const message = error instanceof Error ? error.message : String(error);
              dispatch({ type: 'detect/error', message: message });
            });
        }}
      />
      {bulkBusy ? (
        <p role="status" style={{ color: '#666', fontSize: '10px', margin: '8px 0 0' }}>
          Applying resolution…
        </p>
      ) : null}
    </div>
  );
}
