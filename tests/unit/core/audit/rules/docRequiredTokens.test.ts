import { describe, expect, it } from 'vitest';

import {
  REQUIRED_COLOR_TOKENS,
  REQUIRED_FONT_FAMILY_VARS,
  REQUIRED_TEXT_STYLES,
  buildDocRequiredTokensRow,
  runDocPipelinePreflightRules,
} from '@/core/audit/rules/doc-required-tokens';

describe('buildDocRequiredTokensRow (SPK-AUDIT-1/2/3)', () => {
  it('SPK-AUDIT-1: lists all 11 misses when everything is absent', () => {
    const row = buildDocRequiredTokensRow({
      tokens: [...REQUIRED_COLOR_TOKENS],
      textStyles: [...REQUIRED_TEXT_STYLES],
      fontFamilyVars: [...REQUIRED_FONT_FAMILY_VARS],
    });

    expect(row.ruleId).toBe('doc-pipeline/required-tokens');
    expect(row.pass).toBe(false);
    expect(row.severity).toBe('error');
    expect(row.diagnostic.startsWith('Run design-system bootstrap first.')).toBe(true);
    expect(row.diagnostic).toContain(
      'Missing color tokens: color/border/subtle, color/background/variant, color/background/content, color/background/content-muted',
    );
    expect(row.diagnostic).toContain(
      'Missing text styles: _Doc/Section, _Doc/TokenName, _Doc/Code, _Doc/Caption',
    );
    expect(row.diagnostic).toContain(
      'Missing font-family variables: Label/SM/font-family, Label/MD/font-family, Label/LG/font-family',
    );
  });

  it('SPK-AUDIT-2: omits color-token line when only text styles and font-family vars are missing', () => {
    const row = buildDocRequiredTokensRow({
      tokens: [],
      textStyles: [...REQUIRED_TEXT_STYLES],
      fontFamilyVars: [...REQUIRED_FONT_FAMILY_VARS],
    });

    expect(row.pass).toBe(false);
    expect(row.diagnostic.startsWith('Run design-system bootstrap first.')).toBe(true);
    expect(row.diagnostic).not.toContain('Missing color tokens:');
    expect(row.diagnostic).toContain('Missing text styles:');
    expect(row.diagnostic).toContain('Missing font-family variables:');
  });

  it('SPK-AUDIT-3: passes when all prerequisites are present', () => {
    const row = buildDocRequiredTokensRow({
      tokens: [],
      textStyles: [],
      fontFamilyVars: [],
    });

    expect(row.pass).toBe(true);
    expect(row.diagnostic).toBe(
      'All required tokens, text styles, and font-family variables present.',
    );
    expect(row.severity).toBe('error');
  });
});

describe('runDocPipelinePreflightRules', () => {
  it('returns required-tokens and fighub-config rows', () => {
    const results = runDocPipelinePreflightRules({
      themeVariables: REQUIRED_COLOR_TOKENS.map((name) => ({ name }) as Variable),
      typographyVariables: REQUIRED_FONT_FAMILY_VARS.map((name) => ({ name }) as Variable),
      textStyles: REQUIRED_TEXT_STYLES.map((name) => ({ name })),
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.ruleId).toBe('doc-pipeline/required-tokens');
    expect(results[0]?.pass).toBe(true);
    expect(results[1]?.ruleId).toBe('doc-pipeline/fighub-config');
    expect(results[1]?.pass).toBe(true);
  });
});
