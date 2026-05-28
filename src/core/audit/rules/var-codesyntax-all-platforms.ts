import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { CODE_SYNTAX_PLATFORMS } from '../constants';
import { findFigmaVariable } from './_helpers';
import type { RuleInput } from '../types';

const RULE_ID = 'var/codesyntax-all-platforms';

export function checkVarCodesyntaxAllPlatforms(input: RuleInput): AuditRuleResult {
  const failures: string[] = [];

  for (const token of input.canonical.tokens) {
    const figmaVar = findFigmaVariable(input.figmaCollections, token.collection, token.name);
    if (!figmaVar) {
      continue;
    }
    for (const platform of CODE_SYNTAX_PLATFORMS) {
      const value = figmaVar.codeSyntax[platform];
      if (value === undefined || value.trim() === '') {
        failures.push(token.collection + '/' + token.name + ': missing codeSyntax.' + platform);
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
    diagnostic: 'All Figma variables have WEB, ANDROID, and iOS codeSyntax',
    severity: 'error',
  };
}
