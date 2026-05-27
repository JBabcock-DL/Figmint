import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import { getCanonicalCollectionModes, findFigmaVariable, isEmptyValue } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/mode-value-present';

export function checkVarModeValuePresent(input: RuleInput): AuditRuleResult {
  const failures: string[] = [];

  for (const token of input.canonical.tokens) {
    const modes = getCanonicalCollectionModes(input.canonical, token.collection);
    const figmaVar = findFigmaVariable(input.figmaCollections, token.collection, token.name);

    for (const modeName of modes) {
      if (!Object.prototype.hasOwnProperty.call(token.valuesByMode, modeName)) {
        continue;
      }
      if (!figmaVar || isEmptyValue(figmaVar.valuesByMode[modeName])) {
        failures.push(token.collection + '/' + token.name + ': missing value for mode ' + modeName);
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
    diagnostic: 'All canonical mode values present on Figma variables',
    severity: 'error',
  };
}
