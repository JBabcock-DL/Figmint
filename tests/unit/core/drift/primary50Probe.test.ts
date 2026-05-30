import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { FigmaCollectionSnapshot } from '@/core/audit/types';
import { detectVariableDrift, flattenFigmaVariableSnapshots, flattenRepoTokens } from '@/core/drift/variables';
import { variableStatesEqual } from '@/core/drift/variableEqual';
import { mapCodeSyntax } from '@/core/variables/codeSyntax';
import { adaptDTCG } from '@/io/sources/adapters/dtcg';
import { parseHexColor } from '@/io/sources/adapters/internal/colors';

const KEY = 'Primitives/color/primary/50';
const DRIFT_ID = 'var/Primitives/color/primary/50';

/** Figma-native floats observed on file Dw8NkEiG91NhjYqRPNTOOu after bootstrap push. */
const FIGMA_PRIMARY_50: RGBA = {
  r: 0.050600916147232056,
  g: 0.47155454754829407,
  b: 0.028445463627576828,
  a: 1,
};

describe('color/primary/50 drift probe', () => {
  it('repo and figma-native floats compare equal for drift', () => {
    const raw = JSON.parse(readFileSync('design/tokens.json', 'utf8'));
    const tokens = adaptDTCG(raw);
    const repoFlat = flattenRepoTokens(tokens);
    const repoVal = repoFlat[KEY];
    expect(repoVal).toBeDefined();

    const token = tokens.tokens.find(function (entry) {
      return entry.collection === 'primitives' && entry.name === 'color/primary/50';
    });
    expect(token).toBeDefined();

    const figmaCollections: FigmaCollectionSnapshot[] = [
      {
        id: 'VC:prim',
        name: 'Primitives',
        modes: [{ modeId: 'M:def', name: 'Default' }],
        variables: [
          {
            id: 'V:primary50',
            name: 'color/primary/50',
            collectionId: 'VC:prim',
            collectionName: 'Primitives',
            resolvedType: 'COLOR',
            valuesByMode: { Default: FIGMA_PRIMARY_50 },
            codeSyntax: token !== undefined ? mapCodeSyntax(token) : {},
          },
        ],
      },
    ];

    const figmaFlat = flattenFigmaVariableSnapshots(figmaCollections, { resolveAliases: true });
    const figmaVal = figmaFlat[KEY];
    expect(figmaVal).toBeDefined();
    expect(variableStatesEqual(figmaVal, repoVal)).toBe(true);

    const drift = detectVariableDrift({
      figmaTokens: figmaFlat,
      repoTokens: repoFlat,
      snapshotTokens: {},
    });
    const entry = drift.drifts.find(function (d) {
      return d.id === DRIFT_ID;
    });
    expect(entry).toBeUndefined();
  });

  it('repo flatten uses stored codeSyntax from DTCG extensions', () => {
    const raw = JSON.parse(readFileSync('design/tokens.json', 'utf8'));
    const tokens = adaptDTCG(raw);
    const token = tokens.tokens.find(function (entry) {
      return entry.collection === 'primitives' && entry.name === 'color/primary/50';
    });
    expect(token?.codeSyntax).toEqual({
      WEB: 'var(--color-primary-50)',
      ANDROID: 'color-primary-50',
      iOS: '.Palette.primary.50',
    });
    expect(mapCodeSyntax(token!)).toEqual(token?.codeSyntax);
  });

  it('fills derived codeSyntax when figma read is empty so bootstrap tokens do not false-drift', () => {
    const raw = JSON.parse(readFileSync('design/tokens.json', 'utf8'));
    const tokens = adaptDTCG(raw);
    const repoFlat = flattenRepoTokens(tokens);

    const figmaCollections: FigmaCollectionSnapshot[] = [
      {
        id: 'VC:prim',
        name: 'Primitives',
        modes: [{ modeId: 'M:def', name: 'Default' }],
        variables: [
          {
            id: 'V:primary50',
            name: 'color/primary/50',
            collectionId: 'VC:prim',
            collectionName: 'Primitives',
            resolvedType: 'COLOR',
            valuesByMode: { Default: FIGMA_PRIMARY_50 },
            codeSyntax: {},
          },
        ],
      },
    ];

    const figmaFlat = flattenFigmaVariableSnapshots(figmaCollections, { resolveAliases: true });
    expect(variableStatesEqual(figmaFlat[KEY], repoFlat[KEY])).toBe(true);
  });

  it('hex #0d7807 matches figma-native channel rounding', () => {
    const hex = parseHexColor('#0d7807');
    expect(hex).not.toBeNull();
    expect(variableStatesEqual(
      {
        resolvedType: 'COLOR',
        valuesByMode: { Default: FIGMA_PRIMARY_50 },
        codeSyntax: {},
      },
      {
        resolvedType: 'COLOR',
        valuesByMode: { Default: hex as RGBA },
        codeSyntax: {},
      },
    )).toBe(true);
  });
});
