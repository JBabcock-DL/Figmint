import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPendingMap,
  postSinkRequest,
  resetSinkClientStateForTests,
} from '@/io/sinks/sinkClientBridge';
import { outputPageClientSink } from '@/io/sinks/outputPageClient';

import { loadDriftSampleDoc } from '../../../helpers/sinks/loadDriftSampleDoc';

describe('outputPageClientSink', () => {
  let postMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetSinkClientStateForTests();
    postMessage = vi.fn();
    vi.stubGlobal('parent', { postMessage: postMessage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSinkClientStateForTests();
  });

  it('posts sink/output-page and resolves on sink/result', async () => {
    const doc = loadDriftSampleDoc();
    const pending = createPendingMap();

    const resultPromise = outputPageClientSink.write(doc, { format: 'md' });

    expect(postMessage).toHaveBeenCalledTimes(1);
    const payload = postMessage.mock.calls[0][0] as {
      pluginMessage: { type: string; requestId: string };
    };
    expect(payload.pluginMessage.type).toBe('sink/output-page');
    expect(pending.size).toBe(1);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'sink/result',
            requestId: payload.pluginMessage.requestId,
            result: { ok: true, sink: 'output-page', message: 'done' },
          },
        },
      }),
    );

    const result = await resultPromise;
    expect(result.ok).toBe(true);
    expect(pending.size).toBe(0);
  });

  it('rejects on sink/error response', async () => {
    const doc = loadDriftSampleDoc();
    const resultPromise = postSinkRequest('sink/plugin-data', doc, { format: 'json' });

    const payload = postMessage.mock.calls[0][0] as {
      pluginMessage: { requestId: string };
    };

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'sink/error',
            requestId: payload.pluginMessage.requestId,
            message: 'selection error',
          },
        },
      }),
    );

    await expect(resultPromise).rejects.toThrow('selection error');
  });
});
