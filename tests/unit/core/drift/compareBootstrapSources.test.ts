import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { variableStatesEqual } from '@/core/drift/variableEqual';
import { flattenRepoTokens } from '@/core/drift/variables';
import { adaptDTCG } from '@/io/sources/adapters/dtcg';
import bootstrapComplete from '@/core/variables/__fixtures__/bootstrap-complete.v1.json';
import type { TokensV1 } from '@detroitlabs/fighub-contracts';

function driftKeys(left: TokensV1, right: TokensV1): string[] {
  const leftFlat = flattenRepoTokens(left);
  const rightFlat = flattenRepoTokens(right);
  const keys = new Set([...Object.keys(leftFlat), ...Object.keys(rightFlat)]);
  const drifts: string[] = [];
  for (const key of keys) {
    const a = leftFlat[key];
    const b = rightFlat[key];
    if (a === undefined || b === undefined) {
      drifts.push(key + ' (missing side)');
      continue;
    }
    if (!variableStatesEqual(a, b)) {
      drifts.push(key);
    }
  }
  return drifts.sort();
}

describe('bootstrap-complete vs design/tokens.json', () => {
  it('reports how many token keys differ (explains single-token drift)', () => {
    const repoRaw = JSON.parse(readFileSync('design/tokens.json', 'utf8'));
    const repo = adaptDTCG(repoRaw);
    const bench = bootstrapComplete as TokensV1;

    expect(repo.tokens.length).toBeGreaterThan(0);
    expect(bench.tokens.length).toBeGreaterThan(0);

    const drifts = driftKeys(bench, repo);
    // eslint-disable-next-line no-console -- diagnostic
    console.log('token counts', { bench: bench.tokens.length, repo: repo.tokens.length, drifts: drifts.length });
    // eslint-disable-next-line no-console -- diagnostic
    console.log('drift keys sample', drifts.slice(0, 20));

    const primary50 = drifts.filter(function (key) {
      return key === 'primitives:color/primary/50';
    });
    expect(primary50).toEqual([]);
  });
});
