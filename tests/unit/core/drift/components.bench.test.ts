import { describe, expect, it } from 'vitest';

import { detectComponentDrift } from '@/core/drift/components';
import { hashVariantMatrix } from '@/core/components/scaffold/variantMatrix';
import type { ComponentComparable } from '@/core/drift/types';

describe('detectComponentDrift bench', () => {
  it('detects 20 components in under 200ms', () => {
    const repoSpecs: Record<string, ComponentComparable> = {};
    const figmaComponents: Record<string, ComponentComparable> = {};
    const snapshotComponents: Record<string, ComponentComparable> = {};

    for (let i = 0; i < 20; i++) {
      const name = 'Component' + String(i);
      const matrix = { variant: ['default', 'primary'] };
      const comparable: ComponentComparable = {
        specName: name,
        variantMatrixHash: hashVariantMatrix(matrix),
        variantMatrix: matrix,
        props: [],
        bindings: [],
      };
      repoSpecs[name] = comparable;
      figmaComponents[name] = comparable;
      snapshotComponents[name] = comparable;
    }

    const start = performance.now();
    const result = detectComponentDrift({ repoSpecs, figmaComponents, snapshotComponents });
    const elapsed = performance.now() - start;

    expect(result.syncedCount).toBe(20);
    expect(result.drifts).toHaveLength(0);
    expect(elapsed).toBeLessThan(200);
  });
});
