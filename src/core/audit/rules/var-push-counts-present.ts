import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import type { RuleInput } from '../types';

const RULE_ID = 'var/push-counts-present';

export function checkVarPushCountsPresent(input: RuleInput): AuditRuleResult {
  const { pushResult } = input;
  const createdOk = typeof pushResult.created === 'number';
  const updatedOk = typeof pushResult.updated === 'number';
  const skippedOk = typeof pushResult.skipped === 'number';

  if (!createdOk || !updatedOk || !skippedOk) {
    return {
      ruleId: RULE_ID,
      pass: false,
      diagnostic: 'Push counters missing or invalid',
      severity: 'error',
    };
  }

  if (pushResult.errors.length > 0) {
    return {
      ruleId: RULE_ID,
      pass: false,
      diagnostic: 'Push errors: ' + String(pushResult.errors.length) + ' error(s)',
      severity: 'error',
    };
  }

  return {
    ruleId: RULE_ID,
    pass: true,
    diagnostic:
      'Push reported ' +
      String(pushResult.created) +
      ' created, ' +
      String(pushResult.updated) +
      ' updated, ' +
      String(pushResult.skipped) +
      ' skipped',
    severity: 'error',
  };
}
