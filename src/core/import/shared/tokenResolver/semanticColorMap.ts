import { resolveCanonicalPathForFragment } from './tailwindToCanonicalPath';
import { parseColorClassFragment } from './normalizeClassFragment';
import type { ColorUtility } from './types';

/** Map class-fragment raw entries (semantic names) to canonical variable paths. */
export function buildClassToCanonicalMap(
  rawMap: Record<string, string>,
  designTokenMap: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  const keys = Object.keys(rawMap);
  for (let i = 0; i < keys.length; i++) {
    const fragment = keys[i];
    const parsed = parseColorClassFragment(fragment);
    if (parsed === null) {
      continue;
    }
    const semantic = rawMap[fragment];
    const canonical = resolveCanonicalPathForFragment(
      parsed.utility,
      semantic,
      designTokenMap,
    );
    if (canonical !== null) {
      result[fragment] = canonical;
    }
  }
  return result;
}

export function canonicalPathForManualValue(value: string): string {
  return value.trim();
}

export function utilityFromFragment(fragment: string): ColorUtility | null {
  const parsed = parseColorClassFragment(fragment);
  if (parsed === null) {
    return null;
  }
  return parsed.utility;
}
