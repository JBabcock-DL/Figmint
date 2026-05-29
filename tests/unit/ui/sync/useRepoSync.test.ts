import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetRepoSyncRequestIdsForTests, useRepoSync } from '@/ui/sync/useRepoSync';

describe('useRepoSync', () => {
  afterEach(function () {
    resetRepoSyncRequestIdsForTests();
    vi.restoreAllMocks();
  });

  it('posts fetch message and updates state on result', async function () {
    const postMessage = vi.fn();
    const originalParent = globalThis.parent;
    Object.defineProperty(globalThis, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    const { result } = renderHook(function () {
      return useRepoSync({
        repoUrl: 'https://github.com/acme/widgets',
        connected: true,
      });
    });

    act(function () {
      void result.current.fetchRepo();
    });

    expect(postMessage).toHaveBeenCalled();
    const payload = postMessage.mock.calls[0][0] as {
      pluginMessage: { type: string; requestId: string };
    };
    expect(payload.pluginMessage.type).toBe('github/repo/fetch');

    await act(async function () {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            pluginMessage: {
              type: 'github/repo/fetch-result',
              requestId: payload.pluginMessage.requestId,
              ok: true,
              config: {
                tokensPath: 'design/tokens.json',
                specsPath: 'components/',
                exportBasePath: 'docs/fighub/',
                designSystemBranch: 'main',
              },
              lastFetchedAt: '2026-05-28T00:00:00.000Z',
            },
          },
        }),
      );
    });

    expect(result.current.lastFetchedAt).toBe('2026-05-28T00:00:00.000Z');
    expect(result.current.fetching).toBe(false);

    Object.defineProperty(globalThis, 'parent', {
      value: originalParent,
      configurable: true,
    });
  });
});
