import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import { ALL_COLLECTION_IDS, COLLECTION_DISPLAY_NAMES } from '../constants';
import { findFigmaCollectionByDisplayName } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/collections-exist';

export function checkVarCollectionsExist(input: RuleInput): AuditRuleResult {
  const missing: string[] = [];

  for (const collectionId of ALL_COLLECTION_IDS) {
    const found = findFigmaCollectionByDisplayName(input.figmaCollections, collectionId);
    if (!found) {
      missing.push(COLLECTION_DISPLAY_NAMES[collectionId]);
    }
  }

  if (missing.length > 0) {
    return {
      ruleId: RULE_ID,
      pass: false,
      diagnostic: 'Missing collection: ' + missing.join(', '),
      severity: 'error',
    };
  }

  return {
    ruleId: RULE_ID,
    pass: true,
    diagnostic: 'All five canonical collections exist in Figma',
    severity: 'error',
  };
}
