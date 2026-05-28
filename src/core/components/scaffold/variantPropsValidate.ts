import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import type { VariantAxisValidation } from './types';

function stripPropertySuffix(key: string): string {
  const hashIndex = key.indexOf('#');
  if (hashIndex >= 0) {
    return key.slice(0, hashIndex);
  }
  return key;
}

function stringifyMatrixValue(value: string | boolean): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function findVariantDefinition(
  defs: ComponentPropertyDefinitions,
  axisKey: string,
): ComponentPropertyDefinitions[string] | null {
  const keys = Object.keys(defs);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const def = defs[key];
    if (def.type !== 'VARIANT') {
      continue;
    }
    if (stripPropertySuffix(key) === axisKey) {
      return def;
    }
  }
  return null;
}

function normalizeOptions(options: string[]): string[] {
  const copy = options.slice();
  copy.sort();
  return copy;
}

export function validateVariantProperties(
  componentSet: ComponentSetNode,
  matrix: ComponentSpecV1['variantMatrix'],
): Record<string, VariantAxisValidation> {
  const results: Record<string, VariantAxisValidation> = {};
  const defs =
    componentSet.componentPropertyDefinitions !== undefined &&
    componentSet.componentPropertyDefinitions !== null
      ? componentSet.componentPropertyDefinitions
      : {};
  const axisKeys = Object.keys(matrix);

  for (let i = 0; i < axisKeys.length; i++) {
    const axisKey = axisKeys[i];
    const expectedRaw = matrix[axisKey];
    const expected: string[] = [];
    for (let e = 0; e < expectedRaw.length; e++) {
      expected.push(stringifyMatrixValue(expectedRaw[e]));
    }

    const def = findVariantDefinition(defs, axisKey);
    if (def === null) {
      results[axisKey] = {
        ok: false,
        expected: normalizeOptions(expected),
        actual: [],
      };
      continue;
    }

    const actual = def.variantOptions !== undefined ? def.variantOptions.slice() : [];
    const expectedSorted = normalizeOptions(expected);
    const actualSorted = normalizeOptions(actual);

    let ok = expectedSorted.length === actualSorted.length;
    if (ok) {
      for (let j = 0; j < expectedSorted.length; j++) {
        if (expectedSorted[j] !== actualSorted[j]) {
          ok = false;
          break;
        }
      }
    }

    results[axisKey] = {
      ok: ok,
      expected: expectedSorted,
      actual: actualSorted,
    };
  }

  return results;
}
