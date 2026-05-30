import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  resetCodeConnectDetectStateForTests,
  useCodeConnectDetect,
} from '@/ui/hooks/useCodeConnectDetect';
import { resetCodeConnectMessageStateForTests } from '@/ui/codeconnect/codeconnectMessageListener';

describe('useCodeConnectDetect', () => {
  it('populates three unmapped entries', function () {
    resetCodeConnectDetectStateForTests();
    resetCodeConnectMessageStateForTests();

    const { result } = renderHook(function () {
      return useCodeConnectDetect();
    });

    act(function () {
      result.current.scan({ repoUrl: 'https://github.com/acme/widgets' });
    });

    act(function () {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            pluginMessage: {
              type: 'codeconnect/detect/result',
              requestId: 'codeconnect-detect-1',
              ok: true,
              unmapped: [
                { nodeId: '1:1', name: 'A' },
                { nodeId: '2:2', name: 'B' },
                { nodeId: '3:3', name: 'C' },
              ],
            },
          },
        }),
      );
    });

    expect(result.current.state.unmapped).toHaveLength(3);
    expect(result.current.state.scanning).toBe(false);
  });
});
