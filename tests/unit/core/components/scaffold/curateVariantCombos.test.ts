import { describe, expect, it } from 'vitest';

import acMatrix from '@/core/components/scaffold/__fixtures__/usage-curation-ac-matrix.v1.json';
import acPicks from '@/core/components/scaffold/__fixtures__/usage-curation-ac-matrix.picks.v1.json';
import buttonPicks from '@/core/components/scaffold/__fixtures__/usage-curation-button-3x3.picks.v1.json';
import {
  curateVariantCombos,
  MAX_USAGE_INSTANCES,
} from '@/core/components/scaffold/curateVariantCombos';

import buttonSpec from '../../../../fixtures/component-spec-button.json';

describe('curateVariantCombos', () => {
  it('matches golden AC matrix 12→6 picks', () => {
    const picks = curateVariantCombos(acMatrix as Record<string, (string | boolean)[]>, 6);
    expect(picks).toEqual(acPicks);
  });

  it('matches golden Button 3×3 9→6 picks from tests/fixtures/component-spec-button.json', () => {
    const picks = curateVariantCombos(
      (buttonSpec as { variantMatrix: Record<string, (string | boolean)[]> }).variantMatrix,
      6,
    );
    expect(picks).toEqual(buttonPicks);
  });

  it('returns identical values on repeated calls', () => {
    const first = curateVariantCombos(acMatrix as Record<string, (string | boolean)[]>, 6);
    const second = curateVariantCombos(acMatrix as Record<string, (string | boolean)[]>, 6);
    expect(second).toEqual(first);
  });

  it('uses first value of every axis in baseline combo', () => {
    const matrix = acMatrix as Record<string, (string | boolean)[]>;
    const picks = curateVariantCombos(matrix, 6);
    expect(picks[0]).toEqual({
      disabled: matrix.disabled[0],
      size: matrix.size[0],
      variant: matrix.variant[0],
    });
  });

  it('returns a single combo for 1×1 matrix', () => {
    const picks = curateVariantCombos({ tone: ['neutral'] }, 6);
    expect(picks).toEqual([{ tone: 'neutral' }]);
  });

  it('returns all combos when cross-product is 5', () => {
    const picks = curateVariantCombos({ a: ['1', '2', '3', '4', '5'] }, 6);
    expect(picks).toHaveLength(5);
  });

  it('returns all combos when cross-product is 4 on single axis', () => {
    const picks = curateVariantCombos({ size: ['xs', 'sm', 'md', 'lg'] }, 6);
    expect(picks).toHaveLength(4);
  });

  it('defaults maxInstances to MAX_USAGE_INSTANCES', () => {
    const picks = curateVariantCombos(acMatrix as Record<string, (string | boolean)[]>);
    expect(picks).toHaveLength(MAX_USAGE_INSTANCES);
  });
});
