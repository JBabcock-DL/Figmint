import { isSafeRepoPath } from '@/io/sources/github';

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

const TAILWIND_CONFIG_PATHS = [
  'tailwind.config.js',
  'tailwind.config.ts',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
];

const CSS_THEME_PATHS = [
  'src/app/globals.css',
  'app/globals.css',
  'src/styles/globals.css',
  'tokens.css',
  'design/tokens.css',
];

const STYLE_DICTIONARY_PATHS = ['style-dictionary.config.js', 'style-dictionary.config.json'];

const TOKENS_STUDIO_PATHS = ['tokens.json', 'design/tokens.json'];

const DESIGN_TOKENS_PATHS = ['design/tokens.json'];

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
  if (path.startsWith('tailwind.config')) {
    return 'tailwind-v3-config';
  }
  if (path.startsWith('style-dictionary')) {
    return 'style-dictionary';
  }
  if (path === 'tokens.json' || path === 'design/tokens.json') {
    return 'tokens-studio';
  }
  return 'tailwind-v4-css';
}

async function loadDesignTokenMap(
  fetchText: TokenResolverFetchText | undefined,
  designTokensPath: string | undefined,
): Promise<Record<string, string>> {
  const map = buildDefaultCanonicalMap();
  const paths =
    designTokensPath !== undefined && designTokensPath.length > 0
      ? [designTokensPath]
      : DESIGN_TOKENS_PATHS;
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
): Promise<DetectTokenSourceResult | null> {
  const designTokenMap = await loadDesignTokenMap(fetchText, designTokensPath);

  for (let i = 0; i < TAILWIND_CONFIG_PATHS.length; i++) {
    const path = TAILWIND_CONFIG_PATHS[i];
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

  for (let c = 0; c < CSS_THEME_PATHS.length; c++) {
    const path = CSS_THEME_PATHS[c];
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

  for (let s = 0; s < STYLE_DICTIONARY_PATHS.length; s++) {
    const path = STYLE_DICTIONARY_PATHS[s];
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

  for (let t = 0; t < TOKENS_STUDIO_PATHS.length; t++) {
    const path = TOKENS_STUDIO_PATHS[t];
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
  return 'Not detected — using defaults';
}

export function kindForDetectedPath(path: string): DetectedSourceKind {
  return kindForPath(path);
}
