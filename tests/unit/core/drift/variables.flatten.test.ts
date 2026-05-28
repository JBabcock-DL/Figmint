import { describe, expect, it } from 'vitest';

import type { FigmaCollectionSnapshot } from '@/core/audit/types';
import { flattenFigmaVariableSnapshots, flattenRepoTokens } from '@/core/drift/variables';

import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import tokensMinimalJson from '../../../fixtures/audit/tokens-minimal.v1.json';

const tokensMinimal = tokensMinimalJson as TokensV1;

describe('flatten variable maps', () => {
  it('flattens Figma snapshots with collection slash name keys', () => {
    const collections: FigmaCollectionSnapshot[] = [
      {
        id: 'VC:1',
        name: 'Primitives',
        modes: [{ modeId: 'M:1', name: 'Default' }],
        variables: [
          {
            id: 'V:1',
            name: 'color/neutral/100',
            collectionId: 'VC:1',
            collectionName: 'Primitives',
            resolvedType: 'COLOR',
            valuesByMode: { Default: { r: 0.96, g: 0.96, b: 0.96, a: 1 } },
            codeSyntax: {},
          },
        ],
      },
    ];

    const flat = flattenFigmaVariableSnapshots(collections);
    expect(flat['Primitives/color/neutral/100']).toBeDefined();
    expect(flat['Primitives/color/neutral/100'].resolvedType).toBe('COLOR');
  });

  it('flattens repo TokensV1 using display collection names', () => {
    const flat = flattenRepoTokens(tokensMinimal);
    expect(flat['Primitives/color/neutral/100']).toBeDefined();
    expect(flat['Theme/color/background/default'].valuesByMode.Light).toEqual({
      r: 0.96,
      g: 0.96,
      b: 0.96,
      a: 1,
    });
  });
});
