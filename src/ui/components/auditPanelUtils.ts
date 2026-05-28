import type { AuditReportV1, AuditRuleResult } from '@detroitlabs/fighub-contracts';

export type AuditRuleSortBucket = 'failed' | 'warn' | 'passed';

export function classifyAuditRule(result: AuditRuleResult): AuditRuleSortBucket {
  if (result.pass) {
    return 'passed';
  }
  const severity = result.severity ?? 'error';
  if (severity === 'warn') {
    return 'warn';
  }
  return 'failed';
}

/** Sort failed first, then warn, then passed (collapsed in UI). */
export function sortAuditRules(results: AuditRuleResult[]): AuditRuleResult[] {
  const failed: AuditRuleResult[] = [];
  const warned: AuditRuleResult[] = [];
  const passed: AuditRuleResult[] = [];

  for (const result of results) {
    const bucket = classifyAuditRule(result);
    if (bucket === 'failed') {
      failed.push(result);
    } else if (bucket === 'warn') {
      warned.push(result);
    } else {
      passed.push(result);
    }
  }

  return [...failed, ...warned, ...passed];
}

export function mergeAuditReports(reports: AuditReportV1[]): AuditReportV1 | null {
  if (reports.length === 0) {
    return null;
  }
  if (reports.length === 1) {
    return reports[0];
  }

  const combinedResults: AuditRuleResult[] = [];
  let rulesPassed = 0;
  let rulesFailed = 0;
  let rulesWarned = 0;
  let passed = true;
  let variablesCreated = 0;
  let variablesUpdated = 0;
  let variablesSkipped = 0;

  for (const report of reports) {
    combinedResults.push(...report.results);
    rulesPassed += report.summary.rulesPassed;
    rulesFailed += report.summary.rulesFailed;
    rulesWarned += report.summary.rulesWarned;
    variablesCreated += report.summary.variablesCreated;
    variablesUpdated += report.summary.variablesUpdated;
    variablesSkipped += report.summary.variablesSkipped;
    if (!report.passed) {
      passed = false;
    }
  }

  const primary = reports[0];
  return {
    v: 1,
    kind: 'audit-report',
    meta: primary.meta,
    passed: passed,
    summary: {
      variablesCreated: variablesCreated,
      variablesUpdated: variablesUpdated,
      variablesSkipped: variablesSkipped,
      rulesPassed: rulesPassed,
      rulesFailed: rulesFailed,
      rulesWarned: rulesWarned,
      modeCoverage: primary.summary.modeCoverage,
      codeSyntaxCoverage: primary.summary.codeSyntaxCoverage,
    },
    results: sortAuditRules(combinedResults),
  };
}
