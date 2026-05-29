import { useCallback, useReducer } from 'react';

import type { SinkId } from '@/io/sinks/types';
import { availableSinks, canExport, isPathInputVisible } from '@/ui/export/availableSinks';
import { createInitialExportSheetState, reduceExportSheet } from '@/ui/export/exportSheetReducer';
import { runExport } from '@/ui/export/runExport';
import type { ContractDocument, ExportSheetProps } from '@/ui/export/types';

const SINK_LABELS: Record<SinkId, string> = {
  download: 'Download file(s)',
  clipboard: 'Copy markdown to clipboard',
  'output-page': 'Write to FigHub Output page',
  'plugin-data': 'Write to frame pluginData',
  'github-pr': 'Open GitHub PR',
};

function defaultTitle(kind: ContractDocument['kind']): string {
  switch (kind) {
    case 'drift-report':
      return 'Export drift report';
    case 'handoff-context':
      return 'Export handoff context';
    case 'ops-program':
      return 'Export ops program';
    case 'component-spec':
      return 'Export component spec';
    case 'registry':
      return 'Export registry';
    case 'tokens':
      return 'Export tokens';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function formatSinkLabel(sink: SinkId): string {
  return SINK_LABELS[sink];
}

function statusGlyph(ok: boolean): string {
  return ok ? '\u2713' : '\u2717';
}

export function ExportSheet({
  document,
  defaultSinks,
  title,
  onComplete,
  onCancel,
}: ExportSheetProps) {
  const [state, dispatch] = useReducer(
    reduceExportSheet,
    { document: document, defaultSinks: defaultSinks },
    function (init) {
      return createInitialExportSheetState(init.document, {
        defaultSinks: init.defaultSinks,
      });
    },
  );

  const sinksAvailable = availableSinks();
  const pathVisible = isPathInputVisible(state.sinks);
  const isRegistry = document.kind === 'registry';
  const heading = title ?? defaultTitle(document.kind);

  const handleExport = useCallback(
    async function () {
      if (!canExport(state)) {
        return;
      }
      await runExport(document, state, dispatch, {
        onComplete: onComplete,
      });
    },
    [document, state, onComplete],
  );

  const resultEntries =
    state.results === null
      ? []
      : (Object.keys(state.results.bySink) as SinkId[]).filter(function (sink) {
          return state.results!.bySink[sink] !== undefined;
        });

  return (
    <section
      aria-label={heading}
      style={{
        border: '1px solid #ddd',
        borderRadius: 6,
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        padding: 10,
      }}
    >
      <h2 style={{ fontSize: 13, margin: '0 0 8px' }}>{heading}</h2>

      <fieldset style={{ border: 'none', margin: '0 0 8px', padding: 0 }}>
        <legend style={{ fontSize: 11, marginBottom: 4 }}>Format</legend>
        <label style={{ display: 'block', marginBottom: 2 }}>
          <input
            type="checkbox"
            checked={state.formats.json}
            disabled={isRegistry}
            onChange={function () {
              dispatch({ type: 'toggle-format', format: 'json' });
            }}
          />{' '}
          JSON
        </label>
        {!isRegistry ? (
          <label style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={state.formats.md}
              onChange={function () {
                dispatch({ type: 'toggle-format', format: 'md' });
              }}
            />{' '}
            Markdown
          </label>
        ) : null}
      </fieldset>

      <fieldset style={{ border: 'none', margin: '0 0 8px', padding: 0 }}>
        <legend style={{ fontSize: 11, marginBottom: 4 }}>Destinations</legend>
        {sinksAvailable.map(function (sink) {
          return (
            <label key={sink} style={{ display: 'block', marginBottom: 2 }}>
              <input
                type="checkbox"
                checked={state.sinks[sink] === true}
                onChange={function () {
                  dispatch({ type: 'toggle-sink', sink: sink });
                }}
              />{' '}
              {formatSinkLabel(sink)}
            </label>
          );
        })}
      </fieldset>

      {pathVisible ? (
        <label style={{ display: 'block', marginBottom: 8 }}>
          Path (no extension)
          <input
            type="text"
            value={state.path}
            onChange={function (event) {
              dispatch({ type: 'set-path', path: event.target.value });
            }}
            style={{
              display: 'block',
              fontFamily: 'monospace',
              fontSize: 11,
              marginTop: 4,
              width: '100%',
            }}
          />
        </label>
      ) : null}

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          disabled={!canExport(state)}
          onClick={function () {
            void handleExport();
          }}
        >
          Export
        </button>
        <button
          type="button"
          onClick={function () {
            if (onCancel !== undefined) {
              onCancel();
            }
          }}
        >
          Cancel
        </button>
      </div>

      {state.formError ? (
        <p role="alert" style={{ color: '#b00020', fontSize: 11, margin: '0 0 8px' }}>
          {state.formError}
        </p>
      ) : null}

      {resultEntries.length > 0 ? (
        <ul role="status" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {resultEntries.map(function (sink) {
            const outcome = state.results!.bySink[sink]!;
            const color = outcome.ok ? '#0a6b0a' : '#b00020';
            const detail = outcome.ok
              ? (outcome.message ?? 'Completed')
              : (outcome.error ?? outcome.message ?? 'Failed');
            return (
              <li key={sink} style={{ color: color, fontSize: 11, marginBottom: 2 }}>
                {statusGlyph(outcome.ok)} {formatSinkLabel(sink)}: {detail}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
