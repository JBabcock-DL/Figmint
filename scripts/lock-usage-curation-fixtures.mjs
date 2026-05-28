import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function sortAxisKeys(matrix) {
  return Object.keys(matrix).sort();
}

function formatVariantName(combo) {
  const keys = Object.keys(combo).sort();
  const parts = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const raw = combo[key];
    let val;
    if (typeof raw === 'boolean') {
      val = raw ? 'true' : 'false';
    } else {
      val = String(raw);
    }
    parts.push(key + '=' + val);
  }
  return parts.join(', ');
}

function expandVariantMatrix(matrix) {
  const keys = sortAxisKeys(matrix);
  if (keys.length === 0) {
    return [];
  }
  const results = [];

  function recurse(index, combo) {
    if (index >= keys.length) {
      results.push({ name: formatVariantName(combo), combo: Object.assign({}, combo) });
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

function coverageKey(axis, value) {
  return axis + ':' + String(value);
}

function comboLexCompare(a, b, axes, matrix) {
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    const values = matrix[axis];
    const aIdx = values.indexOf(a[axis]);
    const bIdx = values.indexOf(b[axis]);
    const cmp = aIdx - bIdx;
    if (cmp !== 0) {
      return cmp;
    }
  }
  return 0;
}

function countNewCoverage(combo, axes, covered) {
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

function mergeCoverage(combo, axes, covered) {
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    covered.add(coverageKey(axis, combo[axis]));
  }
}

function buildBaseline(variantMatrix, axes) {
  const baseline = {};
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    baseline[axis] = variantMatrix[axis][0];
  }
  return baseline;
}

function combosEqual(a, b, axes) {
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    if (a[axis] !== b[axis]) {
      return false;
    }
  }
  return true;
}

function curateVariantCombos(variantMatrix, maxInstances) {
  const max = maxInstances !== undefined ? maxInstances : 6;
  const axes = sortAxisKeys(variantMatrix);
  const expanded = expandVariantMatrix(variantMatrix);
  const combos = expanded.map((entry) => Object.assign({}, entry.combo));

  if (combos.length <= max) {
    return combos;
  }

  const baseline = buildBaseline(variantMatrix, axes);
  const picked = [Object.assign({}, baseline)];
  const covered = new Set();
  mergeCoverage(baseline, axes, covered);

  const remaining = [];
  for (let i = 0; i < combos.length; i++) {
    const combo = combos[i];
    if (!combosEqual(combo, baseline, axes)) {
      remaining.push(Object.assign({}, combo));
    }
  }

  remaining.sort((a, b) => comboLexCompare(a, b, axes, variantMatrix));

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

const acMatrix = JSON.parse(
  readFileSync(
    join(root, 'src/core/components/scaffold/__fixtures__/usage-curation-ac-matrix.v1.json'),
    'utf8',
  ),
);

const buttonSpec = JSON.parse(
  readFileSync(join(root, 'src/io/formats/__fixtures__/component-spec-button.json'), 'utf8'),
);

const acPicks = curateVariantCombos(acMatrix, 6);
const buttonPicks = curateVariantCombos(buttonSpec.variantMatrix, 6);

writeFileSync(
  join(root, 'src/core/components/scaffold/__fixtures__/usage-curation-ac-matrix.picks.v1.json'),
  JSON.stringify(acPicks, null, 2) + '\n',
);

writeFileSync(
  join(root, 'src/core/components/scaffold/__fixtures__/usage-curation-button-3x3.picks.v1.json'),
  JSON.stringify(buttonPicks, null, 2) + '\n',
);

console.log('Wrote AC picks:', acPicks.length);
console.log('Wrote Button picks:', buttonPicks.length);
