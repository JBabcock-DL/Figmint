import { describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import {
  buildScaffoldId,
  expandVariantMatrix,
  expectedVariantCount,
  formatVariantName,
  hashVariantMatrix,
  parseVariantName,
  sortAxisKeys,
} from '@/core/components/scaffold/variantMatrix';

describe('variantMatrix', () => {
  const matrix3x2x2 = {
    variant: ['a', 'b', 'c'],
    size: ['sm', 'md'],
    disabled: [false, true],
  };

  it('expands 3x2x2 matrix to 12 combos with sorted naming', () => {
    const expanded = expandVariantMatrix(matrix3x2x2);
    expect(expanded).toHaveLength(12);
    expect(expanded[0].name).toBe('disabled=false, size=sm, variant=a');
    expect(expanded[0].combo).toEqual({
      disabled: false,
      size: 'sm',
      variant: 'a',
    });
  });

  it('sorts axis keys alphabetically', () => {
    expect(sortAxisKeys(matrix3x2x2)).toEqual(['disabled', 'size', 'variant']);
  });

  it('formats booleans as true/false strings', () => {
    expect(formatVariantName({ disabled: true, size: 'md' })).toBe('disabled=true, size=md');
  });

  it('hashes matrix deterministically regardless of key insertion order', () => {
    const a = hashVariantMatrix(matrix3x2x2);
    const reordered = {
      disabled: [false, true],
      variant: ['a', 'b', 'c'],
      size: ['sm', 'md'],
    };
    const b = hashVariantMatrix(reordered);
    expect(a).toBe(b);
  });

  it('round-trips variant names through parseVariantName', () => {
    const expanded = expandVariantMatrix(matrix3x2x2);
    for (let i = 0; i < expanded.length; i++) {
      const parsed = parseVariantName(expanded[i].name);
      expect(parsed).toEqual(expanded[i].combo);
    }
  });

  it('builds stable scaffold ids', () => {
    const specName = 'Button';
    const id = buildScaffoldId(specName, matrix3x2x2);
    expect(id.indexOf('figmint:scaffold:v1:Button:')).toBe(0);
    expect(buildScaffoldId(specName, matrix3x2x2)).toBe(id);
  });

  it('counts expected variants', () => {
    expect(expectedVariantCount(matrix3x2x2)).toBe(12);
  });

  it('returns null for invalid variant names', () => {
    expect(parseVariantName('not-a-variant')).toBeNull();
  });

  it('accepts ComponentSpecV1 matrix shape', () => {
    const spec: ComponentSpecV1 = {
      v: 1,
      kind: 'component-spec',
      name: 'Button',
      framework: 'react',
      variantMatrix: matrix3x2x2,
      props: [],
      bindings: [],
      layout: {
        direction: 'horizontal',
        gap: '8',
        sizing: { horizontal: 'hug', vertical: 'hug' },
      },
    };
    expect(expectedVariantCount(spec.variantMatrix)).toBe(12);
  });
});
