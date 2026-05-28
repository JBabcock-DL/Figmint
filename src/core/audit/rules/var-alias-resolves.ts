import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { resolveTokens } from '../../variables/resolveTokens';
import type { RuleInput } from '../types';

const RULE_ID = 'var/alias-resolves';

export function checkVarAliasResolves(input: RuleInput): AuditRuleResult {
  const resolved = resolveTokens(input.canonical);

  if (resolved.errors.length > 0) {
    return {
      ruleId: RULE_ID,
      pass: false,
      diagnostic: resolved.errors.join('; '),
      severity: 'error',
    };
  }

  return {
    ruleId: RULE_ID,
    pass: true,
    diagnostic: 'All canonical aliases resolve without cycles',
    severity: 'error',
  };
}
