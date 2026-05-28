import type { AuditReportSummary, AuditRuleResult, TokensV1 } from '@detroitlabs/fighub-contracts';

import { scanCodeSyntaxCoverage, scanModeCoverage } from './rules/_helpers';
import type { FigmaCollectionSnapshot, PushResult } from './types';

export function buildAuditSummary(
  results: AuditRuleResult[],
  pushResult: PushResult,
  canonical: TokensV1,
  figmaCollections: FigmaCollectionSnapshot[],
): AuditReportSummary {
  let rulesPassed = 0;
  let rulesFailed = 0;
  let rulesWarned = 0;

  for (const result of results) {
    const severity = result.severity !== undefined ? result.severity : 'error';
    if (result.pass) {
      rulesPassed += 1;
    } else if (severity === 'warn') {
      rulesWarned += 1;
    } else {
      rulesFailed += 1;
    }
  }

  return {
    variablesCreated: pushResult.created,
    variablesUpdated: pushResult.updated,
    variablesSkipped: pushResult.skipped,
    rulesPassed,
    rulesFailed,
    rulesWarned,
    modeCoverage: scanModeCoverage(canonical, figmaCollections),
    codeSyntaxCoverage: scanCodeSyntaxCoverage(figmaCollections),
  };
}
