import { describe, expect, it } from 'vitest';

import type { VariableComparable } from '@/core/drift/types';
import { variableStatesEqual } from '@/core/drift/variableEqual';

function floatComparable(
  value: number,
  codeSyntax?: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>,
): VariableComparable {
  return {
    resolvedType: 'FLOAT',
    valuesByMode: { Default: value },
    codeSyntax: codeSyntax !== undefined ? codeSyntax : {},
  };
}

describe('variableStatesEqual', () => {
  it('returns true for matching float values', () => {
    expect(variableStatesEqual(floatComparable(16), floatComparable(16))).toBe(true);
  });

  it('returns false when resolvedType differs', () => {
    const color: VariableComparable = {
      resolvedType: 'COLOR',
      valuesByMode: { Default: { r: 1, g: 0, b: 0, a: 1 } },
      codeSyntax: {},
    };
    expect(variableStatesEqual(color, floatComparable(1))).toBe(false);
  });

  it('treats color values within epsilon as equal', () => {
    const left: VariableComparable = {
      resolvedType: 'COLOR',
      valuesByMode: { Default: { r: 0.5, g: 0.5, b: 0.5, a: 1 } },
      codeSyntax: {},
    };
    const right: VariableComparable = {
      resolvedType: 'COLOR',
      valuesByMode: { Default: { r: 0.50001, g: 0.5, b: 0.5, a: 1 } },
      codeSyntax: {},
    };
    expect(variableStatesEqual(left, right)).toBe(true);
  });

  it('matches variable aliases by id', () => {
    const left: VariableComparable = {
      resolvedType: 'COLOR',
      valuesByMode: { Default: { type: 'VARIABLE_ALIAS', id: 'VariableID:1' } },
      codeSyntax: {},
    };
    const right: VariableComparable = {
      resolvedType: 'COLOR',
      valuesByMode: { Default: { type: 'VARIABLE_ALIAS', id: 'VariableID:1' } },
      codeSyntax: {},
    };
    expect(variableStatesEqual(left, right)).toBe(true);
  });

  it('returns false when codeSyntax differs', () => {
    expect(
      variableStatesEqual(
        floatComparable(1, { WEB: 'var(--a)' }),
        floatComparable(1, { WEB: 'var(--b)' }),
      ),
    ).toBe(false);
  });
});
