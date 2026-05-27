export type AuditScope = 'variables' | 'canvas' | 'component';

export type AuditSeverity = 'error' | 'warn';

export interface AuditRuleResult {
  ruleId: string;
  pass: boolean;
  diagnostic: string;
  severity?: AuditSeverity;
}

export interface AuditReportSummary {
  variablesCreated: number;
  variablesUpdated: number;
  variablesSkipped: number;
  rulesPassed: number;
  rulesFailed: number;
  rulesWarned: number;
  modeCoverage: Record<string, { expected: string[]; missing: string[] }>;
  codeSyntaxCoverage: Record<'WEB' | 'ANDROID' | 'iOS', { expected: number; missing: number }>;
}

export interface AuditReportMeta {
  generatedAt: string;
  scope: AuditScope;
  figmaFileKey?: string;
  operation: 'push-variables';
}

/**
 * Post-operation validation report.
 * `passed` is true iff every result with severity !== 'warn' (default error) has pass: true.
 */
export interface AuditReportV1 {
  v: 1;
  kind: 'audit-report';
  meta: AuditReportMeta;
  passed: boolean;
  summary: AuditReportSummary;
  results: AuditRuleResult[];
}
