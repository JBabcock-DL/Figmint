import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { flattenRepoTokens } from '@/core/drift/variables';
import { resolveTokens } from '@/core/variables/resolveTokens';
import { adaptDTCG } from '@/io/sources/adapters/dtcg';

describe('flattenRepoTokens completeness', () => {
  it('includes primary/50 with a coercible Default color value', () => {
    const raw = JSON.parse(readFileSync('design/tokens.json', 'utf8'));
    const tokens = adaptDTCG(raw);
    const resolved = resolveTokens(tokens);
    expect(resolved.errors).toEqual([]);

    const entry = resolved.tokens.find(function (t) {
      return t.collection === 'primitives' && t.name === 'color/primary/50';
    });
    expect(entry?.resolvedValuesByMode.Default).toMatchObject({
      r: expect.any(Number),
      g: expect.any(Number),
      b: expect.any(Number),
      a: 1,
    });

    const flat = flattenRepoTokens(tokens);
    expect(flat['Primitives/color/primary/50']).toBeDefined();
  });
});
