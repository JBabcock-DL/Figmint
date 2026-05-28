import { afterEach, describe, expect, it } from 'vitest';

import {
  createPendingExportMap,
  registerExportMessageListener,
  resetExportMessageStateForTests,
  waitForExportMainResults,
} from '@/ui/export/exportMessageListener';

describe('exportMessageListener', () => {
  afterEach(function () {
    resetExportMessageStateForTests();
  });

  it('routes export/sink-result and export/complete to pending handlers', function () {
    registerExportMessageListener();
    const sinkResults: string[] = [];
    let completed = false;

    waitForExportMainResults('export-test-1', {
      onSinkResult: function (message) {
        sinkResults.push(message.sink + ':' + String(message.ok));
      },
      onComplete: function () {
        completed = true;
      },
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'export/sink-result',
            requestId: 'export-test-1',
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
            requestId: 'export-test-1',
            bySink: {
              'output-page': { ok: false, error: 'Output page not found' },
            },
          },
        },
      }),
    );

    expect(sinkResults).toEqual(['output-page:false']);
    expect(completed).toBe(true);
    expect(createPendingExportMap().has('export-test-1')).toBe(false);
  });
});
