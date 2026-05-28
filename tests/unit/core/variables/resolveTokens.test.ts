import { describe, expect, it } from 'vitest';

import { resolveTokens } from '@/core/variables/resolveTokens';
import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import foundationsMinimal from '@/core/variables/__fixtures__/foundations-minimal.v1.json';

const tokens = foundationsMinimal as unknown as TokensV1;

describe('resolveTokens.ts', () => {
  it('resolves cross-collection aliases for audit view', () => {
    const result = resolveTokens(tokens);
    expect(result.errors).toEqual([]);
    const themeToken = result.tokens.find(
      (entry) => entry.collection === 'theme' && entry.name === 'color/background/default',
    );
    expect(themeToken).toBeDefined();
    expect(themeToken && themeToken.resolvedValuesByMode.Light).toEqual({
      r: 0.96,
      g: 0.96,
      b: 0.96,
      a: 1,
    });
  });

  it('detects missing alias targets', () => {
    const broken: TokensV1 = {
      ...tokens,
      tokens: [
        {
          collection: 'theme',
          name: 'color/broken',
          type: 'COLOR',
          valuesByMode: {
            Light: { aliasOf: { collection: 'primitives', name: 'missing/token' } },
          },
        },
      ],
    };
    const result = resolveTokens(broken);
    expect(result.errors.some((entry) => entry.includes('Missing alias target'))).toBe(true);
  });

  it('detects alias cycles within typography', () => {
    const cyclic: TokensV1 = {
      ...tokens,
      tokens: [
        {
          collection: 'typography',
          name: 'a',
          type: 'STRING',
          valuesByMode: { '100': { aliasOf: { collection: 'typography', name: 'b' } } },
        },
        {
          collection: 'typography',
          name: 'b',
          type: 'STRING',
          valuesByMode: { '100': { aliasOf: { collection: 'typography', name: 'a' } } },
        },
      ],
    };
    const result = resolveTokens(cyclic);
    expect(result.errors.some((entry) => entry.includes('cycle'))).toBe(true);
  });
});
