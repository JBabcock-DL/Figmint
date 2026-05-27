import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import { tokenKey } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/canonical-unique-keys';

export function checkVarCanonicalUniqueKeys(input: RuleInput): AuditRuleResult {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const token of input.canonical.tokens) {
    const key = tokenKey(token.collection, token.name);
    if (seen.has(key)) {
      duplicates.push(token.collection + '/' + token.name);
    } else {
      seen.add(key);
    }
  }

  if (duplicates.length > 0) {
    return {
      ruleId: RULE_ID,
      pass: false,
      diagnostic: 'Duplicate token key: ' + duplicates.join(', '),
      severity: 'error',
    };
  }

  return {
    ruleId: RULE_ID,
    pass: true,
    diagnostic: 'All canonical token keys are unique',
    severity: 'error',
  };
}
