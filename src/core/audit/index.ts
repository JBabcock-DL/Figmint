export { runAudit, runDocPipelinePreflightAudit } from './runAudit';
export { readFigmaVariableState } from './readFigmaVariableState';
export type {
  CanvasAuditInput,
  ComponentAuditInput,
  FigmaCollectionSnapshot,
  FigmaVariableSnapshot,
  PushResult,
  PushResultWithAudit,
  RuleInput,
} from './types';
export type { AuditReportSummary, AuditReportV1, AuditRuleResult, AuditScope } from './types';
// After applyBindings: runAudit('component', { spec, componentSet, bindingsResult: result })
