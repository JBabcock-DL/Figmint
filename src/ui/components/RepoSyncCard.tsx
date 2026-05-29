import { useReducer, useState } from 'react';

import type { ComponentSpecV1, TokensV1 } from '@detroitlabs/fighub-contracts';

import { SyncChangesPanel } from '@/ui/components/SyncChangesPanel';
import { formatRepoDisplay } from '@/ui/github/formatRepoDisplay';
import { requestDriftReport } from '@/ui/drift/loadDriftReport';
import {
  requestBulkPush,
  requestSinglePull,
} from '@/ui/drift/resolutionActions';
import {
  createInitialResolutionState,
  reduceResolution,
} from '@/ui/drift/resolutionReducer';
import {
  buildResolutionsForDriftIds,
  driftIdsForStagedPush,
  pullPendingCount,
  stagedPushCount,
} from '@/ui/drift/resolutionSelectors';
import type { RepoTokensWireFormat } from '@/io/sources/adapters/serializeTokensWire';
import type { UseRepoSyncResult } from '@/ui/sync/useRepoSync';

const syncButtonStyle = {
  fontSize: '11px',
  fontWeight: 600,
  minHeight: 44,
  minWidth: 44,
  padding: '8px 12px',
  position: 'relative' as const,
} as const;

function badgeStyle(count: number): { display: string } | { display: 'none' } {
  if (count <= 0) {
    return { display: 'none' };
  }
  return { display: 'inline-flex' };
}

function formatRelativeTime(iso: string | null): string {
  if (iso === null || iso.length === 0) {
    return 'Never';
  }
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return 'Unknown';
  }
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return String(diffMin) + ' minute' + (diffMin === 1 ? '' : 's') + ' ago';
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 48) {
    return String(diffHr) + ' hour' + (diffHr === 1 ? '' : 's') + ' ago';
  }
  const diffDay = Math.floor(diffHr / 24);
  return String(diffDay) + ' day' + (diffDay === 1 ? '' : 's') + ' ago';
}

export interface RepoSyncCardProps {
  repoUrl: string;
  connected: boolean;
  sync: UseRepoSyncResult;
  repoTokens?: TokensV1;
  repoTokensWireFormat?: RepoTokensWireFormat;
  repoSpecs?: { name: string; spec: ComponentSpecV1 }[];
  onConnect?: () => void;
  onDisconnect?: () => void;
  /** Reload repo tokens after Fetch (before drift detect). Returns fresh tokens for detect. */
  onAfterFetch?: () => Promise<TokensV1 | null>;
}

