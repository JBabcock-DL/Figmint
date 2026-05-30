import { beforeEach, describe, expect, it } from 'vitest';

import { createTokenResolverForSession } from '@/core/import/shared/tokenResolver';
import { saveTokenResolverOverride } from '@/io/github/tokenResolverStorage';

const REPO = 'https://github.com/acme/widgets';

function installClientStorageMock() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).figma = {
    clientStorage: {
      getAsync: async function (key: string) {
        return store.get(key);
      },
      setAsync: async function (key: string, value: string) {
        store.set(key, value);
      },
      deleteAsync: async function (key: string) {
        store.delete(key);
      },
    },
  };
  return store;
}

describe('createTokenResolverForSession', () => {
  beforeEach(function () {
    installClientStorageMock();
  });

  it('manual override wins over cached auto map', async function () {
    await saveTokenResolverOverride(REPO, {
      'bg-primary': 'color/muted/default',
    });

    const resolver = await createTokenResolverForSession(REPO, async function () {
      return null;
    });

    expect(resolver.resolve('bg-primary')).toEqual({
      ok: true,
      variable: 'color/muted/default',
    });
  });
});
