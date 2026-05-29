import { describe, expect, it } from 'vitest';

import { resolveVariantComponent } from '@/core/components/scaffold/usageFrame';

import {
  asComponentNode,
  asComponentSetNode,
  combineAsVariants,
  createMockComponent,
  createMockPage,
} from './__mocks__/figmaScaffold';

describe('resolveVariantComponent', () => {
  it('resolves variant by formatted combo name', () => {
    const page = createMockPage();
    const v0 = createMockComponent({ name: 'size=sm, variant=default' });
    const v1 = createMockComponent({ name: 'size=default, variant=outline' });
    const set = combineAsVariants([asComponentNode(v0), asComponentNode(v1)], page);

    const resolved = resolveVariantComponent(asComponentSetNode(set), {
      size: 'sm',
      variant: 'default',
    });

    expect(resolved.name).toBe('size=sm, variant=default');
  });
});
