import { useCallback, useEffect, useMemo, useReducer } from 'react';

import type { TokensV1 } from '@detroitlabs/figmint-contracts';

import { adapt } from '@/io/sources/adapters';
import type { FormatError } from '@/io/sources/adapters';
import {
  isBootstrapErrorMessage,
  isBootstrapProgressMessage,
  isBootstrapResultMessage,
} from '@/io/messages/bootstrap';
import { isAdaptedTokensV1 } from '@/io/messages/push';
import type { LoadedDocument, ValidationError } from '@/io/sources/types';
import { BENCH_FIXTURE_OPTIONS, loadBenchFixture, type BenchFixtureId } from '@/ui/benchFixtures';
import {
  countCompletedSteps,
  createInitialBootstrapProgressState,
  reduceBootstrapProgress,
} from '@/ui/bootstrap/bootstrapProgressReducer';
import { AuditPanel } from '@/ui/components/AuditPanel';
import { BootstrapStepList } from '@/ui/components/BootstrapStepList';
import { ProgressBar } from '@/ui/components/ProgressBar';
import { ClipboardBanner, useClipboardSources } from '@/ui/sources/ClipboardBanner';
import { SourceDropZone, SourceFilePicker } from '@/ui/sources/SourceFilePicker';
import { SourcePasteTextarea } from '@/ui/sources/SourcePasteTextarea';

type SourceResult = LoadedDocument | ValidationError;

function isTokenDocument(doc: LoadedDocument): boolean {
  return doc.kind === 'tokens-dtcg' || doc.kind === 'tokens-legacy';
}

function formatResult(result: SourceResult): string {
  if ('payload' in result) {
    return `Loaded ${result.kind} via ${result.sourceMeta.port}`;
  }
  return result.message;
}

function formatAdaptError(error: FormatError): string {
  let message = error.message;
  if (error.path) {
    message = `${message} (${error.path})`;
  }
  if (message.includes('Unknown top-level DTCG group')) {
    message = `${message} — Figmint expects either five collection roots (primitives, theme, …) or a generic palette where groups like color live at the top level (wrapped into primitives automatically). Try **Load bench fixture** for a known-good sample.`;
  }
  return message;
}

function countTokensByCollection(tokens: TokensV1): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const token of tokens.tokens) {
    const collection = token.collection;
    counts[collection] = (counts[collection] ?? 0) + 1;
  }
  return counts;
}

