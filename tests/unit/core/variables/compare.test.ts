import { describe, expect, it } from 'vitest';

import { codeSyntaxEqual, shouldSkipVariable, valuesEqual } from '@/core/variables/compare';

import {
  asVariable,
  findCollectionByName,
  findVariable,
  installMockFigmaVariables,
  MockVariable,
  resetMockFigma,
} from './__mocks__/figmaVariables';

function color(r: number, g: number, b: number, a: number): RGBA {
  return { r, g, b, a };
}

describe('compare.ts', () => {
  it('valuesEqual compares COLOR as 8-bit channels (hex round-trip safe)', () => {
    expect(valuesEqual(color(1, 0, 0, 1), color(1, 0.00001, 0, 1))).toBe(true);
    expect(valuesEqual(color(1, 0, 0, 1), color(0.9, 0, 0, 1))).toBe(false);
    const figmaPrimary50 = {
      r: 0.050600916147232056,
      g: 0.47155454754829407,
      b: 0.028445463627576828,
      a: 1,
    };
    const repoPrimary50 = { r: 13 / 255, g: 120 / 255, b: 7 / 255, a: 1 };
    expect(valuesEqual(figmaPrimary50, repoPrimary50)).toBe(true);
  });

  it('valuesEqual compares alias ids', () => {
    expect(
      valuesEqual({ type: 'VARIABLE_ALIAS', id: 'a' }, { type: 'VARIABLE_ALIAS', id: 'a' }),
    ).toBe(true);
    expect(
      valuesEqual({ type: 'VARIABLE_ALIAS', id: 'a' }, { type: 'VARIABLE_ALIAS', id: 'b' }),
    ).toBe(false);
  });

  it('codeSyntaxEqual detects triple mismatch', () => {
    installMockFigmaVariables();
    const variable = asVariable(new MockVariable('color/test', 'col-1', 'COLOR'));
    variable.setVariableCodeSyntax('WEB', 'var(--test)');
    expect(codeSyntaxEqual(variable, { WEB: 'var(--test)' })).toBe(true);
    expect(codeSyntaxEqual(variable, { WEB: 'var(--other)' })).toBe(false);
    resetMockFigma();
  });

  it('shouldSkipVariable returns true only when all modes and codeSyntax match', () => {
    installMockFigmaVariables();
    const variable = asVariable(new MockVariable('color/test', 'col-1', 'COLOR'));
    variable.setValueForMode('mode-1', color(1, 0, 0, 1));
    variable.setVariableCodeSyntax('WEB', 'var(--test)');

    const token = {
      collection: 'primitives',
      name: 'color/test',
      type: 'COLOR',
      valuesByMode: { Default: color(1, 0, 0, 1) },
    } as const;

    expect(
      shouldSkipVariable(
        variable,
        token,
        { Default: 'mode-1' },
        { Default: color(1, 0, 0, 1) },
        { WEB: 'var(--test)' },
      ),
    ).toBe(true);

    expect(
      shouldSkipVariable(
        variable,
        token,
        { Default: 'mode-1' },
        { Default: color(0, 1, 0, 1) },
        { WEB: 'var(--test)' },
      ),
    ).toBe(false);
    resetMockFigma();
  });
});

describe('compare fixture helpers', () => {
  it('findVariable locates variables in mock store', () => {
    installMockFigmaVariables();
    const collection = findCollectionByName('Primitives');
    expect(collection).toBeUndefined();
    resetMockFigma();
    expect(findVariable('missing', 'x')).toBeUndefined();
  });
});
