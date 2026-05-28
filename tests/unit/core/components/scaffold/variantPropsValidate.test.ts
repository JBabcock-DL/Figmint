import { describe, expect, it } from 'vitest';

import { validateVariantProperties } from '@/core/components/scaffold/variantPropsValidate';

import { createMockComponentSetWithVariants, asComponentSetNode } from '../../../../integration/core/components/scaffold/mockComponentSet';

describe('variantPropsValidate', () => {
  it('passes when VARIANT defs match matrix', () => {
    const matrix = {
      variant: ['default', 'outline'],
      size: ['sm', 'lg'],
    };
    const factory = createMockComponentSetWithVariants({ variantMatrix: matrix });
    const axes = validateVariantProperties(asComponentSetNode(factory.componentSet), matrix);
    expect(axes.variant.ok).toBe(true);
    expect(axes.size.ok).toBe(true);
  });

  it('fails when axis missing or options mismatch', () => {
    const matrix = { variant: ['default', 'outline'] };
    const factory = createMockComponentSetWithVariants({
      variantMatrix: { variant: ['default'] },
    });
    const axes = validateVariantProperties(asComponentSetNode(factory.componentSet), matrix);
    expect(axes.variant.ok).toBe(false);
  });

  it('stringifies boolean matrix values', () => {
    const matrix = { disabled: [false, true] };
    const factory = createMockComponentSetWithVariants({
      variantMatrix: { disabled: ['false', 'true'] },
    });
    const axes = validateVariantProperties(asComponentSetNode(factory.componentSet), matrix);
    expect(axes.disabled.ok).toBe(true);
  });
});
