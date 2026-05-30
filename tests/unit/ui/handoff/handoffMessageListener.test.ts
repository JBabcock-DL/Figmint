import { afterEach, describe, expect, it } from 'vitest';

import {
  registerHandoffMessageListener,
  resetHandoffMessageStateForTests,
} from '@/ui/handoff/handoffMessageListener';

describe('handoffMessageListener', () => {
  afterEach(function () {
    resetHandoffMessageStateForTests();
  });

  it('routes handoff/capture-result and handoff/selection via postMessage', function () {
    let captureResult: string | undefined;
    let selectionCount: number | undefined;

    registerHandoffMessageListener({
      onCaptureResult: function (message) {
        captureResult = message.requestId + ':' + String(message.ok);
      },
      onSelection: function (message) {
        selectionCount = message.count;
      },
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'handoff/capture-result',
            requestId: 'handoff-ui-1',
            ok: true,
            markdown: '# handoff-context v1',
          },
        },
      }),
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'handoff/selection',
            count: 2,
            names: ['Checkout', 'Details'],
          },
        },
      }),
    );

    expect(captureResult).toBe('handoff-ui-1:true');
    expect(selectionCount).toBe(2);
  });
});
