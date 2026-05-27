import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import { findFigmaVariable, isIosDotSegmentFormat } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/codesyntax-ios-format';

export function checkVarCodesyntaxIosFormat(input: RuleInput): AuditRuleResult {
  const failures: string[] = [];

  for (const token of input.canonical.tokens) {
    const figmaVar = findFigmaVariable(input.figmaCollections, token.collection, token.name);
    const canonicalIos =
      token.codeSyntax && token.codeSyntax.iOS ? token.codeSyntax.iOS : undefined;
    const figmaIos = figmaVar && figmaVar.codeSyntax.iOS ? figmaVar.codeSyntax.iOS : undefined;

    const valuesToCheck: string[] = [];
    if (canonicalIos) {
      valuesToCheck.push(canonicalIos);
    }
    if (figmaIos && !valuesToCheck.includes(figmaIos)) {
      valuesToCheck.push(figmaIos);
    }

    for (const value of valuesToCheck) {
      if (!isIosDotSegmentFormat(value)) {
        failures.push(
          token.collection +
            '/' +
            token.name +
            ': iOS codeSyntax "' +
            value +
            '" has invalid format',
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
    diagnostic: 'All iOS codeSyntax strings use dot-segment lowercase format',
    severity: 'error',
  };
}
