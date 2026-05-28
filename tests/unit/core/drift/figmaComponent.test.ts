import { describe, expect, it } from 'vitest';

import { figmaComponentSetToComparable } from '@/core/drift/figmaComponent';
import { buildMockVariantTree } from '../../../helpers/scaffold/mockVariantTree';

describe('figmaComponentSetToComparable', () => {
  it('extracts variant matrix from componentPropertyDefinitions', () => {
    const tree = buildMockVariantTree(2);
    const definitions: ComponentPropertyDefinitions = {
      'variant#1': {
        type: 'VARIANT',
        defaultValue: '0',
        variantOptions: ['0', '1'],
      },
      'loading#2': {
        type: 'VARIANT',
        defaultValue: 'false',
        variantOptions: ['false', 'true'],
      },
    };
    Object.defineProperty(tree.componentSet, 'componentPropertyDefinitions', {
      value: definitions,
      configurable: true,
    });

    const comparable = figmaComponentSetToComparable(tree.componentSet as unknown as ComponentSetNode, 'Button');
    expect(comparable.specName).toBe('Button');
    expect(comparable.variantMatrix.variant).toEqual(['0', '1']);
    expect(comparable.variantMatrix.loading).toEqual([false, true]);
    expect(comparable.variantMatrixHash.length).toBeGreaterThan(0);
  });
});