export function RepoSyncCard(props: RepoSyncCardProps) {
  const [state, dispatch] = useReducer(reduceResolution, undefined, createInitialResolutionState);
  const [syncBusy, setSyncBusy] = useState(false);
  const [driftPushPrUrl, setDriftPushPrUrl] = useState<string | null>(null);
  const [pushNotice, setPushNotice] = useState<string | null>(null);

  const tokensPath =
    props.sync.resolvedConfig !== null ? props.sync.resolvedConfig.tokensPath : 'design/tokens.json';
  const specsPath =
    props.sync.resolvedConfig !== null ? props.sync.resolvedConfig.specsPath : 'components/';

  const lastSynced = props.sync.lastFetchedAt;
  const stagedCount = stagedPushCount(state);
  const pullCount = pullPendingCount(state);
  const repoFetchBusy = props.sync.fetching;
  const busy = syncBusy || repoFetchBusy;

  function runDetect(repoTokensOverride?: TokensV1) {
    if (!props.connected) {
      dispatch({ type: 'detect/error', message: 'Connect GitHub first.' });
      return;
    }
    const repoTokens =
      repoTokensOverride !== undefined ? repoTokensOverride : props.repoTokens;
    if (repoTokens === undefined) {
      dispatch({
        type: 'detect/error',
        message: 'Fetch latest first to load repo tokens for drift detection.',
      });
      return;
    }
    dispatch({ type: 'detect/start' });
    void requestDriftReport({
      repoUrl: props.repoUrl,
      repoTokens: repoTokens,
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

  async function handleFetch() {
    if (!props.connected) {
      return;
    }
    await props.sync.fetchRepo();
    let freshTokens: TokensV1 | null = null;
    if (props.onAfterFetch !== undefined) {
      freshTokens = await props.onAfterFetch();
    }
    runDetect(freshTokens !== null ? freshTokens : props.repoTokens);
  }

  function handlePush() {
    if (syncBusy || state.report === null || props.repoTokens === undefined) {
      return;
    }
    const driftIds = driftIdsForStagedPush(state);
    if (driftIds.length === 0) {
      dispatch({
        type: 'detect/error',
        message: 'Commit changes in the push list first, then Push.',
      });
      return;
    }
    setSyncBusy(true);
    setPushNotice(null);
    void requestBulkPush({
      repoUrl: props.repoUrl,
      report: state.report,
      driftIds: driftIds,
      resolutions: buildResolutionsForDriftIds(state, driftIds),
      repoTokens: props.repoTokens,
      tokensPath: tokensPath,
      specsPath: specsPath,
      repoSpecs: props.repoSpecs,
      tokensWireFormat: props.repoTokensWireFormat ?? 'dtcg',
    })
      .then(function (result) {
        setSyncBusy(false);
        if (result.ok) {
          setDriftPushPrUrl(result.prUrl);
          if (result.warning !== undefined && result.warning.length > 0) {
            setPushNotice(result.warning);
          }
          dispatch({ type: 'staging/clear-after-push', driftIds: driftIds });
          runDetect();
          return;
        }
        dispatch({ type: 'detect/error', message: result.error });
      })
      .catch(function (error: unknown) {
        setSyncBusy(false);
        const message = error instanceof Error ? error.message : String(error);
        dispatch({ type: 'detect/error', message: message });
      });
  }

  function handleAcceptPull(driftId: string) {
    if (syncBusy || state.report === null) {
      return;
    }
    setSyncBusy(true);
    const resolutions = buildResolutionsForDriftIds(state, [driftId]);
    void requestSinglePull({
      report: state.report,
      driftId: driftId,
      resolutions: resolutions,
      repoSpecs: props.repoSpecs,
    })
      .then(function (result) {
        setSyncBusy(false);
        if (result.ok) {
          dispatch({ type: 'pull/deny', driftId: driftId });
          runDetect();
          return;
        }
        dispatch({ type: 'detect/error', message: result.error });
      })
      .catch(function (error: unknown) {
        setSyncBusy(false);
        const message = error instanceof Error ? error.message : String(error);
        dispatch({ type: 'detect/error', message: message });
      });
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '10px' }}>
      <div
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '13px', margin: '0 0 4px' }}>{formatRepoDisplay(props.repoUrl)}</h2>
          <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>
            Last synced: {formatRelativeTime(lastSynced)}
            {state.loading ? ' · Detecting…' : null}
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button
            type="button"
            disabled={!props.connected || busy}
            onClick={function () {
              void handleFetch();
            }}
            style={syncButtonStyle}
          >
            {repoFetchBusy ? 'Fetching…' : 'Fetch latest'}
          </button>
          <button
            type="button"
            disabled={!props.connected || busy || stagedCount === 0}
            onClick={handlePush}
            style={syncButtonStyle}
            aria-label={'Push committed changes (' + String(stagedCount) + ')'}
          >
            Push
            <span
              aria-hidden={stagedCount === 0}
              style={{
                alignItems: 'center',
                background: '#111',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                justifyContent: 'center',
                marginLeft: '6px',
                minWidth: '18px',
                padding: '2px 6px',
                ...badgeStyle(stagedCount),
              }}
            >
              {String(stagedCount)}
            </span>
          </button>
          <button
            type="button"
            disabled={!props.connected || busy || pullCount === 0}
            onClick={function () {
              dispatch({ type: 'pull/panel-open' });
            }}
            style={syncButtonStyle}
            aria-label={'Review pulls from repo (' + String(pullCount) + ')'}
          >
            Pull
            <span
              aria-hidden={pullCount === 0}
              style={{
                alignItems: 'center',
                background: '#111',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                justifyContent: 'center',
                marginLeft: '6px',
                minWidth: '18px',
                padding: '2px 6px',
                ...badgeStyle(pullCount),
              }}
            >
              {String(pullCount)}
            </span>
          </button>
        </div>
      </div>

      {props.sync.configWarning !== null && props.sync.configWarning.length > 0 ? (
        <div
          role="status"
          style={{
            background: '#fff8e6',
            border: '1px solid #e6c200',
            borderRadius: '6px',
            color: '#5c4a00',
            fontSize: '11px',
            marginBottom: '8px',
            padding: '8px 10px',
          }}
        >
          {props.sync.configWarning} — using default paths.
        </div>
      ) : null}

      {props.sync.error !== null && props.sync.error.length > 0 ? (
        <p role="alert" style={{ color: '#8a1f1f', fontSize: '11px', margin: '0 0 8px' }}>
          {props.sync.error}
        </p>
      ) : null}

      {driftPushPrUrl !== null ? (
        <p role="status" style={{ color: '#333', fontSize: '11px', margin: '0 0 8px' }}>
          PR opened:{' '}
          <a href={driftPushPrUrl} target="_blank" rel="noreferrer">
            {driftPushPrUrl}
          </a>
        </p>
      ) : props.sync.pushPrUrl !== null ? (
        <p role="status" style={{ color: '#333', fontSize: '11px', margin: '0 0 8px' }}>
          PR opened:{' '}
          <a href={props.sync.pushPrUrl} target="_blank" rel="noreferrer">
            {props.sync.pushPrUrl}
          </a>
        </p>
      ) : null}
      {pushNotice !== null ? (
        <p role="status" style={{ color: '#5c4a00', fontSize: '11px', margin: '0 0 8px' }}>
          {pushNotice}
        </p>
      ) : null}

      <p style={{ color: '#767676', fontSize: '10px', margin: '0 0 4px' }}>
        Fetch loads repo + Figma drift. Check changes to push → <strong>Commit</strong> →{' '}
        <strong>Push</strong> opens one PR. Tap <strong>Pull</strong> to review repo → Figma changes.
      </p>
      <p style={{ color: '#767676', fontSize: '10px', margin: '0 0 10px' }}>
        Paths: tokens <code>{tokensPath}</code>, specs <code>{specsPath}</code>
      </p>

      <SyncChangesPanel
        state={state}
        dispatch={dispatch}
        busy={syncBusy}
        onAcceptPull={handleAcceptPull}
      />
      {syncBusy ? (
        <p role="status" style={{ color: '#666', fontSize: '10px', margin: '8px 0 0' }}>
          Applying…
        </p>
      ) : null}
    </div>
  );
}
