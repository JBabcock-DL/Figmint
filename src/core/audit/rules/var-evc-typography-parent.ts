import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import type { RuleInput } from '../types';

const RULE_ID = 'var/evc-typography-parent';

export function checkVarEvcTypographyParent(input: RuleInput): AuditRuleResult {
  const themes = input.canonical.themes;
  if (!themes || themes.length === 0) {
    return {
      ruleId: RULE_ID,
      pass: true,
      diagnostic: 'No EVC theme extensions defined',
      severity: 'error',
    };
  }

  const failures: string[] = [];
  for (let index = 0; index < themes.length; index += 1) {
    const theme = themes[index];
    const parentCollection = theme.parentCollection as string;
    if (parentCollection === 'typography') {
      failures.push('themes[' + String(index) + '].parentCollection must not be typography');
    }
  }

  if (failures.length > 0) {
    return {
      ruleId: RULE_ID,
      pass: false,
      diagnostic: failures.join('; '),
      severity: 'error',
    };
  }

  return {
    ruleId: RULE_ID,
    pass: true,
    diagnostic: 'No EVC extensions use typography as parent collection',
    severity: 'error',
  };
}
