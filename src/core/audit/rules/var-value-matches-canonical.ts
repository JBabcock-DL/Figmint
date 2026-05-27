import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import { resolveTokens } from '../../variables/resolveTokens';
import {
  buildVariableIndex,
  findFigmaVariable,
  getCanonicalCollectionModes,
  resolveFigmaValue,
  valuesEqual,
} from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/value-matches-canonical';

export function checkVarValueMatchesCanonical(input: RuleInput): AuditRuleResult {
  const resolved = resolveTokens(input.canonical);
  if (resolved.errors.length > 0) {
    return {
      ruleId: RULE_ID,
      pass: false,
      diagnostic: 'Cannot compare values: ' + resolved.errors[0],
      severity: 'error',
    };
  }

  const variablesById = buildVariableIndex(input.figmaCollections);
  const failures: string[] = [];

  for (const resolvedToken of resolved.tokens) {
    const figmaVar = findFigmaVariable(
      input.figmaCollections,
      resolvedToken.collection,
      resolvedToken.name,
    );
    const modes = getCanonicalCollectionModes(input.canonical, resolvedToken.collection);

    for (const modeName of modes) {
      if (!Object.prototype.hasOwnProperty.call(resolvedToken.resolvedValuesByMode, modeName)) {
        continue;
      }
      const expected = resolvedToken.resolvedValuesByMode[modeName];
      const rawFigmaValue = figmaVar ? figmaVar.valuesByMode[modeName] : undefined;
      const actual = resolveFigmaValue(rawFigmaValue, modeName, variablesById, []);

      if (!valuesEqual(expected, actual)) {
        failures.push(
          resolvedToken.collection +
            '/' +
            resolvedToken.name +
            ' mode ' +
            modeName +
            ': expected ' +
            JSON.stringify(expected) +
            ', got ' +
            JSON.stringify(actual),
        );
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
    diagnostic: 'Resolved canonical values match Figma values',
    severity: 'error',
  };
}
