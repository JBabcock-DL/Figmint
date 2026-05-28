import { configStorageKey, normalizeRepoUrl, tokenStorageKey } from '@/io/github/repoUrl';

const LAST_REPO_STORAGE_KEY = 'figmint:github:lastRepoUrl';

export interface StoredGitHubToken {
  accessToken: string;
  scope: string;
  createdAt: string;
  tokenType?: string;
}

export interface StoredGitHubConfig {
  tokensPath: string;
  /** Registry document path; Components tab defaults to `.figmint-registry.json` when unset. */
  registryPath?: string;
  defaultBranch?: string;
  exportBasePath?: string;
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await figma.clientStorage.getAsync(key);
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await figma.clientStorage.setAsync(key, JSON.stringify(value));
}

export async function getToken(repoUrl: string): Promise<StoredGitHubToken | null> {
  const stored = await readJson<StoredGitHubToken>(tokenStorageKey(repoUrl));
  if (stored === null || typeof stored.accessToken !== 'string' || stored.accessToken.length === 0) {
    return null;
  }
  return stored;
}

export async function setToken(repoUrl: string, token: StoredGitHubToken): Promise<void> {
  await writeJson(tokenStorageKey(repoUrl), token);
}

export async function clearToken(repoUrl: string): Promise<void> {
  await figma.clientStorage.deleteAsync(tokenStorageKey(repoUrl));
}

export async function getConfig(repoUrl: string): Promise<StoredGitHubConfig | null> {
  const stored = await readJson<StoredGitHubConfig>(configStorageKey(repoUrl));
  if (stored === null || typeof stored.tokensPath !== 'string') {
    return null;
  }
  return stored;
}

export async function setConfig(repoUrl: string, config: StoredGitHubConfig): Promise<void> {
  await writeJson(configStorageKey(repoUrl), config);
}

export async function clearConfig(repoUrl: string): Promise<void> {
  await figma.clientStorage.deleteAsync(configStorageKey(repoUrl));
}

export async function getLastRepoUrl(): Promise<string | null> {
  const raw = await figma.clientStorage.getAsync(LAST_REPO_STORAGE_KEY);
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  try {
    return normalizeRepoUrl(raw);
  } catch {
    return null;
  }
}

export async function setLastRepoUrl(repoUrl: string): Promise<void> {
  await figma.clientStorage.setAsync(LAST_REPO_STORAGE_KEY, normalizeRepoUrl(repoUrl));
}

export async function clearLastRepoUrl(): Promise<void> {
  await figma.clientStorage.deleteAsync(LAST_REPO_STORAGE_KEY);
}
