import { loadTokenResolverOverride } from '@/io/github/tokenResolverStorage';

import type { TokenResolveResult, TokenResolver } from './types';
import { readResolverCacheIfSha, writeResolverCache } from './tokenResolver/cache';
import { detectTokenSource, type TokenResolverFetchText } from './tokenResolver/detectSources';
import { normalizeClassFragment } from './tokenResolver/normalizeClassFragment';
import { normalizeResolverVariablePath } from './tokenResolver/normalizeVariablePath';
import { canonicalPathForManualValue } from './tokenResolver/semanticColorMap';

export type { TokenResolver, TokenResolveResult } from './types';
export type { TokenResolverFetchText } from './tokenResolver/detectSources';

export interface TokenResolverOptions {
  repoUrl: string;
  manualMap?: Record<string, string>;
  designTokensPath?: string;
  /** Injected fetch for tests and UI detection refresh. */
  fetchText?: TokenResolverFetchText;
  /** Pre-built auto-detect map (skips detection when provided). */
  classToVariable?: Record<string, string>;
  /** Skip clientStorage cache read/write when true (unit tests). */
  disableCache?: boolean;
}

function normalizeManualMap(
  manualMap: Record<string, string> | undefined,
): Record<string, string> {
  if (manualMap === undefined) {
    return {};
  }
  const result: Record<string, string> = {};
  const keys = Object.keys(manualMap);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result[key] = normalizeResolverVariablePath(manualMap[key]);
  }
  return result;
}

function mergeClassMaps(
  autoMap: Record<string, string>,
  manualMap: Record<string, string>,
): Record<string, string> {
  const merged: Record<string, string> = {};
  const autoKeys = Object.keys(autoMap);
  for (let i = 0; i < autoKeys.length; i++) {
    const key = autoKeys[i];
    merged[key] = autoMap[key];
  }
  const manualKeys = Object.keys(manualMap);
  for (let j = 0; j < manualKeys.length; j++) {
    const mKey = manualKeys[j];
    merged[mKey] = manualMap[mKey];
  }
  return merged;
}

/**
 * Build auto-detected class → canonical variable map (async).
 * Persists to clientStorage when detection returns a config SHA.
 */
export async function buildTokenResolverClassMap(
  options: TokenResolverOptions,
): Promise<Record<string, string>> {
  const detected = await detectTokenSource(
    options.repoUrl,
    options.fetchText,
    options.designTokensPath,
  );
  if (detected === null) {
    return options.classToVariable !== undefined ? options.classToVariable : {};
  }

  const configSha =
    detected.source.configSha !== undefined && detected.source.configSha.length > 0
      ? detected.source.configSha
      : 'path:' + detected.source.path;

  if (options.disableCache !== true) {
    const cached = await readResolverCacheIfSha(options.repoUrl, configSha);
    if (cached !== null) {
      return cached.classToVariable;
    }
    await writeResolverCache(options.repoUrl, {
      configSha: configSha,
      detectedKind: detected.source.kind,
      detectedPath: detected.source.path,
      classToVariable: detected.classToVariable,
      updatedAt: new Date().toISOString(),
    });
  }

  return detected.classToVariable;
}

/**
 * Token resolver for Tailwind class fragments → FigHub variable paths.
 * MVP: solid color utilities (`bg-`, `text-`, `border-`) only; opacity/arbitrary values unresolved.
 */
export function createTokenResolver(options: TokenResolverOptions): TokenResolver {
  const manualMap = normalizeManualMap(options.manualMap);
  const autoMap =
    options.classToVariable !== undefined ? options.classToVariable : {};
  const merged = mergeClassMaps(autoMap, manualMap);

  return {
    resolve: function (token: string): TokenResolveResult {
      const fragment = normalizeClassFragment(token);
      const manualHit = manualMap[fragment];
      if (typeof manualHit === 'string' && manualHit.length > 0) {
        return { ok: true, variable: canonicalPathForManualValue(manualHit) };
      }
      const autoHit = merged[fragment];
      if (typeof autoHit === 'string' && autoHit.length > 0) {
        return { ok: true, variable: autoHit };
      }
      return { ok: false, reason: 'unresolved' };
    },
  };
}

export async function createTokenResolverAsync(
  options: TokenResolverOptions,
): Promise<TokenResolver> {
  const manualMap = normalizeManualMap(options.manualMap);
  let autoMap = options.classToVariable !== undefined ? options.classToVariable : {};

  if (Object.keys(autoMap).length === 0 && options.fetchText !== undefined) {
    autoMap = await buildTokenResolverClassMap(options);
  }

  return createTokenResolver({
    repoUrl: options.repoUrl,
    manualMap: manualMap,
    classToVariable: autoMap,
    fetchText: options.fetchText,
    designTokensPath: options.designTokensPath,
    disableCache: options.disableCache,
  });
}

/** Loads Settings override + detection cache, then returns a resolver (manual wins). */
export async function createTokenResolverForSession(
  repoUrl: string,
  fetchText?: TokenResolverFetchText,
): Promise<TokenResolver> {
  const override = await loadTokenResolverOverride(repoUrl);
  const manualMap = override !== null ? override.manualMap : undefined;
  return createTokenResolverAsync({
    repoUrl: repoUrl,
    manualMap: manualMap,
    fetchText: fetchText,
  });
}

/** Stub for WO-039 downstream until resolver is wired — always unresolved. */
export function createNotImplementedTokenResolver(): TokenResolver {
  return {
    resolve: function (_token: string): TokenResolveResult {
      return { ok: false, reason: 'unresolved' };
    },
  };
}

export { formatDetectionLabel, detectTokenSource } from './tokenResolver/detectSources';
export type { DetectedSource, DetectedSourceKind } from './tokenResolver/types';
