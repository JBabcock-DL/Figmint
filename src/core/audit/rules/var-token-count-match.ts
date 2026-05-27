import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import { ALL_COLLECTION_IDS } from '../constants';
import { findFigmaCollectionByDisplayName } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/token-count-match';

export function checkVarTokenCountMatch(input: RuleInput): AuditRuleResult {
  const mismatches: string[] = [];

  for (const collectionId of ALL_COLLECTION_IDS) {
    const expected = input.canonical.tokens.filter(
      (token) => token.collection === collectionId,
    ).length;
    const figmaCollection = findFigmaCollectionByDisplayName(input.figmaCollections, collectionId);
    const found = figmaCollection ? figmaCollection.variables.length : 0;
    if (expected !== found) {
      mismatches.push(
        collectionId + ': expected ' + String(expected) + ' variables, found ' + String(found),
      );
    }
  }

  if (mismatches.length > 0) {
    return {
      ruleId: RULE_ID,
      pass: false,
      diagnostic: mismatches.join('; '),
      severity: 'error',
    };
  }

  return {
    ruleId: RULE_ID,
    pass: true,
    diagnostic: 'Token counts match canonical per collection',
    severity: 'error',
  };
}
