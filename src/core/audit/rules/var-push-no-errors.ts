import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import type { RuleInput } from '../types';

const RULE_ID = 'var/push-no-errors';

export function checkVarPushNoErrors(input: RuleInput): AuditRuleResult {
  if (input.pushResult.errors.length === 0) {
    return {
      ruleId: RULE_ID,
      pass: true,
      diagnostic: 'Push completed with no operational errors',
      severity: 'error',
    };
  }

  return {
    ruleId: RULE_ID,
    pass: false,
    diagnostic: 'Push errors: ' + String(input.pushResult.errors.length) + ' error(s)',
    severity: 'error',
  };
}
