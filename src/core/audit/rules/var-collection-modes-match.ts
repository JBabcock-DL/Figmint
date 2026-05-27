import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import { ALL_COLLECTION_IDS } from '../constants';
import { findFigmaCollectionByDisplayName, getCanonicalCollectionModes } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/collection-modes-match';

function modeNamesSet(names: string[]): Set<string> {
  return new Set(names);
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const entry of a) {
    if (!b.has(entry)) {
      return false;
    }
  }
  return true;
}

export function checkVarCollectionModesMatch(input: RuleInput): AuditRuleResult {
  const mismatches: string[] = [];

  for (const collectionId of ALL_COLLECTION_IDS) {
    const expected = getCanonicalCollectionModes(input.canonical, collectionId);
    const figmaCollection = findFigmaCollectionByDisplayName(input.figmaCollections, collectionId);
    if (!figmaCollection) {
      continue;
    }
    const found = figmaCollection.modes.map((mode) => mode.name);
    if (!setsEqual(modeNamesSet(expected), modeNamesSet(found))) {
      mismatches.push(
        collectionId +
          ': expected modes [' +
          expected.join(', ') +
          '], found [' +
          found.join(', ') +
          ']',
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
    diagnostic: 'All collection modes match canonical definitions',
    severity: 'error',
  };
}
