import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import type { RuleInput } from '../types';
import { checkVarAliasResolves } from './var-alias-resolves';
import { checkVarAliasTargetExists } from './var-alias-target-exists';
import { checkVarCanonicalUniqueKeys } from './var-canonical-unique-keys';
import { checkVarCollectionModesMatch } from './var-collection-modes-match';
import { checkVarCollectionsExist } from './var-collections-exist';
import { checkVarCodesyntaxAllPlatforms } from './var-codesyntax-all-platforms';
import { checkVarCodesyntaxIosFormat } from './var-codesyntax-ios-format';
import { checkVarCodesyntaxMatchesCanonical } from './var-codesyntax-matches-canonical';
import { checkVarCodesyntaxThemeNotDerived } from './var-codesyntax-theme-not-derived';
import { checkVarEvcTypographyParent } from './var-evc-typography-parent';
import { checkVarModeValuePresent } from './var-mode-value-present';
import { checkVarPushCountsPresent } from './var-push-counts-present';
import { checkVarPushNoErrors } from './var-push-no-errors';
import { checkVarTokenCountMatch } from './var-token-count-match';
import { checkVarTokenNamesMatch } from './var-token-names-match';
import { checkVarValueMatchesCanonical } from './var-value-matches-canonical';

export const VARIABLE_RULES: ((input: RuleInput) => AuditRuleResult)[] = [
  checkVarPushCountsPresent,
  checkVarPushNoErrors,
  checkVarCollectionsExist,
  checkVarCollectionModesMatch,
  checkVarTokenCountMatch,
  checkVarTokenNamesMatch,
  checkVarModeValuePresent,
  checkVarAliasTargetExists,
  checkVarAliasResolves,
  checkVarValueMatchesCanonical,
  checkVarCodesyntaxAllPlatforms,
  checkVarCodesyntaxMatchesCanonical,
  checkVarCodesyntaxIosFormat,
  checkVarCodesyntaxThemeNotDerived,
  checkVarCanonicalUniqueKeys,
  checkVarEvcTypographyParent,
];

export function runVariableRules(input: RuleInput): AuditRuleResult[] {
  const results: AuditRuleResult[] = [];
  for (const rule of VARIABLE_RULES) {
    results.push(rule(input));
  }
  return results;
}

export {
  checkVarAliasResolves,
  checkVarAliasTargetExists,
  checkVarCanonicalUniqueKeys,
  checkVarCollectionModesMatch,
  checkVarCollectionsExist,
  checkVarCodesyntaxAllPlatforms,
  checkVarCodesyntaxIosFormat,
  checkVarCodesyntaxMatchesCanonical,
  checkVarCodesyntaxThemeNotDerived,
  checkVarEvcTypographyParent,
  checkVarModeValuePresent,
  checkVarPushCountsPresent,
  checkVarPushNoErrors,
  checkVarTokenCountMatch,
  checkVarTokenNamesMatch,
  checkVarValueMatchesCanonical,
};
