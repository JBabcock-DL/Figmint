import type { ExpandedVariant, VariantCombo } from './types';

export function sortAxisKeys(matrix: Record<string, (string | boolean)[]>): string[] {
  return Object.keys(matrix).sort();
}

export function fnv1a32Hex(input: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function formatVariantName(combo: VariantCombo): string {
  const keys = Object.keys(combo).sort();
  const parts: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const raw = combo[key];
    let val: string;
    if (typeof raw === 'boolean') {
      val = raw ? 'true' : 'false';
    } else {
      val = String(raw);
    }
    parts.push(key + '=' + val);
  }
  return parts.join(', ');
}

export function expandVariantMatrix(
  matrix: Record<string, (string | boolean)[]>,
): ExpandedVariant[] {
  const keys = sortAxisKeys(matrix);
  if (keys.length === 0) {
    return [];
  }
  const results: ExpandedVariant[] = [];

  function recurse(index: number, combo: VariantCombo): void {
    if (index >= keys.length) {
      results.push({
        name: formatVariantName(combo),
        combo: Object.assign({}, combo),
      });
      return;
    }
    const axisKey = keys[index];
    const values = matrix[axisKey];
    for (let v = 0; v < values.length; v++) {
      combo[axisKey] = values[v];
      recurse(index + 1, combo);
    }
  }

  recurse(0, {});
  return results;
}

export function hashVariantMatrix(matrix: Record<string, (string | boolean)[]>): string {
  const keys = sortAxisKeys(matrix);
  const canonical: Record<string, (string | boolean)[]> = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    canonical[key] = matrix[key];
  }
  return fnv1a32Hex(JSON.stringify(canonical));
}

export function buildScaffoldId(specName: string, matrix: Record<string, (string | boolean)[]>): string {
  return 'fighub:scaffold:v1:' + specName + ':' + hashVariantMatrix(matrix);
}

export function parseVariantName(name: string): VariantCombo | null {
  if (name === '') {
    return null;
  }
  const segments = name.split(', ');
  const combo: VariantCombo = {};
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const eqIndex = segment.indexOf('=');
    if (eqIndex < 0) {
      return null;
    }
    const key = segment.slice(0, eqIndex);
    const value = segment.slice(eqIndex + 1);
    if (key === '') {
      return null;
    }
    if (value === 'true') {
      combo[key] = true;
    } else if (value === 'false') {
      combo[key] = false;
    } else {
      combo[key] = value;
    }
  }
  return combo;
}

export function expectedVariantCount(matrix: Record<string, (string | boolean)[]>): number {
  const keys = sortAxisKeys(matrix);
  if (keys.length === 0) {
    return 0;
  }
  let count = 1;
  for (let i = 0; i < keys.length; i++) {
    const values = matrix[keys[i]];
    count *= values.length;
  }
  return count;
}
