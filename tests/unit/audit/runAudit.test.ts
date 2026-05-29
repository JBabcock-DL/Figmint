import { describe, expect, it } from 'vitest';

import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { runAudit } from '@/core/audit/runAudit';
import type { FigmaCollectionSnapshot } from '@/core/audit/types';

import tokensMinimal from '../../fixtures/audit/tokens-minimal.v1.json';
import passAll from '../../fixtures/audit/figma-snapshots/pass-all.json';
import missingDarkMode from '../../fixtures/audit/figma-snapshots/missing-dark-mode.json';

const canonical = tokensMinimal as unknown as TokensV1;

describe('runAudit variables scope', () => {
  it('passes for matching pass-all fixture', async () => {
    const figmaCollections = passAll as unknown as FigmaCollectionSnapshot[];
    const audit = await runAudit('variables', {
      canonical,
      pushResult: { created: 1, updated: 0, skipped: 0, errors: [] },
      figmaCollections,
    });

    expect(audit.passed).toBe(true);
    expect(audit.v).toBe(1);
    expect(audit.kind).toBe('audit-report');
    expect(audit.summary.variablesCreated).toBe(1);
    expect(audit.summary.variablesUpdated).toBe(0);
    expect(audit.summary.variablesSkipped).toBe(0);
    expect(audit.summary.rulesFailed).toBe(0);
    expect(audit.results.length).toBe(16);
  });

  it('fails when Theme token is missing Dark mode value', async () => {
    const figmaCollections = missingDarkMode as unknown as FigmaCollectionSnapshot[];
    const audit = await runAudit('variables', {
      canonical,
      pushResult: { created: 1, updated: 0, skipped: 0, errors: [] },
      figmaCollections,
    });

    expect(audit.passed).toBe(false);
    const modeRule = audit.results.find((entry) => entry.ruleId === 'var/mode-value-present');
    expect(modeRule).toBeDefined();
    expect(modeRule?.pass).toBe(false);
    expect(modeRule?.diagnostic).toContain('Dark');
  });

  it('runs canvas scope with probe override', async () => {
    const audit = await runAudit('canvas', {
      builder: 'text-styles',
      probeOverride: {
        typographySlotRowCount: 27,
        typographyColumnSum: 1640,
        platformMappingRowCount: 22,
        platformMappingSubtreeHasEffects: false,
        pageContentWidth: 1800,
        headerCellIssues: 0,
        tableTextIssues: 0,
        onePxMasterViolations: [],
      },
    });

    expect(audit.meta.scope).toBe('canvas');
    expect(audit.passed).toBe(true);
  });

  it('runs component scope audit report', async () => {
    const { componentSet } = await import('../../helpers/scaffold/mockVariantTree').then((mod) =>
      mod.buildMockVariantTree(1),
    );
    const chipSpec = await import('../../fixtures/components/button-chip-bindings.v1.json');

    const audit = await runAudit('component', {
      spec: chipSpec.default as import('@detroitlabs/fighub-contracts').ComponentSpecV1,
      componentSet: componentSet,
      bindingsResult: { applied: 11, failed: [], passed: true },
    });

    expect(audit.meta.scope).toBe('component');
    expect(audit.passed).toBeDefined();
  });
});
