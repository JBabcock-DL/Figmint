import { describe, expect, it } from 'vitest';

import { validateComponentSpecDraft } from '@/ui/components/scaffold/validateSpecDraft';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import canonicalFixture from '../../../fixtures/component-spec-button-canonical.json';

const canonicalSpec = canonicalFixture as ComponentSpecV1;

describe('validateComponentSpecDraft', () => {
  it('passes canonical button fixture', async () => {
    const result = await validateComponentSpecDraft(canonicalSpec);
    expect(result.ok).toBe(true);
  });

  it('fails when kind is wrong', async () => {
    const invalid = Object.assign({}, canonicalSpec, { kind: 'registry' });
    const result = await validateComponentSpecDraft(invalid);
    expect(result.ok).toBe(false);
  });
});
