import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  registerHandoffMessageListener,
  resetHandoffMessageStateForTests,
} from '@/ui/handoff/handoffMessageListener';
import { useHandoffSelection } from '@/ui/handoff/useHandoffSelection';

describe('useHandoffSelection', () => {
  afterEach(function () {
    resetHandoffMessageStateForTests();
  });

  it('starts with empty selection', function () {
    registerHandoffMessageListener();
    const { result } = renderHook(function () {
      return useHandoffSelection();
    });

    expect(result.current).toEqual({ count: 0, names: [] });
  });

  it('updates count and names from handoff/selection messages', function () {
    registerHandoffMessageListener();
    const { result } = renderHook(function () {
      return useHandoffSelection();
    });

    act(function () {
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
    });

    expect(result.current).toEqual({
      count: 2,
      names: ['Checkout', 'Details'],
    });
  });
});
