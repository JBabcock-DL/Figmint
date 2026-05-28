import type {
  AuditReportV1,
  ComponentSpecV1,
  RegistryV1,
} from '@detroitlabs/fighub-contracts';

import type {
  ApplyBindingsResult,
  ApplyPropertiesResult,
  ScaffoldResult,
} from '@/core/components/scaffold/types';

export type ScaffoldStepId =
  | 'doc-preflight'
  | 'scaffold-geometry'
  | 'apply-bindings'
  | 'apply-properties'
  | 'build-doc-pipeline'
  | 'build-usage-frame'
  | 'update-registry'
  | 'audit-component'
  | 'complete';

export type ScaffoldStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface ScaffoldRunMessage {
  type: 'scaffold/run';
  spec: ComponentSpecV1;
  options?: {
    registry?: RegistryV1;
    skipUsageFrame?: boolean;
    skipRegistry?: boolean;
  };
}

export interface ScaffoldProgressMessage {
  type: 'scaffold/progress';
  step: ScaffoldStepId;
  status: ScaffoldStepStatus;
  label: string;
  detail?: string;
  elapsedMs?: number;
  audit?: AuditReportV1;
}

export interface ScaffoldResultMessage {
  type: 'scaffold/result';
  ok: boolean;
  totalDurationMs: number;
  componentSetId: string;
  componentSetName: string;
  registry: RegistryV1;
  audits: AuditReportV1[];
  scaffold: ScaffoldResult;
  bindings?: ApplyBindingsResult;
  properties?: ApplyPropertiesResult;
}

export interface ScaffoldErrorMessage {
  type: 'scaffold/error';
  message: string;
  failedStep?: ScaffoldStepId;
}

export type ScaffoldUiMessage =
  | ScaffoldProgressMessage
  | ScaffoldResultMessage
  | ScaffoldErrorMessage;

export const SCAFFOLD_STEPS: Array<{ id: ScaffoldStepId; label: string }> = [
  { id: 'doc-preflight', label: 'Pre-flight doc-pipeline check' },
  { id: 'scaffold-geometry', label: 'Building variant matrix' },
  { id: 'apply-bindings', label: 'Applying variable bindings' },
  { id: 'apply-properties', label: 'Adding component properties' },
  { id: 'build-doc-pipeline', label: 'Building doc pipeline' },
  { id: 'update-registry', label: 'Updating registry document' },
  { id: 'audit-component', label: 'Running component audit' },
  { id: 'complete', label: 'Done' },
];

export function getScaffoldStepLabel(stepId: ScaffoldStepId): string {
  if (stepId === 'build-usage-frame') {
    return 'Building doc pipeline';
  }
  for (let i = 0; i < SCAFFOLD_STEPS.length; i++) {
    if (SCAFFOLD_STEPS[i].id === stepId) {
      return SCAFFOLD_STEPS[i].label;
    }
  }
  return stepId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isScaffoldStepId(value: unknown): value is ScaffoldStepId {
  if (typeof value !== 'string') {
    return false;
  }
  for (let i = 0; i < SCAFFOLD_STEPS.length; i++) {
    if (SCAFFOLD_STEPS[i].id === value) {
      return true;
    }
  }
  return false;
}

function isScaffoldStepStatus(value: unknown): value is ScaffoldStepStatus {
  return (
    value === 'pending' ||
    value === 'running' ||
    value === 'done' ||
    value === 'error' ||
    value === 'skipped'
  );
}

function isAuditReportV1(value: unknown): value is AuditReportV1 {
  if (!isRecord(value)) {
    return false;
  }
  return value.v === 1 && value.kind === 'audit-report' && typeof value.passed === 'boolean';
}

function isComponentSpecShape(value: unknown): value is ComponentSpecV1 {
  if (!isRecord(value)) {
    return false;
  }
  if (value.v !== 1 || value.kind !== 'component-spec') {
    return false;
  }
  if (typeof value.name !== 'string' || value.name.length === 0) {
    return false;
  }
  if (!Array.isArray(value.props) || !Array.isArray(value.bindings)) {
    return false;
  }
  if (!isRecord(value.variantMatrix)) {
    return false;
  }
  return true;
}

function isScaffoldResultShape(value: unknown): value is ScaffoldResult {
  if (!isRecord(value)) {
    return false;
  }
  if (!isRecord(value.componentSet)) {
    return false;
  }
  return (
    typeof value.componentSet.id === 'string' &&
    typeof value.variantCount === 'number' &&
    typeof value.scaffoldId === 'string' &&
    Array.isArray(value.auditRows)
  );
}

/** ES2017-safe guard for `src/main.ts` dispatch. */
export function isScaffoldRunMessage(message: unknown): message is ScaffoldRunMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'scaffold/run') {
    return false;
  }
  return isComponentSpecShape(message.spec);
}

export function isScaffoldProgressMessage(message: unknown): message is ScaffoldProgressMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'scaffold/progress') {
    return false;
  }
  if (!isScaffoldStepId(message.step)) {
    return false;
  }
  if (!isScaffoldStepStatus(message.status)) {
    return false;
  }
  if (typeof message.label !== 'string') {
    return false;
  }
  if (message.audit !== undefined && !isAuditReportV1(message.audit)) {
    return false;
  }
  return true;
}

export function isScaffoldResultMessage(message: unknown): message is ScaffoldResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'scaffold/result') {
    return false;
  }
  if (typeof message.ok !== 'boolean') {
    return false;
  }
  if (typeof message.totalDurationMs !== 'number') {
    return false;
  }
  if (typeof message.componentSetId !== 'string') {
    return false;
  }
  if (typeof message.componentSetName !== 'string') {
    return false;
  }
  if (!isRecord(message.registry) || message.registry.kind !== 'registry') {
    return false;
  }
  if (!Array.isArray(message.audits)) {
    return false;
  }
  for (let i = 0; i < message.audits.length; i++) {
    if (!isAuditReportV1(message.audits[i])) {
      return false;
    }
  }
  if (!isScaffoldResultShape(message.scaffold)) {
    return false;
  }
  return true;
}

export function isScaffoldErrorMessage(message: unknown): message is ScaffoldErrorMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'scaffold/error') {
    return false;
  }
  if (typeof message.message !== 'string') {
    return false;
  }
  if (message.failedStep !== undefined && !isScaffoldStepId(message.failedStep)) {
    return false;
  }
  return true;
}

export function isScaffoldUiMessage(message: unknown): message is ScaffoldUiMessage {
  return (
    isScaffoldProgressMessage(message) ||
    isScaffoldResultMessage(message) ||
    isScaffoldErrorMessage(message)
  );
}
