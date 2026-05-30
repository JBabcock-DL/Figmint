import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  mergeFigmaMappingIntoSpec,
  parseFigmaMappingText,
} from '@/core/import/templates/react/mergeFigmaMapping';

const figmaSource = readFileSync(
  resolve(__dirname, '../../../../fixtures/sources/button.figma.tsx'),
  'utf8',
);

describe('mergeFigmaMapping', () => {
  it('parses figma.enum pairs from fixture', () => {
    const mapping = parseFigmaMappingText(figmaSource);
    expect(mapping.enumOverrides.variant).toBeDefined();
    expect(mapping.enumOverrides.variant.Primary).toBe('default');
  });

  it('leaves spec unchanged when mapping empty', () => {
    const props = [{ name: 'variant', type: 'enum' as const, enum: ['default'], default: 'default' }];
    const matrix = { variant: ['default'] };
    const merged = mergeFigmaMappingIntoSpec(props, matrix, { propRenames: {}, enumOverrides: {} });
    expect(merged.props).toEqual(props);
    expect(merged.variantMatrix).toEqual(matrix);
  });

  it('merges enum overrides from figma mapping', () => {
    const mapping = parseFigmaMappingText(figmaSource);
    const props = [
      {
        name: 'variant',
        type: 'enum' as const,
        enum: ['default', 'destructive'],
        default: 'default',
      },
    ];
    const matrix = { variant: ['default', 'destructive'] };
    const merged = mergeFigmaMappingIntoSpec(props, matrix, mapping);
    expect(merged.variantMatrix.variant.length).toBeGreaterThan(1);
  });
});
