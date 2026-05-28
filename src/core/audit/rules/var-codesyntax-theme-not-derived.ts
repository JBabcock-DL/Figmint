import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { CODE_SYNTAX_PLATFORMS } from '../constants';
import { findFigmaVariable } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/codesyntax-theme-not-derived';

function hasExplicitCodeSyntax(token: import('@detroitlabs/fighub-contracts').Token): boolean {
  if (!token.codeSyntax) {
    return false;
  }
  for (const platform of CODE_SYNTAX_PLATFORMS) {
    const value = token.codeSyntax[platform];
    if (value === undefined || value.trim() === '') {
      return false;
    }
  }
  return true;
}

export function checkVarCodesyntaxThemeNotDerived(input: RuleInput): AuditRuleResult {
  const failures: string[] = [];

  for (const token of input.canonical.tokens) {
    if (token.collection !== 'theme') {
      continue;
    }

    if (!hasExplicitCodeSyntax(token)) {
      failures.push(
        token.collection +
          '/' +
          token.name +
          ': Theme codeSyntax must come from Step 6 table, not path',
      );
      continue;
    }

    const figmaVar = findFigmaVariable(input.figmaCollections, token.collection, token.name);
    if (!figmaVar) {
      continue;
    }

    for (const platform of CODE_SYNTAX_PLATFORMS) {
      const expected = token.codeSyntax ? token.codeSyntax[platform] : undefined;
      const actual = figmaVar.codeSyntax[platform];
      if (expected !== actual) {
        failures.push(
          token.collection +
            '/' +
            token.name +
            ': Theme codeSyntax must come from Step 6 table, not path',
        );
        break;
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
    diagnostic: 'Theme tokens use explicit canonical codeSyntax only',
    severity: 'error',
  };
}
