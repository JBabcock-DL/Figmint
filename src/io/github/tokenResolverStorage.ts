import { normalizeRepoUrl } from '@/io/github/repoUrl';

import { clearResolverCache } from '@/core/import/shared/tokenResolver/cache';
import { normalizeResolverVariablePath } from '@/core/import/shared/tokenResolver/normalizeVariablePath';

export interface StoredTokenResolverOverride {
  manualMap: Record<string, string>;
  updatedAt: string;
}

export function tokenResolverOverrideKey(repoUrl: string): string {
  return 'fighub:token-resolver-override:' + normalizeRepoUrl(repoUrl);
}

function isValidManualMap(raw: unknown): raw is Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return false;
  }
  const record = raw as Record<string, unknown>;
  const keys = Object.keys(record);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = record[key];
    if (typeof key !== 'string' || key.length === 0) {
      return false;
    }
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }
  }
  return true;
}

function normalizeManualMap(map: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result[key] = normalizeResolverVariablePath(map[key]);
  }
  return result;
}

export async function loadTokenResolverOverride(
  repoUrl: string,
): Promise<StoredTokenResolverOverride | null> {
  const key = tokenResolverOverrideKey(repoUrl);
  const raw = await figma.clientStorage.getAsync(key);
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (!isValidManualMap(record.manualMap)) {
      return null;
    }
    if (typeof record.updatedAt !== 'string') {
      return null;
    }
    return {
      manualMap: normalizeManualMap(record.manualMap),
      updatedAt: record.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function saveTokenResolverOverride(
  repoUrl: string,
  manualMap: Record<string, string>,
): Promise<void> {
  if (!isValidManualMap(manualMap)) {
    throw new Error('Token resolver override must be a JSON object of class fragment → variable path.');
  }
  const key = tokenResolverOverrideKey(repoUrl);
  const payload: StoredTokenResolverOverride = {
    manualMap: normalizeManualMap(manualMap),
    updatedAt: new Date().toISOString(),
  };
  await figma.clientStorage.setAsync(key, JSON.stringify(payload));
  await clearResolverCache(repoUrl);
}

export async function clearTokenResolverOverride(repoUrl: string): Promise<void> {
  const key = tokenResolverOverrideKey(repoUrl);
  await figma.clientStorage.deleteAsync(key);
  await clearResolverCache(repoUrl);
}
