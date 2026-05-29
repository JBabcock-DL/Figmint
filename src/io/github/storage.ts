import type { ResolvedFigHubConfig } from '@detroitlabs/fighub-contracts';

import { configStorageKey, normalizeRepoUrl, tokenStorageKey } from '@/io/github/repoUrl';

const LAST_REPO_STORAGE_KEY = 'fighub:github:lastRepoUrl';

export interface StoredGitHubToken {
  accessToken: string;
  scope: string;
  createdAt: string;
  tokenType?: string;
}

export interface StoredRepoSyncState {
  resolvedConfig: ResolvedFigHubConfig | null;
  lastFetchedAt: string | null;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  defaultBranch: string;
  /** Non-blocking warning from malformed fighub.json (WO-058). */
  configWarning?: string | null;
}

/** @deprecated WO-058 — legacy clientStorage shape; migrated on read. */
interface LegacyStoredGitHubConfig {
  tokensPath?: string;
  registryPath?: string;
  defaultBranch?: string;
  exportBasePath?: string;
}

function emptySyncState(): StoredRepoSyncState {
  return {
    resolvedConfig: null,
    lastFetchedAt: null,
    lastPulledAt: null,
    lastPushedAt: null,
    defaultBranch: 'main',
    configWarning: null,
  };
}

function migrateLegacyConfig(raw: LegacyStoredGitHubConfig): StoredRepoSyncState {
  const state = emptySyncState();
  if (typeof raw.defaultBranch === 'string' && raw.defaultBranch.length > 0) {
    state.defaultBranch = raw.defaultBranch;
  }
  return state;
}

function isLegacyConfig(raw: Record<string, unknown>): boolean {
  return typeof raw.tokensPath === 'string';
}

function normalizeSyncState(raw: unknown): StoredRepoSyncState | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;

  if (isLegacyConfig(record)) {
    return migrateLegacyConfig(record);
  }

  const state = emptySyncState();
  if (record.resolvedConfig !== undefined && record.resolvedConfig !== null) {
    const cfg = record.resolvedConfig as Record<string, unknown>;
    if (
      typeof cfg.tokensPath === 'string' &&
      typeof cfg.specsPath === 'string' &&
      typeof cfg.exportBasePath === 'string' &&
      typeof cfg.designSystemBranch === 'string'
    ) {
      state.resolvedConfig = {
        tokensPath: cfg.tokensPath,
        specsPath: cfg.specsPath,
        exportBasePath: cfg.exportBasePath,
        designSystemBranch: cfg.designSystemBranch,
      };
    }
  }
  if (typeof record.lastFetchedAt === 'string') {
    state.lastFetchedAt = record.lastFetchedAt;
  }
  if (typeof record.lastPulledAt === 'string') {
    state.lastPulledAt = record.lastPulledAt;
  }
  if (typeof record.lastPushedAt === 'string') {
    state.lastPushedAt = record.lastPushedAt;
  }
  if (typeof record.defaultBranch === 'string' && record.defaultBranch.length > 0) {
    state.defaultBranch = record.defaultBranch;
  }
  if (typeof record.configWarning === 'string') {
    state.configWarning = record.configWarning;
  } else if (record.configWarning === null) {
    state.configWarning = null;
  }
  return state;
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
  if (
    stored === null ||
    typeof stored.accessToken !== 'string' ||
    stored.accessToken.length === 0
  ) {
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

export async function getSyncState(repoUrl: string): Promise<StoredRepoSyncState | null> {
  const stored = await readJson<unknown>(configStorageKey(repoUrl));
  if (stored === null) {
    return null;
  }
  return normalizeSyncState(stored);
}

export async function setSyncState(
  repoUrl: string,
  partial: Partial<StoredRepoSyncState>,
): Promise<StoredRepoSyncState> {
  const existing = (await getSyncState(repoUrl)) || emptySyncState();
  const merged: StoredRepoSyncState = {
    resolvedConfig:
      partial.resolvedConfig !== undefined ? partial.resolvedConfig : existing.resolvedConfig,
    lastFetchedAt:
      partial.lastFetchedAt !== undefined ? partial.lastFetchedAt : existing.lastFetchedAt,
    lastPulledAt: partial.lastPulledAt !== undefined ? partial.lastPulledAt : existing.lastPulledAt,
    lastPushedAt: partial.lastPushedAt !== undefined ? partial.lastPushedAt : existing.lastPushedAt,
    defaultBranch:
      partial.defaultBranch !== undefined && partial.defaultBranch.length > 0
        ? partial.defaultBranch
        : existing.defaultBranch,
    configWarning:
      partial.configWarning !== undefined ? partial.configWarning : existing.configWarning,
  };
  await writeJson(configStorageKey(repoUrl), merged);
  return merged;
}

/** Clears sync state for a repo (same storage key as legacy config). */
export async function clearSyncState(repoUrl: string): Promise<void> {
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