export function Bootstrap() {
  const [lastResult, setLastResult] = useReducer(
    function (_prev: SourceResult | null, next: SourceResult | null) {
      return next;
    },
    null as SourceResult | null,
  );
  const [cachedTokens, setCachedTokens] = useReducer(
    function (_prev: TokensV1 | null, next: TokensV1 | null) {
      return next;
    },
    null as TokensV1 | null,
  );
  const [adaptError, setAdaptError] = useReducer(
    function (_prev: string | null, next: string | null) {
      return next;
    },
    null as string | null,
  );
  const [progressState, dispatchProgress] = useReducer(
    reduceBootstrapProgress,
    undefined,
    createInitialBootstrapProgressState,
  );
  const [showAudit, setShowAudit] = useReducer(function (_prev: boolean, next: boolean) {
    return next;
  }, false);
  const [benchFixtureId, setBenchFixtureId] = useReducer(function (
    _prev: BenchFixtureId,
    next: BenchFixtureId,
  ) {
    return next;
  }, 'foundations-minimal' as BenchFixtureId);

  const applyLoadedDocument = useCallback(function (doc: LoadedDocument) {
    setLastResult(doc);
    setShowAudit(false);
    dispatchProgress({ type: 'bootstrap/reset' });

    if (!isTokenDocument(doc)) {
      setCachedTokens(null);
      setAdaptError(null);
      return;
    }

    const adapted = adapt(doc.payload);
    if (isAdaptedTokensV1(adapted)) {
      setCachedTokens(adapted);
      setAdaptError(null);
      console.debug('[ui] adapt ok', {
        collections: adapted.collections.length,
        tokens: adapted.tokens.length,
      });
    } else {
      setCachedTokens(null);
      setAdaptError(formatAdaptError(adapted));
    }
  }, []);

  const handleSourceResult = useCallback(
    function (result: SourceResult) {
      if ('payload' in result) {
        applyLoadedDocument(result);
      } else {
        setLastResult(result);
        setCachedTokens(null);
        setAdaptError(null);
        dispatchProgress({ type: 'bootstrap/reset' });
        setShowAudit(false);
      }
    },
    [applyLoadedDocument],
  );

  const handleLoadBenchFixture = useCallback(
    function () {
      const doc = loadBenchFixture(benchFixtureId);
      applyLoadedDocument(doc);
    },
    [applyLoadedDocument, benchFixtureId],
  );

  const handleBootstrap = useCallback(
    function () {
      if (!cachedTokens || progressState.running) {
        return;
      }
      dispatchProgress({ type: 'bootstrap/start' });
      setShowAudit(true);
      parent.postMessage(
        {
          pluginMessage: {
            type: 'bootstrap/run',
            tokens: cachedTokens,
          },
        },
        '*',
      );
    },
    [cachedTokens, progressState.running],
  );

  useEffect(function () {
    const readPluginMessage = function (data: unknown): unknown {
      if (typeof data !== 'object' || data === null || !('pluginMessage' in data)) {
        return undefined;
      }
      const record = data as Record<'pluginMessage', unknown>;
      return record.pluginMessage;
    };

    const onPluginMessage = function (event: MessageEvent) {
      const pluginMessage = readPluginMessage(event.data);
      if (isBootstrapProgressMessage(pluginMessage)) {
        dispatchProgress(pluginMessage);
        if (pluginMessage.audit !== undefined) {
          setShowAudit(true);
        }
        return;
      }
      if (isBootstrapResultMessage(pluginMessage)) {
        dispatchProgress(pluginMessage);
        setShowAudit(true);
        console.debug('[ui] bootstrap/result', String(pluginMessage.totalDurationMs) + 'ms');
        return;
      }
      if (isBootstrapErrorMessage(pluginMessage)) {
        dispatchProgress(pluginMessage);
      }
    };

    window.addEventListener('message', onPluginMessage);
    return function () {
      window.removeEventListener('message', onPluginMessage);
    };
  }, []);

  const { bannerDoc, dismissBanner, acceptBanner } = useClipboardSources(function (doc) {
    applyLoadedDocument(doc);
  });

  const canBootstrap = cachedTokens !== null && adaptError === null && !progressState.running;

  const collectionCounts = useMemo(
    function () {
      if (!cachedTokens) {
        return null;
      }
      return countTokensByCollection(cachedTokens);
    },
    [cachedTokens],
  );

  const completedSteps = countCompletedSteps(progressState.steps);
  const progressMax = progressState.steps.length;

  const wireFormat = lastResult !== null && 'payload' in lastResult ? lastResult.kind : null;

  const showDevBench = import.meta.env.DEV;

  return (
    <>
      <section aria-label="Sources">
        <h2 style={{ fontSize: '13px', margin: '0 0 8px' }}>Sources</h2>

        {bannerDoc ? (
          <ClipboardBanner doc={bannerDoc} onLoad={acceptBanner} onDismiss={dismissBanner} />
        ) : null}

        <SourcePasteTextarea onLoad={handleSourceResult} />
        <SourceFilePicker onLoad={handleSourceResult} />
        <SourceDropZone onLoad={handleSourceResult} />

        {showDevBench ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            <label style={{ fontSize: '11px' }}>
              Bench fixture{' '}
              <select
                value={benchFixtureId}
                onChange={function (event) {
                  setBenchFixtureId(event.target.value as BenchFixtureId);
                }}
                style={{ fontSize: '11px' }}
              >
                {BENCH_FIXTURE_OPTIONS.map(function (option) {
                  return (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  );
                })}
              </select>
            </label>
            <button
              type="button"
              onClick={handleLoadBenchFixture}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Load bench fixture
            </button>
          </div>
        ) : null}

        {lastResult ? (
          <p
            role="status"
            style={{
              color: 'payload' in lastResult ? '#0a6b0a' : '#b00020',
              fontSize: '11px',
              margin: 0,
            }}
          >
            {formatResult(lastResult)}
          </p>
        ) : null}

        {adaptError ? (
          <p role="alert" style={{ color: '#b00020', fontSize: '11px', margin: 0 }}>
            Adapt failed: {adaptError}
          </p>
        ) : null}
      </section>

      <section aria-label="Token preview">
        <h2 style={{ fontSize: '13px', margin: '0 0 8px' }}>Preview</h2>
        {!cachedTokens ? (
          <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>
            Load tokens via paste, file, or clipboard to preview collections and modes.
          </p>
        ) : (
          <div style={{ fontSize: '11px' }}>
            <p style={{ margin: '0 0 6px' }}>
              Format: <strong>{wireFormat}</strong> · {cachedTokens.collections.length} collections
              · {cachedTokens.tokens.length} tokens
            </p>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              {cachedTokens.collections.map(function (collection) {
                const count = collectionCounts?.[collection.id] ?? 0;
                return (
                  <li key={collection.id}>
                    <strong>{collection.id}</strong> — {String(count)} tokens · modes:{' '}
                    {collection.modes.join(', ')}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section aria-label="Bootstrap">
        <h2 style={{ fontSize: '13px', margin: '0 0 8px' }}>Bootstrap</h2>
        <button
          type="button"
          disabled={!canBootstrap}
          onClick={handleBootstrap}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            opacity: canBootstrap ? 1 : 0.5,
            padding: '8px 12px',
          }}
        >
          Bootstrap design system
        </button>

        {progressState.running || progressState.result !== null ? (
          <div style={{ marginTop: '10px' }}>
            <ProgressBar value={completedSteps} max={progressMax} label="Bootstrap progress" />
            <div style={{ marginTop: '8px' }}>
              <BootstrapStepList steps={progressState.steps} />
            </div>
          </div>
        ) : null}

        {progressState.error ? (
          <p role="alert" style={{ color: '#b00020', fontSize: '11px', margin: '8px 0 0' }}>
            {progressState.error}
          </p>
        ) : null}

        {progressState.result ? (
          <p role="status" style={{ color: '#0a3d6b', fontSize: '11px', margin: '8px 0 0' }}>
            Finished in {String(progressState.result.totalDurationMs)} ms ·{' '}
            {progressState.result.ok ? 'success' : 'completed with errors'}
          </p>
        ) : null}
      </section>

      {showAudit && progressState.audits.length > 0 ? (
        <AuditPanel
          audits={progressState.audits}
          onDismiss={function () {
            setShowAudit(false);
          }}
        />
      ) : null}
    </>
  );
}
