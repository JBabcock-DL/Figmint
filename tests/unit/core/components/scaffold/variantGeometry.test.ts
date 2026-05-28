import { describe, expect, it } from 'vitest';

import { normalizeVariantMasterGeometry } from '@/core/components/scaffold/variantGeometry';

import { createMockComponent } from './__mocks__/figmaScaffold';
import { asComponentNode } from './__mocks__/figmaScaffold';

describe('normalizeVariantMasterGeometry', () => {
  it('expands collapsed masters and sets hug sizing', () => {
    const variant = createMockComponent({ width: 1, height: 1 });
    variant.layoutMode = 'HORIZONTAL';
    variant.primaryAxisSizingMode = 'FIXED';
    variant.counterAxisSizingMode = 'FIXED';

    normalizeVariantMasterGeometry(asComponentNode(variant));

    expect(variant.width).toBeGreaterThanOrEqual(48);
    expect(variant.height).toBeGreaterThanOrEqual(32);
    const sized = variant as unknown as {
      layoutSizingHorizontal: string;
      layoutSizingVertical: string;
    };
    expect(sized.layoutSizingHorizontal).toBe('HUG');
    expect(sized.layoutSizingVertical).toBe('HUG');
  });
});
