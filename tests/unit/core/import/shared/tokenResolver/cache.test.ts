import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearResolverCache,
  readResolverCache,
  readResolverCacheIfSha,
  tokenResolverCacheKey,
  writeResolverCache,
} from '@/core/import/shared/tokenResolver/cache';

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

describe('tokenResolver cache', () => {
  beforeEach(function () {
    installClientStorageMock();
  });

  it('round-trips cache payload', async function () {
    await writeResolverCache(REPO, {
      configSha: 'abc',
      detectedKind: 'tailwind-v4-css',
      detectedPath: 'src/app/globals.css',
      classToVariable: { 'bg-primary': 'color/primary/default' },
      updatedAt: '2026-05-29T00:00:00.000Z',
    });

    const cached = await readResolverCache(REPO);
    expect(cached).not.toBeNull();
    expect(cached!.classToVariable['bg-primary']).toBe('color/primary/default');
    expect(tokenResolverCacheKey(REPO)).toContain('fighub:token-resolver:');
  });

  it('returns null when config SHA mismatches', async function () {
    await writeResolverCache(REPO, {
      configSha: 'old-sha',
      detectedKind: 'tailwind-v4-css',
      detectedPath: 'globals.css',
      classToVariable: {},
      updatedAt: '2026-05-29T00:00:00.000Z',
    });

    expect(await readResolverCacheIfSha(REPO, 'new-sha')).toBeNull();
    expect(await readResolverCacheIfSha(REPO, 'old-sha')).not.toBeNull();
  });

  it('clears cache entry', async function () {
    await writeResolverCache(REPO, {
      configSha: 'x',
      detectedKind: 'none',
      detectedPath: '',
      classToVariable: {},
      updatedAt: '2026-05-29T00:00:00.000Z',
    });
    await clearResolverCache(REPO);
    expect(await readResolverCache(REPO)).toBeNull();
  });
});
