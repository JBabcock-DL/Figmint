import type { VariantCombo } from './types';
import { expandVariantMatrix, sortAxisKeys } from './variantMatrix';

export const MAX_USAGE_INSTANCES = 6;

function coverageKey(axis: string, value: string | boolean): string {
  return axis + ':' + String(value);
}

function compareAxisValue(a: string | boolean, b: string | boolean): number {
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    if (a === b) {
      return 0;
    }
    return a ? 1 : -1;
  }
  return String(a).localeCompare(String(b));
}

export function comboLexCompare(
  a: VariantCombo,
  b: VariantCombo,
  axes: string[],
  matrix?: Record<string, (string | boolean)[]>,
): number {
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    let cmp: number;
    if (matrix !== undefined) {
      const values = matrix[axis];
      const aIdx = values.indexOf(a[axis]);
      const bIdx = values.indexOf(b[axis]);
      cmp = aIdx - bIdx;
    } else {
      cmp = compareAxisValue(a[axis], b[axis]);
    }
    if (cmp !== 0) {
      return cmp;
    }
  }
  return 0;
}

export function countNewCoverage(
  combo: VariantCombo,
  axes: string[],
  covered: Set<string>,
): number {
  let count = 0;
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    const key = coverageKey(axis, combo[axis]);
    if (!covered.has(key)) {
      count += 1;
    }
  }
  return count;
}

function mergeCoverage(combo: VariantCombo, axes: string[], covered: Set<string>): void {
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    covered.add(coverageKey(axis, combo[axis]));
  }
}

function buildBaseline(
  variantMatrix: Record<string, (string | boolean)[]>,
  axes: string[],
): VariantCombo {
  const baseline: VariantCombo = {};
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    baseline[axis] = variantMatrix[axis][0];
  }
  return baseline;
}

function combosEqual(a: VariantCombo, b: VariantCombo, axes: string[]): boolean {
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    if (a[axis] !== b[axis]) {
      return false;
    }
  }
  return true;
}

export function curateVariantCombos(
  variantMatrix: Record<string, (string | boolean)[]>,
  maxInstances?: number,
): VariantCombo[] {
  const max = maxInstances !== undefined ? maxInstances : MAX_USAGE_INSTANCES;
  const axes = sortAxisKeys(variantMatrix);
  const expanded = expandVariantMatrix(variantMatrix);
  const combos: VariantCombo[] = [];
  for (let i = 0; i < expanded.length; i++) {
    combos.push(Object.assign({}, expanded[i].combo));
  }

  if (combos.length <= max) {
    return combos;
  }

  const baseline = buildBaseline(variantMatrix, axes);
  const picked: VariantCombo[] = [Object.assign({}, baseline)];
  const covered = new Set<string>();
  mergeCoverage(baseline, axes, covered);

  const remaining: VariantCombo[] = [];
  for (let i = 0; i < combos.length; i++) {
    const combo = combos[i];
    if (!combosEqual(combo, baseline, axes)) {
      remaining.push(Object.assign({}, combo));
    }
  }

  remaining.sort(function sortRemaining(a, b) {
    return comboLexCompare(a, b, axes, variantMatrix);
  });

  while (picked.length < max && remaining.length > 0) {
    let bestIndex = 0;
    let bestCoverage = countNewCoverage(remaining[0], axes, covered);

    for (let i = 1; i < remaining.length; i++) {
      const candidate = remaining[i];
      const coverage = countNewCoverage(candidate, axes, covered);
      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        bestIndex = i;
      } else if (coverage === bestCoverage) {
        if (comboLexCompare(candidate, remaining[bestIndex], axes, variantMatrix) < 0) {
          bestIndex = i;
        }
      }
    }

    const best = remaining[bestIndex];
    picked.push(Object.assign({}, best));
    mergeCoverage(best, axes, covered);
    remaining.splice(bestIndex, 1);
  }

  return picked;
}

export function comboToSetProperties(
  combo: VariantCombo,
  axes: string[],
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    const val = combo[axis];
    if (typeof val === 'boolean') {
      out[axis] = val ? 'true' : 'false';
    } else {
      out[axis] = String(val);
    }
  }
  return out;
}

export function formatVariantTupleLabel(combo: VariantCombo, axes: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    const raw = combo[axis];
    let val: string;
    if (typeof raw === 'boolean') {
      val = raw ? 'true' : 'false';
    } else {
      val = String(raw);
    }
    parts.push(axis + '=' + val);
  }
  return parts.join(', ');
}
