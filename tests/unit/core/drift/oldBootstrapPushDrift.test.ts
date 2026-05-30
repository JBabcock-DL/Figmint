import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { FigmaCollectionSnapshot } from '@/core/audit/types';
import bootstrapComplete from '@/core/variables/__fixtures__/bootstrap-complete.v1.json';
import { detectVariableDrift, flattenFigmaVariableSnapshots, flattenRepoTokens } from '@/core/drift/variables';
import { adaptDTCG } from '@/io/sources/adapters/dtcg';
import type { TokensV1 } from '@detroitlabs/fighub-contracts';

function hashHex(seed: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return '#' + (h & 0xffffff).toString(16).padStart(6, '0');
}

function hexToRgb(hex: string): RGBA {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
}

function neutralFormulaHex(stop: number): string {
  const channel = String(Math.round((stop / 900) * 255)).padStart(2, '0');
  return `#${channel}${channel}${channel}`;
}

/** Simulates Figma after bootstrap-complete BEFORE repo color overlay fix. */
function figmaAfterOldBootstrap(bench: TokensV1): FigmaCollectionSnapshot[] {
  const variables = bench.tokens
    .filter(function (token) {
      return token.collection === 'primitives' && token.type === 'COLOR';
    })
    .map(function (token) {
      let hex: string;
      if (token.name.startsWith('color/neutral/')) {
        const stop = Number(token.name.split('/').pop());
        hex = neutralFormulaHex(stop);
      } else {
        hex = hashHex(token.name);
      }
      return {
        id: 'V:' + token.name,
        name: token.name,
        collectionId: 'VC:prim',
        collectionName: 'Primitives',
        resolvedType: 'COLOR' as const,
        valuesByMode: { Default: hexToRgb(hex) },
        codeSyntax: token.codeSyntax ?? {},
      };
    });

  return [
    {
      id: 'VC:prim',
      name: 'Primitives',
      modes: [{ modeId: 'M:def', name: 'Default' }],
      variables: variables,
    },
  ];
}

describe('why only primary/50 push-drifts after old bootstrap', () => {
  it('hash-vs-repo mismatches in bootstrap scope produce a single push drift', () => {
    const raw = JSON.parse(readFileSync('design/tokens.json', 'utf8'));
    const repo = adaptDTCG(raw);
    const repoFlat = flattenRepoTokens(repo);
    const bench = bootstrapComplete as TokensV1;

    const figmaFlat = flattenFigmaVariableSnapshots(figmaAfterOldBootstrap(bench), {
      resolveAliases: true,
    });

    const pushDrifts = detectVariableDrift({
      figmaTokens: figmaFlat,
      repoTokens: repoFlat,
      snapshotTokens: {},
    }).drifts.filter(function (entry) {
      return entry.direction === 'push';
    });

    expect(pushDrifts.map(function (entry) {
      return entry.id;
    })).toEqual(['var/Primitives/color/primary/50']);
  });
});
