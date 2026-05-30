import { kebabCase } from '@/core/drift/componentKeys';

const PATH_DENYLIST_SEGMENTS = ['node_modules', '.git'];
const PATH_DENYLIST_FILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
/** Broad `.v1.json` matches skip drift/registry/handoff fixtures (not component catalog). */
const SPEC_V1_DENYLIST_SEGMENTS = [
  '/drift/',
  '/registry/',
  '/handoff/',
  '/audit/',
  '/sinks/',
  '/ui/export/',
  '/io/sources/',
];

function isDeniedPath(path: string): boolean {
  const segments = path.split('/');
  for (let i = 0; i < segments.length; i++) {
    for (let j = 0; j < PATH_DENYLIST_SEGMENTS.length; j++) {
      if (segments[i] === PATH_DENYLIST_SEGMENTS[j]) {
        return true;
      }
    }
  }
  const filename = segments[segments.length - 1];
  for (let i = 0; i < PATH_DENYLIST_FILES.length; i++) {
    if (filename === PATH_DENYLIST_FILES[i]) {
      return true;
    }
  }
  return false;
}

function isUnderPrefix(path: string, prefix: string): boolean {
  const normalized = prefix.endsWith('/') ? prefix : prefix + '/';
  return path.startsWith(normalized);
}

function isDeniedSpecV1Path(path: string): boolean {
  for (let i = 0; i < SPEC_V1_DENYLIST_SEGMENTS.length; i++) {
    if (path.includes(SPEC_V1_DENYLIST_SEGMENTS[i])) {
      return true;
    }
  }
  return false;
}

export function normalizeSpecsPath(specsPath: string): string {
  let base = specsPath;
  if (base.length === 0) {
    base = 'components/';
  }
  if (base.length > 0 && !base.endsWith('/')) {
    base = base + '/';
  }
  return base;
}

/**
 * Discover component-spec JSON for all frameworks (react, vue, wc, swiftui, compose).
 * Framework is read from file content at scaffold time — never filtered here.
 */
export function matchesCatalogPath(path: string, specsPath: string): boolean {
  if (isDeniedPath(path)) {
    return false;
  }
  if (path.endsWith('.component-spec.v1.json')) {
    return true;
  }
  if (path.endsWith('.v1.json') && isUnderPrefix(path, 'design/component-specs')) {
    return true;
  }
  if (
    path.endsWith('.v1.json') &&
    (path.includes('/component-spec/') || path.includes('/component-specs/')) &&
    !isDeniedSpecV1Path(path)
  ) {
    return true;
  }
  const normalizedSpecs = normalizeSpecsPath(specsPath);
  if (path.endsWith('.json') && isUnderPrefix(path, normalizedSpecs)) {
    return true;
  }
  return false;
}

function extractFilenameStem(path: string): string {
  const segments = path.split('/');
  const filename = segments[segments.length - 1];
  if (filename.endsWith('.component-spec.v1.json')) {
    return filename.slice(0, -'.component-spec.v1.json'.length);
  }
  if (filename.endsWith('.v1.json')) {
    return filename.slice(0, -'.v1.json'.length);
  }
  if (filename.endsWith('.json')) {
    return filename.slice(0, -'.json'.length);
  }
  return filename;
}

export function extractCatalogKey(path: string): string {
  return kebabCase(extractFilenameStem(path));
}

/** Resolve a component-spec blob path from a flat repo path list (case-insensitive key match). */
export function findComponentSpecPathInRepo(
  repoPaths: readonly string[],
  componentKey: string,
  specsPath?: string,
): string | null {
  const normalizedSpecs =
    specsPath !== undefined && specsPath.length > 0 ? specsPath : 'components/';
  const targetKey = kebabCase(componentKey);
  let best: string | null = null;

  for (let i = 0; i < repoPaths.length; i++) {
    const path = repoPaths[i];
    if (!matchesCatalogPath(path, normalizedSpecs)) {
      continue;
    }
    if (extractCatalogKey(path) !== targetKey) {
      continue;
    }
    if (best === null || path.length < best.length) {
      best = path;
    }
  }

  return best;
}
