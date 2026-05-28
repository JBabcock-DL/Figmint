import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { isTokenAliasRef } from '../../variables/types';
import { indexCanonicalTokens } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/alias-target-exists';

export function checkVarAliasTargetExists(input: RuleInput): AuditRuleResult {
  const index = indexCanonicalTokens(input.canonical);
  const failures: string[] = [];

  for (const token of input.canonical.tokens) {
    const values = token.valuesByMode as Record<string, unknown>;
    for (const modeName of Object.keys(values)) {
      const value = values[modeName];
      if (isTokenAliasRef(value)) {
        const targetKey = value.aliasOf.collection + ':' + value.aliasOf.name;
        if (!index.has(targetKey)) {
          failures.push(
            token.collection +
              '/' +
              token.name +
              ' mode ' +
              modeName +
              ': alias target ' +
              value.aliasOf.collection +
              '/' +
              value.aliasOf.name +
              ' not found',
          );
        }
      }
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
    diagnostic: 'All alias targets exist in canonical token index',
    severity: 'error',
  };
}
