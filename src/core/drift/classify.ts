import type { DriftDirection } from './types';

function valueEqualOptional<T>(
  a: T | null,
  b: T | null,
  equal: (left: T, right: T) => boolean,
): boolean {
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return equal(a, b);
}

export function isSynced(direction: DriftDirection): boolean {
  return direction === 'synced';
}

export function classifyThreeWay<T>(
  figma: T | null,
  repo: T | null,
  snapshot: T | null,
  equal: (left: T, right: T) => boolean,
): DriftDirection {
  const baseline = snapshot !== null ? snapshot : repo;

  if (figma === null && repo === null) {
    return 'synced';
  }

  if (figma === null && repo !== null) {
    return valueEqualOptional(repo, baseline, equal) ? 'synced' : 'pull';
  }

  if (figma !== null && repo === null) {
    return valueEqualOptional(figma, baseline, equal) ? 'synced' : 'push';
  }

  const fEqS = valueEqualOptional(figma, baseline, equal);
  const rEqS = valueEqualOptional(repo, baseline, equal);
  const fEqR = valueEqualOptional(figma, repo, equal);

  if (!fEqS && rEqS) {
    return 'push';
  }
  if (fEqS && !rEqS) {
    return 'pull';
  }
  if (!fEqS && !rEqS && !fEqR) {
    return 'conflict';
  }
  return 'synced';
}
