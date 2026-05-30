import { isSafeRepoPath } from '@/io/sources/github';
import { detectContract } from '@/io/sources/detect';
import {
  discoverCssThemePaths,
  discoverStyleDictionaryConfigPaths,
  discoverTailwindConfigPaths,
  discoverTokensJsonPaths,
} from '@/io/github/repoPathDiscovery';

import { readCssThemeSource } from './cssThemeReader';
import { readStyleDictionarySource } from './styleDictionaryReader';
import { readTailwindConfigSource } from './tailwindConfigReader';
import { readTokensStudioSource } from './tokensStudioReader';
import { buildClassToCanonicalMap } from './semanticColorMap';
import {
  buildCanonicalMapFromDesignTokens,
  buildDefaultCanonicalMap,
} from './tailwindToCanonicalPath';
import type { DetectedSource, DetectedSourceKind } from './types';

export type TokenResolverFetchText = (
  path: string,
) => Promise<{ text: string; sha?: string } | null>;

export interface DetectTokenSourceResult {
  source: DetectedSource;
  classToVariable: Record<string, string>;
}

async function tryFetchPath(
  path: string,
  fetchText: TokenResolverFetchText | undefined,
): Promise<{ text: string; sha?: string } | null> {
  if (!isSafeRepoPath(path)) {
    return null;
  }
  if (fetchText === undefined) {
    return null;
  }
  return fetchText(path);
}

function kindForPath(path: string): DetectedSourceKind {
  const base = path.split('/').pop() ?? path;
  if (base.startsWith('tailwind.config')) {
    return 'tailwind-v3-config';
  }
  if (base.startsWith('style-dictionary.config')) {
    return 'style-dictionary';
  }
  if (base === 'tokens.json') {
    return 'tokens-studio';
  }
  return 'tailwind-v4-css';
}

async function loadDesignTokenMap(
  fetchText: TokenResolverFetchText | undefined,
  designTokensPath: string | undefined,
  repoPaths: readonly string[] | undefined,
): Promise<Record<string, string>> {
  const map = buildDefaultCanonicalMap();
  const paths: string[] = [];
  if (designTokensPath !== undefined && designTokensPath.length > 0) {
    paths.push(designTokensPath);
  }
  if (repoPaths !== undefined) {
    const discovered = discoverTokensJsonPaths(repoPaths);
    for (let i = 0; i < discovered.length; i++) {
      if (paths.indexOf(discovered[i]) < 0) {
        paths.push(discovered[i]);
      }
    }
  }
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const fetched = await tryFetchPath(path, fetchText);
    if (fetched === null) {
      continue;
    }
    try {
      const json = JSON.parse(fetched.text) as unknown;
      const fromTokens = buildCanonicalMapFromDesignTokens(json);
      const keys = Object.keys(fromTokens);
      for (let k = 0; k < keys.length; k++) {
        map[keys[k]] = fromTokens[keys[k]];
      }
      return map;
    } catch {
      continue;
    }
  }
  return map;
}

export async function detectTokenSource(
  _repoUrl: string,
  fetchText: TokenResolverFetchText | undefined,
  designTokensPath?: string,
  repoPaths?: readonly string[],
): Promise<DetectTokenSourceResult | null> {
  const designTokenMap = await loadDesignTokenMap(fetchText, designTokensPath, repoPaths);
  const paths = repoPaths !== undefined ? repoPaths : [];

  const tailwindCandidates = discoverTailwindConfigPaths(paths);
  for (let i = 0; i < tailwindCandidates.length; i++) {
    const path = tailwindCandidates[i];
    const fetched = await tryFetchPath(path, fetchText);
    if (fetched === null) {
      continue;
    }
    const read = readTailwindConfigSource(fetched.text);
    if (Object.keys(read.rawMap).length === 0) {
      continue;
    }
    const source: DetectedSource = {
      kind: 'tailwind-v3-config',
      path: path,
      configSha: fetched.sha,
    };
    return {
      source: source,
      classToVariable: buildClassToCanonicalMap(read.rawMap, designTokenMap),
    };
  }

  const cssCandidates = discoverCssThemePaths(paths);
  for (let c = 0; c < cssCandidates.length; c++) {
    const path = cssCandidates[c];
    const fetched = await tryFetchPath(path, fetchText);
    if (fetched === null) {
      continue;
    }
    const read = readCssThemeSource(fetched.text);
    if (Object.keys(read.rawMap).length === 0) {
      continue;
    }
    const source: DetectedSource = {
      kind: 'tailwind-v4-css',
      path: path,
      configSha: fetched.sha,
    };
    return {
      source: source,
      classToVariable: buildClassToCanonicalMap(read.rawMap, designTokenMap),
    };
  }

  const styleDictionaryCandidates = discoverStyleDictionaryConfigPaths(paths);
  for (let s = 0; s < styleDictionaryCandidates.length; s++) {
    const path = styleDictionaryCandidates[s];
    const fetched = await tryFetchPath(path, fetchText);
    if (fetched === null) {
      continue;
    }
    const read = readStyleDictionarySource(fetched.text);
    if (!read.detected) {
      continue;
    }
    const source: DetectedSource = { kind: 'style-dictionary', path: path, configSha: fetched.sha };
    return { source: source, classToVariable: {} };
  }

  const tokensStudioCandidates = discoverTokensJsonPaths(paths);
  for (let t = 0; t < tokensStudioCandidates.length; t++) {
    const path = tokensStudioCandidates[t];
    const fetched = await tryFetchPath(path, fetchText);
    if (fetched === null) {
      continue;
    }
    const read = readTokensStudioSource(fetched.text);
    if (!read.detected) {
      continue;
    }
    const source: DetectedSource = { kind: 'tokens-studio', path: path, configSha: fetched.sha };
    return { source: source, classToVariable: {} };
  }

  if (designTokensPath !== undefined && designTokensPath.length > 0) {
    const fetched = await tryFetchPath(designTokensPath, fetchText);
    if (fetched !== null) {
      const contractKind = detectContract(fetched.text);
      if (contractKind === 'tokens-dtcg' || contractKind === 'tokens-legacy') {
        const source: DetectedSource = {
          kind: 'dtcg-tokens',
          path: designTokensPath,
          configSha: fetched.sha,
        };
        return { source: source, classToVariable: {} };
      }
    }
  }

  return null;
}

export function formatDetectionLabel(source: DetectedSource | null): string {
  if (source === null || source.kind === 'none') {
    return 'Not detected — using defaults';
  }
  if (source.kind === 'tailwind-v3-config') {
    return 'Detected: Tailwind v3 (' + source.path + ')';
  }
  if (source.kind === 'tailwind-v4-css') {
    return 'Detected: Tailwind v4 (@theme in ' + source.path + ')';
  }
  if (source.kind === 'style-dictionary') {
    return 'Detected: Style Dictionary (' + source.path + ')';
  }
  if (source.kind === 'tokens-studio') {
    return 'Detected: Tokens Studio (' + source.path + ')';
  }
  if (source.kind === 'dtcg-tokens') {
    return 'Detected: DTCG tokens (' + source.path + ') — class mapping uses defaults unless CSS/Tailwind is found';
  }
  return 'Not detected — using defaults';
}

export function kindForDetectedPath(path: string): DetectedSourceKind {
  return kindForPath(path);
}
