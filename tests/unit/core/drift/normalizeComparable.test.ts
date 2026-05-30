import { describe, expect, it } from 'vitest';

import {
  normalizeVariableComparable,
  normalizeVariableValue,
} from '@/core/drift/normalizeComparable';
import { variableStatesEqual } from '@/core/drift/variableEqual';

describe('normalizeVariableComparable', () => {
  it('aligns figma-native primary/50 floats with repo hex fractions', () => {
    const figmaNative: RGBA = {
      r: 0.050600916147232056,
      g: 0.47155454754829407,
      b: 0.028445463627576828,
      a: 1,
    };
    const repoHex: RGBA = { r: 13 / 255, g: 120 / 255, b: 7 / 255, a: 1 };

    const figma = normalizeVariableComparable(
      {
        resolvedType: 'COLOR',
        valuesByMode: { Default: figmaNative },
        codeSyntax: {
          WEB: 'var(--color-primary-50)',
          ANDROID: 'color-primary-50',
          iOS: '.Palette.primary.50',
        },
      },
      { collectionName: 'Primitives', variableName: 'color/primary/50' },
    );
    const repo = normalizeVariableComparable({
      resolvedType: 'COLOR',
      valuesByMode: { Default: repoHex },
      codeSyntax: {
        WEB: 'var(--color-primary-50)',
        ANDROID: 'color-primary-50',
        iOS: '.Palette.primary.50',
      },
    });

    expect(normalizeVariableValue(figmaNative)).toEqual(normalizeVariableValue(repoHex));
    expect(variableStatesEqual(figma, repo)).toBe(true);
  });
});
