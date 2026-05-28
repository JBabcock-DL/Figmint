import { describe, expect, it } from 'vitest';

import {
  countVariantCrossProduct,
  detectCssSelectorWarnings,
} from '@/ui/components/variantMatrixPreview';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';

const canonicalSpec = canonicalFixture as ComponentSpecV1;

describe('variantMatrixPreview', () => {
  it('counts 24 variants for shadcn canonical button fixture', () => {
    expect(countVariantCrossProduct(canonicalSpec.variantMatrix)).toBe(24);
  });

  it('warns on CSS class selectors in bindings', () => {
    const warnings = detectCssSelectorWarnings([
      { selector: '.button', variable: 'color/primary' },
      { selector: 'root.fill', variable: 'color/primary' },
    ]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('.button');
  });
});
