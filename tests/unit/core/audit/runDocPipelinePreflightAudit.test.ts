import { beforeEach, describe, expect, it } from 'vitest';

import {
  REQUIRED_COLOR_TOKENS,
  REQUIRED_FONT_FAMILY_VARS,
  REQUIRED_TEXT_STYLES,
} from '@/core/audit/rules/doc-required-tokens';
import { runDocPipelinePreflightAudit } from '@/core/audit/runAudit';
import {
  MockVariable,
  MockVariableCollection,
  installMockFigmaVariables,
  mockStores,
  resetMockFigma,
} from '../variables/__mocks__/figmaVariables';

function installPreflightFigmaMock(options?: {
  includeColorTokens?: boolean;
  includeTextStyles?: boolean;
  includeFontFamilyVars?: boolean;
}): void {
  installMockFigmaVariables();
  resetMockFigma();

  const includeColorTokens = options?.includeColorTokens === true;
  const includeTextStyles = options?.includeTextStyles === true;
  const includeFontFamilyVars = options?.includeFontFamilyVars === true;

  const themeCollection = new MockVariableCollection('Theme');
  const typographyCollection = new MockVariableCollection('Typography');
  mockStores.collections.push(themeCollection, typographyCollection);

  if (includeColorTokens) {
    for (const name of REQUIRED_COLOR_TOKENS) {
      mockStores.variables.push(new MockVariable(name, themeCollection.id, 'COLOR'));
    }
  }

  if (includeFontFamilyVars) {
    for (const name of REQUIRED_FONT_FAMILY_VARS) {
      mockStores.variables.push(new MockVariable(name, typographyCollection.id, 'STRING'));
    }
  }

  const textStyles = includeTextStyles
    ? REQUIRED_TEXT_STYLES.map((name, index) => ({ id: `style-${String(index)}`, name }))
    : [];

  const globalRecord = globalThis as Record<string, unknown>;
  globalRecord.figma = Object.assign({}, globalRecord.figma, {
    getLocalTextStylesAsync: () => Promise.resolve(textStyles),
  });
}

describe('runDocPipelinePreflightAudit', () => {
  beforeEach(() => {
    installPreflightFigmaMock();
  });

  it('SPK-AUDIT-1: empty Figma file reports 11 misses', async () => {
    const audit = await runDocPipelinePreflightAudit();

    expect(audit.v).toBe(1);
    expect(audit.kind).toBe('audit-report');
    expect(audit.meta.operation).toBe('scaffold-component');
    expect(audit.meta.scope).toBe('component');
    expect(audit.passed).toBe(false);
    expect(audit.results).toHaveLength(2);

    const row = audit.results.find(function (r) {
      return r.ruleId === 'doc-pipeline/required-tokens';
    });
    expect(row?.ruleId).toBe('doc-pipeline/required-tokens');
    expect(row?.pass).toBe(false);
    expect(row?.diagnostic.startsWith('Run design-system bootstrap first.')).toBe(true);
    expect(row?.diagnostic).toContain('Missing color tokens:');
    expect(row?.diagnostic).toContain('Missing text styles:');
    expect(row?.diagnostic).toContain('Missing font-family variables:');
    expect(audit.summary.rulesFailed).toBe(1);
  });

  it('SPK-AUDIT-2: color tokens only — 7 text/style misses', async () => {
    installPreflightFigmaMock({ includeColorTokens: true });

    const audit = await runDocPipelinePreflightAudit();
    const row = audit.results.find(function (r) {
      return r.ruleId === 'doc-pipeline/required-tokens';
    });

    expect(audit.passed).toBe(false);
    expect(row?.pass).toBe(false);
    expect(row?.diagnostic).not.toContain('Missing color tokens:');
    expect(row?.diagnostic).toContain('Missing text styles:');
    expect(row?.diagnostic).toContain('Missing font-family variables:');
  });

  it('SPK-AUDIT-3: all prerequisites present — pass', async () => {
    installPreflightFigmaMock({
      includeColorTokens: true,
      includeTextStyles: true,
      includeFontFamilyVars: true,
    });

    const audit = await runDocPipelinePreflightAudit();
    const row = audit.results.find(function (r) {
      return r.ruleId === 'doc-pipeline/required-tokens';
    });

    expect(audit.passed).toBe(true);
    expect(row?.pass).toBe(true);
    expect(row?.diagnostic).toBe(
      'All required tokens, text styles, and font-family variables present.',
    );
    expect(audit.summary.rulesPassed).toBe(2);
    expect(audit.summary.rulesFailed).toBe(0);
  });

  it('SPK-AUDIT-4 (mock): preflight audit blocks scaffold prerequisites on empty file', async () => {
    const audit = await runDocPipelinePreflightAudit();

    expect(audit.passed).toBe(false);
    expect(audit.results[0]?.severity).toBe('error');
    expect(audit.results[0]?.ruleId).toBe('doc-pipeline/required-tokens');
  });
});
