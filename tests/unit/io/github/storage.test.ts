import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearConfig,
  clearLastRepoUrl,
  clearToken,
  getConfig,
  getLastRepoUrl,
  getToken,
  setConfig,
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

  it('round-trips token and config via clientStorage', async function () {
    await setToken(REPO_URL, {
      accessToken: 'gho_test1234567890',
      scope: 'repo',
      createdAt: '2026-05-27T00:00:00.000Z',
    });
    await setConfig(REPO_URL, {
      tokensPath: 'design/tokens.json',
      defaultBranch: 'main',
    });

    const token = await getToken(REPO_URL);
    const config = await getConfig(REPO_URL);

    expect(token).not.toBeNull();
    expect(token!.scope).toBe('repo');
    expect(config).not.toBeNull();
    expect(config!.tokensPath).toBe('design/tokens.json');
  });

  it('persists and clears last repo URL', async function () {
    await setLastRepoUrl(REPO_URL);
    expect(await getLastRepoUrl()).toBe(REPO_URL);
    await clearLastRepoUrl();
    expect(await getLastRepoUrl()).toBeNull();
  });

  it('clears token and config keys', async function () {
    await setToken(REPO_URL, {
      accessToken: 'gho_test1234567890',
      scope: 'repo',
      createdAt: '2026-05-27T00:00:00.000Z',
    });
    await setConfig(REPO_URL, { tokensPath: 'design/tokens.json' });

    await clearToken(REPO_URL);
    await clearConfig(REPO_URL);

    expect(await getToken(REPO_URL)).toBeNull();
    expect(await getConfig(REPO_URL)).toBeNull();
  });
});
