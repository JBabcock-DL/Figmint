import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

import { deriveComponentsRoot } from '@/core/import/shared/deriveComponentsRoot';
import { shouldIncludeImportSourcePath } from '@/core/import/shared/importSourceExtensions';

const DENYLIST_SEGMENTS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
];

const TEST_PATH_SEGMENTS = ['/__tests__/', '/__mocks__/'];

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

function dirname(path: string): string {
  const idx = path.lastIndexOf('/');
  if (idx <= 0) {
    return '';
  }
  return path.slice(0, idx);
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : path + '/';
}

function sharedSegmentCount(a: string, b: string): number {
  const aParts = a.replace(/\/$/, '').split('/').filter(function (part) {
    return part.length > 0;
  });
  const bParts = b.replace(/\/$/, '').split('/').filter(function (part) {
    return part.length > 0;
  });
  let count = 0;
  const limit = aParts.length < bParts.length ? aParts.length : bParts.length;
  for (let i = 0; i < limit; i++) {
    if (aParts[i] !== bParts[i]) {
      break;
    }
    count += 1;
  }
  return count;
}

export function isAllowedDiscoveryPath(path: string): boolean {
  const segments = path.split('/');
  for (let i = 0; i < segments.length; i++) {
    for (let j = 0; j < DENYLIST_SEGMENTS.length; j++) {
      if (segments[i] === DENYLIST_SEGMENTS[j]) {
        return false;
      }
    }
  }
  return true;
}

export function rankRepoPaths(paths: readonly string[], scorePath: (path: string) => number): string[] {
  const ranked = paths.slice();
  ranked.sort(function (a, b) {
    const diff = scorePath(b) - scorePath(a);
    if (diff !== 0) {
      return diff;
    }
    if (a.length !== b.length) {
      return a.length - b.length;
    }
    return a.localeCompare(b);
  });
  return ranked;
}

function scorePathDepth(path: string): number {
  return -path.split('/').length;
}

function scoreTestPenalty(path: string): number {
  const lower = path.toLowerCase();
  for (let i = 0; i < TEST_PATH_SEGMENTS.length; i++) {
    if (lower.includes(TEST_PATH_SEGMENTS[i])) {
      return -25;
    }
  }
  return 0;
}

export function isTailwindConfigPath(path: string): boolean {
  if (!isAllowedDiscoveryPath(path)) {
    return false;
  }
  return basename(path).startsWith('tailwind.config.');
}

export function scoreTailwindConfigPath(path: string): number {
  let score = 100 + scorePathDepth(path);
  if (dirname(path).length === 0) {
    score += 20;
  }
  return score + scoreTestPenalty(path);
}

export function discoverTailwindConfigPaths(repoPaths: readonly string[]): string[] {
  const matches: string[] = [];
  for (let i = 0; i < repoPaths.length; i++) {
    const path = repoPaths[i];
    if (isTailwindConfigPath(path)) {
      matches.push(path);
    }
  }
  return rankRepoPaths(matches, scoreTailwindConfigPath);
}

const CSS_THEME_BASENAMES: Record<string, number> = {
  'globals.css': 100,
  'tokens.css': 90,
  'theme.css': 85,
  'app.css': 70,
  'index.css': 60,
  'main.css': 55,
};

export function isCssThemeCandidatePath(path: string): boolean {
  if (!isAllowedDiscoveryPath(path) || !path.endsWith('.css')) {
    return false;
  }
  const base = basename(path).toLowerCase();
  return Object.prototype.hasOwnProperty.call(CSS_THEME_BASENAMES, base);
}

export function scoreCssThemePath(path: string): number {
  const base = basename(path).toLowerCase();
  const baseScore =
    CSS_THEME_BASENAMES[base] !== undefined ? CSS_THEME_BASENAMES[base] : 40;
  let score = baseScore + scorePathDepth(path) + scoreTestPenalty(path);
  if (path.includes('/app/')) {
    score += 8;
  }
  if (path.includes('/styles/')) {
    score += 6;
  }
  return score;
}

