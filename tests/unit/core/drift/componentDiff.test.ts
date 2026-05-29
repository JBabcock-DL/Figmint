import { describe, expect, it } from 'vitest';

import { buildComponentDiff, componentComparableEqual } from '@/core/drift/componentDiff';
import { hashVariantMatrix } from '@/core/components/scaffold/variantMatrix';
import type { ComponentComparable } from '@/core/drift/types';

function comparable(
  matrix: Record<string, (string | boolean)[]>,
  props: ComponentComparable['props'] = [],
  bindings: ComponentComparable['bindings'] = [],
): ComponentComparable {
  return {
    specName: 'Button',
    variantMatrixHash: hashVariantMatrix(matrix),
    variantMatrix: matrix,
    props: props,
    bindings: bindings,
  };
}

describe('componentDiff', () => {
  it('detects props added', () => {
    const left = comparable({ variant: ['default'] }, []);
    const right = comparable({ variant: ['default'] }, [
      { name: 'disabled', type: 'boolean', default: false },
    ]);
    expect(componentComparableEqual(left, right)).toBe(false);
    const diff = buildComponentDiff(left, right);
    expect(diff !== null && diff.props !== undefined && diff.props.added.length).toBe(1);
  });

  it('detects variant combo added', () => {
    const repo = comparable({ variant: ['default'], loading: [false] });
    const figma = comparable({ variant: ['default'], loading: [false, true] });
    const diff = buildComponentDiff(figma, repo);
    expect(diff?.variantMatrix !== undefined).toBe(true);
    if (diff?.variantMatrix !== undefined) {
      expect(diff.variantMatrix.added[0]).toContain('loading=true');
    }
  });

  it('detects binding changes', () => {
    const left = comparable(
      { variant: ['default'] },
      [],
      [{ selector: 'text/label', variable: 'var/a' }],
    );
    const right = comparable(
      { variant: ['default'] },
      [],
      [{ selector: 'text/label', variable: 'var/b' }],
    );
    const diff = buildComponentDiff(left, right);
    expect(diff?.bindings !== undefined).toBe(true);
    if (diff?.bindings !== undefined) {
      expect(diff.bindings.added.length + diff.bindings.removed.length).toBeGreaterThan(0);
    }
  });
});
