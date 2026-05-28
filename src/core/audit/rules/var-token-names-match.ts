import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { findFigmaVariable } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/token-names-match';

export function checkVarTokenNamesMatch(input: RuleInput): AuditRuleResult {
  const missing: string[] = [];

  for (const token of input.canonical.tokens) {
    const figmaVar = findFigmaVariable(input.figmaCollections, token.collection, token.name);
    if (!figmaVar) {
      missing.push(token.collection + '/' + token.name);
    }
  }

  if (missing.length > 0) {
    return {
      ruleId: RULE_ID,
      pass: false,
      diagnostic: 'Missing variable: ' + missing.join(', '),
      severity: 'error',
    };
  }

  return {
    ruleId: RULE_ID,
    pass: true,
    diagnostic: 'All canonical token names exist in Figma',
    severity: 'error',
  };
}
