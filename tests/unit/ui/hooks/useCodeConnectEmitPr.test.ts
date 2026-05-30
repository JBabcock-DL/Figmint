import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  resetCodeConnectEmitPrStateForTests,
  useCodeConnectEmitPr,
} from '@/ui/hooks/useCodeConnectEmitPr';
import { resetCodeConnectMessageStateForTests } from '@/ui/codeconnect/codeconnectMessageListener';

describe('useCodeConnectEmitPr', () => {
  it('sets prUrl on success', function () {
    resetCodeConnectEmitPrStateForTests();
    resetCodeConnectMessageStateForTests();

    const { result } = renderHook(function () {
      return useCodeConnectEmitPr();
    });

    act(function () {
      result.current.emitPr({
        repoUrl: 'https://github.com/acme/widgets',
        componentIds: ['1:2'],
      });
    });

    act(function () {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            pluginMessage: {
              type: 'codeconnect/emit-pr/result',
              requestId: 'codeconnect-emit-1',
              ok: true,
              prUrl: 'https://github.com/o/r/pull/7',
            },
          },
        }),
      );
    });

    expect(result.current.state.prUrl).toBe('https://github.com/o/r/pull/7');
    expect(result.current.state.emitting).toBe(false);
  });
});
