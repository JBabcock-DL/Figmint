import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { mapCodeSyntax } from '../../variables/codeSyntax';
import { CODE_SYNTAX_PLATFORMS } from '../constants';
import { findFigmaVariable } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/codesyntax-matches-canonical';

export function checkVarCodesyntaxMatchesCanonical(input: RuleInput): AuditRuleResult {
  const failures: string[] = [];

  for (const token of input.canonical.tokens) {
    const expectedSyntax = mapCodeSyntax(token);
    const figmaVar = findFigmaVariable(input.figmaCollections, token.collection, token.name);
    if (!figmaVar) {
      continue;
    }

    for (const platform of CODE_SYNTAX_PLATFORMS) {
      const expected = expectedSyntax[platform];
      const actual = figmaVar.codeSyntax[platform];
      if (expected !== undefined && expected !== actual) {
        failures.push(
          token.collection +
            '/' +
            token.name +
            ' ' +
            platform +
            ': expected "' +
            expected +
            '", got "' +
            String(actual) +
            '"',
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
    diagnostic: 'Figma codeSyntax matches canonical (including derived values)',
    severity: 'error',
  };
}
