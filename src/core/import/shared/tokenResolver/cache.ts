import { normalizeRepoUrl } from '@/io/github/repoUrl';

import type { DetectedSourceKind, ResolverCachePayload } from './types';

export const TOKEN_RESOLVER_CACHE_KEY_PREFIX = 'fighub:token-resolver:';

export function tokenResolverCacheKey(repoUrl: string): string {
  return TOKEN_RESOLVER_CACHE_KEY_PREFIX + normalizeRepoUrl(repoUrl);
}

function parseCachePayload(raw: unknown): ResolverCachePayload | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.configSha !== 'string') {
    return null;
  }
  if (typeof record.detectedKind !== 'string') {
    return null;
  }
  if (typeof record.detectedPath !== 'string') {
    return null;
  }
  if (typeof record.classToVariable !== 'object' || record.classToVariable === null) {
    return null;
  }
  if (Array.isArray(record.classToVariable)) {
    return null;
  }
  if (typeof record.updatedAt !== 'string') {
    return null;
  }
  return {
    configSha: record.configSha,
    detectedKind: record.detectedKind as DetectedSourceKind,
    detectedPath: record.detectedPath,
    classToVariable: record.classToVariable as Record<string, string>,
    updatedAt: record.updatedAt,
  };
}

export async function readResolverCache(repoUrl: string): Promise<ResolverCachePayload | null> {
  const key = tokenResolverCacheKey(repoUrl);
  const raw = await figma.clientStorage.getAsync(key);
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  try {
    return parseCachePayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function readResolverCacheIfSha(
  repoUrl: string,
  configSha: string,
): Promise<ResolverCachePayload | null> {
  const cached = await readResolverCache(repoUrl);
  if (cached === null) {
    return null;
  }
  if (cached.configSha !== configSha) {
    return null;
  }
  return cached;
}

export async function writeResolverCache(
  repoUrl: string,
  payload: ResolverCachePayload,
): Promise<void> {
  const key = tokenResolverCacheKey(repoUrl);
  await figma.clientStorage.setAsync(key, JSON.stringify(payload));
}

export async function clearResolverCache(repoUrl: string): Promise<void> {
  const key = tokenResolverCacheKey(repoUrl);
  await figma.clientStorage.deleteAsync(key);
}
