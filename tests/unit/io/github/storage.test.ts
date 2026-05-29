import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearSyncState,
  clearLastRepoUrl,
  clearToken,
  getSyncState,
  getLastRepoUrl,
  getToken,
  setSyncState,
  setLastRepoUrl,
  setToken,
} from '@/io/github/storage';

const REPO_URL = 'https://github.com/acme/widgets';

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

describe('storage', () => {
  beforeEach(function () {
    installClientStorageMock();
  });

  it('round-trips token and sync state via clientStorage', async function () {
    await setToken(REPO_URL, {
      accessToken: 'gho_test1234567890',
      scope: 'repo',
      createdAt: '2026-05-27T00:00:00.000Z',
    });
    await setSyncState(REPO_URL, {
      resolvedConfig: {
        tokensPath: 'design/tokens.json',
        specsPath: 'components/',
        exportBasePath: 'docs/fighub/',
        designSystemBranch: 'main',
      },
      lastFetchedAt: '2026-05-28T12:00:00.000Z',
      defaultBranch: 'main',
    });

    const token = await getToken(REPO_URL);
    const syncState = await getSyncState(REPO_URL);

    expect(token).not.toBeNull();
    expect(token!.scope).toBe('repo');
    expect(syncState).not.toBeNull();
    expect(syncState!.resolvedConfig!.tokensPath).toBe('design/tokens.json');
    expect(syncState!.lastFetchedAt).toBe('2026-05-28T12:00:00.000Z');
  });

  it('migrates legacy config with tokensPath on read', async function () {
    const store = installClientStorageMock();
    store.set(
      'fighub:github:config:https://github.com/acme/widgets',
      JSON.stringify({ tokensPath: 'legacy/path.json', defaultBranch: 'develop' }),
    );

    const syncState = await getSyncState(REPO_URL);
    expect(syncState).not.toBeNull();
    expect(syncState!.resolvedConfig).toBeNull();
    expect(syncState!.defaultBranch).toBe('develop');
  });

  it('persists and clears last repo URL', async function () {
    await setLastRepoUrl(REPO_URL);
    expect(await getLastRepoUrl()).toBe(REPO_URL);
    await clearLastRepoUrl();
    expect(await getLastRepoUrl()).toBeNull();
  });

  it('clears token and sync state keys', async function () {
    await setToken(REPO_URL, {
      accessToken: 'gho_test1234567890',
      scope: 'repo',
      createdAt: '2026-05-27T00:00:00.000Z',
    });
    await setSyncState(REPO_URL, { defaultBranch: 'main' });

    await clearToken(REPO_URL);
    await clearSyncState(REPO_URL);

    expect(await getToken(REPO_URL)).toBeNull();
    expect(await getSyncState(REPO_URL)).toBeNull();
  });
});
