import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import handoffFixture from '@/io/formats/__fixtures__/handoff-context-min.json';
import {
  registerHandoffMessageListener,
  resetHandoffMessageStateForTests,
} from '@/ui/handoff/handoffMessageListener';
import {
  resetHandoffCaptureStateForTests,
  useHandoffCapture,
} from '@/ui/handoff/useHandoffCapture';
import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';

describe('useHandoffCapture', () => {
  afterEach(function () {
    resetHandoffMessageStateForTests();
    resetHandoffCaptureStateForTests();
    vi.restoreAllMocks();
  });

  it('posts handoff/capture and completes on matching capture-result', function () {
    const postMessage = vi.fn();
    Object.defineProperty(globalThis, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    registerHandoffMessageListener();
    const { result } = renderHook(function () {
      return useHandoffCapture();
    });

    act(function () {
      result.current.capture();
    });

    expect(result.current.state.capturing).toBe(true);
    expect(postMessage).toHaveBeenCalledTimes(1);
    const payload = postMessage.mock.calls[0][0] as {
      pluginMessage: { type: string; requestId: string };
    };
    expect(payload.pluginMessage.type).toBe('handoff/capture');
    expect(payload.pluginMessage.requestId).toMatch(/^handoff-capture-\d+$/);

    act(function () {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            pluginMessage: {
              type: 'handoff/capture-result',
              requestId: payload.pluginMessage.requestId,
              ok: true,
              markdown: '# handoff-context v1',
              document: handoffFixture as HandoffContextV1,
              warnings: ['Screenshot truncated'],
            },
          },
        }),
      );
    });

    expect(result.current.state.capturing).toBe(false);
    expect(result.current.state.markdown).toBe('# handoff-context v1');
    expect(result.current.state.document).toEqual(handoffFixture);
    expect(result.current.state.warnings).toEqual(['Screenshot truncated']);
    expect(result.current.state.error).toBe('');
  });

  it('sets error on failed capture-result', function () {
    const postMessage = vi.fn();
    Object.defineProperty(globalThis, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    registerHandoffMessageListener();
    const { result } = renderHook(function () {
      return useHandoffCapture();
    });

    act(function () {
      result.current.capture();
    });

    const requestId = (
      postMessage.mock.calls[0][0] as { pluginMessage: { requestId: string } }
    ).pluginMessage.requestId;

    act(function () {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            pluginMessage: {
              type: 'handoff/capture-result',
              requestId: requestId,
              ok: false,
              error: 'Nothing selected',
            },
          },
        }),
      );
    });

    expect(result.current.state.capturing).toBe(false);
    expect(result.current.state.error).toBe('Nothing selected');
  });

  it('ignores capture-result for a different requestId', function () {
    const postMessage = vi.fn();
    Object.defineProperty(globalThis, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    registerHandoffMessageListener();
    const { result } = renderHook(function () {
      return useHandoffCapture();
    });

    act(function () {
      result.current.capture();
    });

    act(function () {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            pluginMessage: {
              type: 'handoff/capture-result',
              requestId: 'other-request',
              ok: true,
              markdown: '# stale',
            },
          },
        }),
      );
    });

    expect(result.current.state.capturing).toBe(true);
    expect(result.current.state.markdown).toBe('');
  });

  it('reset clears capture state', function () {
    registerHandoffMessageListener();
    const { result } = renderHook(function () {
      return useHandoffCapture();
    });

    act(function () {
      result.current.reset();
    });

    expect(result.current.state).toEqual({
      capturing: false,
      markdown: '',
      document: null,
      warnings: [],
      error: '',
    });
  });
});
