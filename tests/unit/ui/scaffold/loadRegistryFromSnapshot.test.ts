import { describe, expect, it, vi } from 'vitest';

import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

import { loadRegistryForComponentsTab } from '@/ui/components/scaffold/loadRegistryFromSnapshot';

const sampleRegistry: RegistryV1 = {
  v: 1,
  kind: 'registry',
  fileKey: 'fk',
  components: {
    Button: {
      nodeId: 'cs:1',
      key: 'key',
      pageName: '↳ Buttons',
      publishedAt: '2026-05-28T00:00:00.000Z',
      version: 1,
    },
  },
};

describe('loadRegistryForComponentsTab', () => {
  it('returns registry from snapshot/read/result message', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    const loadedPromise = loadRegistryForComponentsTab();

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginMessage: expect.objectContaining({ type: 'snapshot/read' }),
      }),
      '*',
    );

    const requestId = postMessage.mock.calls[0][0].pluginMessage.requestId as string;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'snapshot/read/result',
            requestId: requestId,
            ok: true,
            registry: sampleRegistry,
          },
        },
      }),
    );

    const loaded = await loadedPromise;
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.registry).toEqual(sampleRegistry);
      expect(loaded.message).toContain('1 linked component');
    }
  });

  it('returns empty snapshot message when registry has no components', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    const loadedPromise = loadRegistryForComponentsTab();
    const requestId = postMessage.mock.calls[0][0].pluginMessage.requestId as string;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'snapshot/read/result',
            requestId: requestId,
            ok: true,
            registry: {
              v: 1,
              kind: 'registry',
              fileKey: 'fk',
              components: {},
            },
          },
        },
      }),
    );

    const loaded = await loadedPromise;
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.message).toContain('No linked components');
    }
  });

  it('returns error when snapshot read fails', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessage },
      configurable: true,
    });

    const loadedPromise = loadRegistryForComponentsTab();
    const requestId = postMessage.mock.calls[0][0].pluginMessage.requestId as string;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          pluginMessage: {
            type: 'snapshot/read/result',
            requestId: requestId,
            ok: false,
            error: 'Snapshot unavailable',
          },
        },
      }),
    );

    const loaded = await loadedPromise;
    expect(loaded).toEqual({ ok: false, message: 'Snapshot unavailable' });
  });
});
