import { describe, expect, it } from 'vitest';

import chipFixture from '@/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json';

describe('component-spec-button-chip fixture', () => {
  it('parses and matches locked research fields', () => {
    const spec = chipFixture;
    expect(spec.v).toBe(1);
    expect(spec.kind).toBe('component-spec');
    expect(spec.name).toBe('Button');
    expect(spec.archetype).toBe('chip');
    expect(spec.variantMatrix.variant).toEqual([
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ]);
    expect(spec.variantMatrix.size).toEqual(['sm', 'default', 'lg', 'icon']);
    expect(spec.props.some(function isLoading(prop) {
      return prop.name === 'loading' && prop.type === 'boolean';
    })).toBe(true);
    expect(spec.componentProps).toEqual({
      label: true,
      leadingIcon: true,
      trailingIcon: true,
    });
  });
});
