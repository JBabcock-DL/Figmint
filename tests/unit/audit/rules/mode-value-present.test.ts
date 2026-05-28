import { describe, expect, it } from 'vitest';

import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { checkVarModeValuePresent } from '@/core/audit/rules/var-mode-value-present';
import type { FigmaCollectionSnapshot } from '@/core/audit/types';

import tokensMinimal from '../../../fixtures/audit/tokens-minimal.v1.json';
import missingDarkMode from '../../../fixtures/audit/figma-snapshots/missing-dark-mode.json';

const canonical = tokensMinimal as unknown as TokensV1;
const figmaCollections = missingDarkMode as unknown as FigmaCollectionSnapshot[];

describe('var/mode-value-present', () => {
  it('fails when Theme token is missing Dark mode value', () => {
    const result = checkVarModeValuePresent({
      canonical,
      figmaCollections,
      pushResult: { created: 1, updated: 0, skipped: 0, errors: [] },
    });

    expect(result.pass).toBe(false);
    expect(result.ruleId).toBe('var/mode-value-present');
    expect(result.diagnostic).toContain('Dark');
  });
});
