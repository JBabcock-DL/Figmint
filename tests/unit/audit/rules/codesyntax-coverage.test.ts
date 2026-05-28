import { describe, expect, it } from 'vitest';

import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { buildAuditSummary } from '@/core/audit/summary';
import { runVariableRules } from '@/core/audit/rules';
import type { FigmaCollectionSnapshot } from '@/core/audit/types';

import tokensMinimal from '../../../fixtures/audit/tokens-minimal.v1.json';
import passAll from '../../../fixtures/audit/figma-snapshots/pass-all.json';

const canonical = tokensMinimal as unknown as TokensV1;
const figmaCollections = passAll as unknown as FigmaCollectionSnapshot[];

describe('codeSyntax coverage summary', () => {
  it('populates WEB, ANDROID, and iOS coverage counts from pass-all fixture', () => {
    const pushResult = { created: 1, updated: 0, skipped: 0, errors: [] };
    const results = runVariableRules({ canonical, figmaCollections, pushResult });
    const summary = buildAuditSummary(results, pushResult, canonical, figmaCollections);

    expect(summary.codeSyntaxCoverage.WEB).toEqual({ expected: 5, missing: 0 });
    expect(summary.codeSyntaxCoverage.ANDROID).toEqual({ expected: 5, missing: 0 });
    expect(summary.codeSyntaxCoverage.iOS).toEqual({ expected: 5, missing: 0 });
  });
});