export function discoverCssThemePaths(repoPaths: readonly string[]): string[] {
  const matches: string[] = [];
  for (let i = 0; i < repoPaths.length; i++) {
    const path = repoPaths[i];
    if (isCssThemeCandidatePath(path)) {
      matches.push(path);
    }
  }
  return rankRepoPaths(matches, scoreCssThemePath);
}

export function isStyleDictionaryConfigPath(path: string): boolean {
  if (!isAllowedDiscoveryPath(path)) {
    return false;
  }
  const base = basename(path);
  return base === 'style-dictionary.config.js' || base === 'style-dictionary.config.json';
}

export function discoverStyleDictionaryConfigPaths(repoPaths: readonly string[]): string[] {
  const matches: string[] = [];
  for (let i = 0; i < repoPaths.length; i++) {
    const path = repoPaths[i];
    if (isStyleDictionaryConfigPath(path)) {
      matches.push(path);
    }
  }
  return rankRepoPaths(matches, function (path) {
    return 100 + scorePathDepth(path);
  });
}

export function isTokensJsonPath(path: string): boolean {
  if (!isAllowedDiscoveryPath(path)) {
    return false;
  }
  return basename(path) === 'tokens.json';
}

export function scoreTokensJsonPath(path: string): number {
  let score = 80 + scorePathDepth(path) + scoreTestPenalty(path);
  if (path.startsWith('design/')) {
    score += 10;
  }
  if (path.includes('/tokens/')) {
    score += 8;
  }
  return score;
}

export function discoverTokensJsonPaths(repoPaths: readonly string[]): string[] {
  const matches: string[] = [];
  for (let i = 0; i < repoPaths.length; i++) {
    const path = repoPaths[i];
    if (isTokensJsonPath(path)) {
      matches.push(path);
    }
  }
  return rankRepoPaths(matches, scoreTokensJsonPath);
}

export function listAncestorDirectories(path: string): string[] {
  let current = path.replace(/\\/g, '/').replace(/\/$/, '');
  const dirs: string[] = [];
  while (current.length > 0) {
    dirs.push(current);
    const slash = current.lastIndexOf('/');
    if (slash <= 0) {
      break;
    }
    current = current.slice(0, slash);
  }
  return dirs;
}

/**
 * Pick the directory root with the most importable source files for a framework.
 * Uses only paths present in the repo tree — no hardcoded repo layouts.
 */
export function discoverImportSourceRoot(
  repoPaths: readonly string[],
  framework: ComponentFramework,
  specsPath?: string,
): string {
  const matchingFiles: string[] = [];
  for (let i = 0; i < repoPaths.length; i++) {
    const path = repoPaths[i];
    if (!isAllowedDiscoveryPath(path)) {
      continue;
    }
    if (shouldIncludeImportSourcePath(path, framework)) {
      matchingFiles.push(path);
    }
  }

  if (matchingFiles.length === 0) {
    return deriveComponentsRoot(specsPath);
  }

  const dirCounts: Record<string, number> = {};
  for (let f = 0; f < matchingFiles.length; f++) {
    const dir = ensureTrailingSlash(dirname(matchingFiles[f]));
    dirCounts[dir] = (dirCounts[dir] !== undefined ? dirCounts[dir] : 0) + 1;
  }

  const specsAnchor =
    specsPath !== undefined && specsPath.length > 0 ? specsPath.replace(/\\/g, '/') : '';

  let bestRoot = deriveComponentsRoot(specsPath);
  let bestScore = -1;

  for (const dir in dirCounts) {
    if (!Object.prototype.hasOwnProperty.call(dirCounts, dir)) {
      continue;
    }
    const count = dirCounts[dir];
    let score = count * 10;
    if (specsAnchor.length > 0) {
      score += sharedSegmentCount(dir, specsAnchor) * 3;
    }
    if (dir.endsWith('/ui/')) {
      score += 2;
    }
    if (score > bestScore || (score === bestScore && dir.length > bestRoot.length)) {
      bestScore = score;
      bestRoot = dir;
    }
  }

  return bestRoot;
}
