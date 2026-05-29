/// <reference types="@figma/plugin-typings" />

import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

export const REQUIRED_COLOR_TOKENS = [
  'color/border/subtle',
  'color/background/variant',
  'color/background/content',
  'color/background/content-muted',
] as const;

export const REQUIRED_TEXT_STYLES = [
  '_Doc/Section',
  '_Doc/TokenName',
  '_Doc/Code',
  '_Doc/Caption',
] as const;

export const REQUIRED_FONT_FAMILY_VARS = [
  'Label/SM/font-family',
  'Label/MD/font-family',
  'Label/LG/font-family',
] as const;

export interface DocPipelinePreflightRulesInput {
  themeVariables: readonly Variable[];
  typographyVariables: readonly Variable[];
  textStyles: readonly { name: string }[];
  /** Set when fighub.json was present but malformed (WO-058). Absent file is OK. */
  fighubConfigParseError?: string;
}

export function buildFigHubConfigRow(parseError?: string): AuditRuleResult {
  if (parseError === undefined || parseError.length === 0) {
    return {
      ruleId: 'doc-pipeline/fighub-config',
      pass: true,
      diagnostic: 'fighub.json valid or not present (defaults used).',
      severity: 'error',
    };
  }
  return {
    ruleId: 'doc-pipeline/fighub-config',
    pass: false,
    diagnostic: parseError + ' — using default repo paths.',
    severity: 'error',
  };
}

export function buildDocRequiredTokensRow(missing: {
  tokens: string[];
  textStyles: string[];
  fontFamilyVars: string[];
}): AuditRuleResult {
  const hasMisses =
    missing.tokens.length > 0 ||
    missing.textStyles.length > 0 ||
    missing.fontFamilyVars.length > 0;

  if (!hasMisses) {
    return {
      ruleId: 'doc-pipeline/required-tokens',
      pass: true,
      diagnostic: 'All required tokens, text styles, and font-family variables present.',
      severity: 'error',
    };
  }

  const lines: string[] = ['Run design-system bootstrap first.'];
  if (missing.tokens.length > 0) {
    lines.push('Missing color tokens: ' + missing.tokens.join(', '));
  }
  if (missing.textStyles.length > 0) {
    lines.push('Missing text styles: ' + missing.textStyles.join(', '));
  }
  if (missing.fontFamilyVars.length > 0) {
    lines.push('Missing font-family variables: ' + missing.fontFamilyVars.join(', '));
  }

  return {
    ruleId: 'doc-pipeline/required-tokens',
    pass: false,
    diagnostic: lines.join(' '),
    severity: 'error',
  };
}

function findMissingNames(
  required: readonly string[],
  present: readonly { name: string }[],
): string[] {
  return required.filter((name) => !present.find((entry) => entry.name === name));
}

export function runDocPipelinePreflightRules(
  input: DocPipelinePreflightRulesInput,
): AuditRuleResult[] {
  const missingTokens = findMissingNames(REQUIRED_COLOR_TOKENS, input.themeVariables);
  const missingTextStyles = findMissingNames(REQUIRED_TEXT_STYLES, input.textStyles);
  const missingFontFamilyVars = findMissingNames(
    REQUIRED_FONT_FAMILY_VARS,
    input.typographyVariables,
  );

  const rows: AuditRuleResult[] = [
    buildDocRequiredTokensRow({
      tokens: missingTokens,
      textStyles: missingTextStyles,
      fontFamilyVars: missingFontFamilyVars,
    }),
    buildFigHubConfigRow(input.fighubConfigParseError),
  ];
  return rows;
}
