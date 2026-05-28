import type { DriftReportV1 } from '@detroitlabs/fighub-contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import driftFixture from '@/io/formats/__fixtures__/drift-report-ac.json';
import type { SinkResult } from '@/io/sinks/types';
import {
  createInitialExportSheetState,
  reduceExportSheet,
  type ExportSheetAction,
  type ExportSheetState,
} from '@/ui/export/exportSheetReducer';
import { resetExportMessageStateForTests } from '@/ui/export/exportMessageListener';
import { runExport } from '@/ui/export/runExport';
import type { ContractDocument } from '@/ui/export/types';

const driftDoc: ContractDocument = {
  kind: 'drift-report',
  payload: driftFixture as DriftReportV1,
};

function applyActions(
  initial: ExportSheetState,
  actions: ExportSheetAction[],
): ExportSheetState {
  let state = initial;
  for (let i = 0; i < actions.length; i++) {
    state = reduceExportSheet(state, actions[i]);
  }
  return state;
}

describe('runExport', () => {
  beforeEach(function () {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(function () {
    vi.restoreAllMocks();
    resetExportMessageStateForTests();
  });

  it('orchestrates UI sinks and main export with one failure across three sinks', async function () {
    const runSinkFn = vi.fn(function (sink: string): Promise<SinkResult> {
      if (sink === 'download') {
        return Promise.resolve({
          ok: true,
          sink: 'download',
          message: 'Saved drift-report.json',
        });
      }
      if (sink === 'clipboard') {
        return Promise.resolve({
          ok: true,
          sink: 'clipboard',
          message: 'Copied to clipboard',
        });
      }
      return Promise.reject(new Error('Unexpected UI sink: ' + sink));
    });

    const postMessage = vi.fn(function (message: unknown) {
      const pluginMessage = (message as { pluginMessage: Record<string, unknown> }).pluginMessage;
      const requestId = pluginMessage.requestId as string;
      queueMicrotask(function () {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              pluginMessage: {
                type: 'export/sink-result',
                requestId: requestId,
                sink: 'output-page',
                ok: false,
                error: 'Output page not found',
              },
            },
          }),
        );
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              pluginMessage: {
                type: 'export/complete',
                requestId: requestId,
                bySink: {
                  'output-page': { ok: false, error: 'Output page not found' },
                },
              },
            },
          }),
        );
      });
    });

    const initial = createInitialExportSheetState(driftDoc, {
      defaultSinks: ['download', 'clipboard', 'output-page'],
    });
    const actions: ExportSheetAction[] = [];
    const dispatch = function (action: ExportSheetAction) {
      actions.push(action);
    };

    let completedResults: { bySink: Record<string, { ok: boolean }> } | null = null;
    await runExport(driftDoc, initial, dispatch, {
      runSinkFn: runSinkFn as typeof import('@/io/sinks').runSink,
      postMessage: postMessage,
      onComplete: function (results) {
        completedResults = results;
      },
    });

    expect(runSinkFn).toHaveBeenCalledTimes(2);
    expect(postMessage).toHaveBeenCalledTimes(1);

    const posted = postMessage.mock.calls[0][0] as {
      pluginMessage: Record<string, unknown>;
    };
    expect(posted.pluginMessage.type).toBe('export/run');
    expect(posted.pluginMessage.requestId).toBe('export-1700000000000');
    expect(posted.pluginMessage.sinks).toEqual(['output-page']);
    expect(Array.isArray(posted.pluginMessage.files)).toBe(true);

    const finalState = applyActions(initial, actions);
    expect(finalState.exporting).toBe(false);
    expect(finalState.results?.bySink.download?.ok).toBe(true);
    expect(finalState.results?.bySink.clipboard?.ok).toBe(true);
    expect(finalState.results?.bySink['output-page']?.ok).toBe(false);
    expect(finalState.results?.bySink['output-page']?.error).toBe('Output page not found');

    expect(completedResults).not.toBeNull();
    expect(completedResults!.bySink.download?.ok).toBe(true);
    expect(completedResults!.bySink.clipboard?.ok).toBe(true);
    expect(completedResults!.bySink['output-page']?.ok).toBe(false);
  });

  it('fails github-pr locally when repository URL is missing', async function () {
    const postMessage = vi.fn();
    const initial = createInitialExportSheetState(driftDoc, {
      defaultSinks: ['github-pr'],
    });
    const actions: ExportSheetAction[] = [];

    await runExport(driftDoc, initial, function (action) {
      actions.push(action);
    }, {
      postMessage: postMessage,
    });

    expect(postMessage).not.toHaveBeenCalled();
    const finalState = applyActions(initial, actions);
    expect(finalState.results?.bySink['github-pr']?.ok).toBe(false);
    expect(finalState.results?.bySink['github-pr']?.error).toContain('repository URL');
  });
});
