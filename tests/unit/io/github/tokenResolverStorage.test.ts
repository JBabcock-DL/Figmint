import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearTokenResolverOverride,
  loadTokenResolverOverride,
  saveTokenResolverOverride,
  tokenResolverOverrideKey,
} from '@/io/github/tokenResolverStorage';

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

describe('tokenResolverStorage', () => {
  beforeEach(function () {
    installClientStorageMock();
  });

  it('round-trips manual override map', async function () {
    await saveTokenResolverOverride(REPO, {
      'bg-primary': 'color/primary/default',
    });
    const loaded = await loadTokenResolverOverride(REPO);
    expect(loaded).not.toBeNull();
    expect(loaded!.manualMap['bg-primary']).toBe('color/primary/default');
    expect(tokenResolverOverrideKey(REPO)).toContain('fighub:token-resolver-override:');
  });

  it('rejects invalid manual map on save', async function () {
    await expect(
      saveTokenResolverOverride(REPO, { '': 'color/primary/default' } as Record<string, string>),
    ).rejects.toThrow();
  });

  it('clears override storage', async function () {
    await saveTokenResolverOverride(REPO, { 'bg-test': 'color/primary/default' });
    await clearTokenResolverOverride(REPO);
    expect(await loadTokenResolverOverride(REPO)).toBeNull();
  });

  it('rejects invalid JSON shape on load', async function () {
    const store = installClientStorageMock();
    store.set(tokenResolverOverrideKey(REPO), '{not-json');
    expect(await loadTokenResolverOverride(REPO)).toBeNull();
  });
});
