import type { AuditReportV1, TokensV1 } from '@detroitlabs/fighub-contracts';

import type { PushResult } from '@/core/variables/types';
import { isTokensV1 } from '@/io/sources/adapters/internal';

export type BootstrapStepId =
  | 'adapt'
  | 'push-variables'
  | 'publish-typography'
  | 'prepare-style-guide'
  | 'build-primitives'
  | 'build-theme'
  | 'build-typography'
  | 'build-layout'
  | 'build-effects'
  | 'build-overview'
  | 'audit-canvas'
  | 'complete';

export type BootstrapStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface BootstrapProgressMessage {
  type: 'bootstrap/progress';
  step: BootstrapStepId;
  status: BootstrapStepStatus;
  label: string;
  detail?: string;
  elapsedMs?: number;
  audit?: AuditReportV1;
}

export interface BootstrapRunMessage {
  type: 'bootstrap/run';
  tokens: TokensV1;
  options?: {
    skipCanvas?: boolean;
    pages?: Array<'primitives' | 'theme' | 'typography' | 'layout' | 'effects' | 'overview'>;
  };
}

export interface BootstrapResultMessage {
  type: 'bootstrap/result';
  ok: boolean;
  totalDurationMs: number;
  pushResult: PushResult;
  audits: AuditReportV1[];
  canvasErrors?: Array<{ step: BootstrapStepId; message: string }>;
}

export interface BootstrapErrorMessage {
  type: 'bootstrap/error';
  message: string;
  failedStep?: BootstrapStepId;
}

export type BootstrapUiMessage =
  | BootstrapProgressMessage
  | BootstrapResultMessage
  | BootstrapErrorMessage;

/** Single source for progress UI row count and main-thread loop order. */
export const BOOTSTRAP_STEPS: Array<{ id: BootstrapStepId; label: string; fr: string }> = [
  { id: 'adapt', label: 'Adapt tokens', fr: 'FR-BOOT-1' },
  { id: 'push-variables', label: 'Push variables', fr: 'FR-BOOT-3' },
  { id: 'publish-typography', label: 'Publish typography styles', fr: 'FR-BOOT-6' },
  { id: 'prepare-style-guide', label: 'Prepare style-guide pages', fr: 'FR-BOOT-7' },
  { id: 'build-primitives', label: 'Build Primitives page', fr: 'FR-BOOT-7' },
  { id: 'build-theme', label: 'Build Theme page', fr: 'FR-BOOT-7' },
  { id: 'build-typography', label: 'Build Typography page', fr: 'FR-BOOT-7' },
  { id: 'build-layout', label: 'Build Layout page', fr: 'FR-BOOT-7' },
  { id: 'build-effects', label: 'Build Effects page', fr: 'FR-BOOT-7' },
  { id: 'build-overview', label: 'Build Token Overview page', fr: 'FR-BOOT-7' },
  { id: 'audit-canvas', label: 'Audit canvas', fr: 'FR-BOOT-8' },
  { id: 'complete', label: 'Complete', fr: 'FR-BOOT-8' },
];

const CANVAS_SKIP_DETAIL = 'Canvas builders not available (WO-011/12/13)';

export function getBootstrapStepLabel(stepId: BootstrapStepId): string {
  for (let i = 0; i < BOOTSTRAP_STEPS.length; i++) {
    if (BOOTSTRAP_STEPS[i].id === stepId) {
      return BOOTSTRAP_STEPS[i].label;
    }
  }
  return stepId;
}

export function getCanvasSkipDetail(): string {
  return CANVAS_SKIP_DETAIL;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBootstrapStepId(value: unknown): value is BootstrapStepId {
  if (typeof value !== 'string') {
    return false;
  }
  for (let i = 0; i < BOOTSTRAP_STEPS.length; i++) {
    if (BOOTSTRAP_STEPS[i].id === value) {
      return true;
    }
  }
  return false;
}

function isBootstrapStepStatus(value: unknown): value is BootstrapStepStatus {
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

function isPushResultShape(value: unknown): value is PushResult {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.created === 'number' &&
    typeof value.updated === 'number' &&
    typeof value.skipped === 'number' &&
    Array.isArray(value.errors) &&
    typeof value.totalDurationMs === 'number'
  );
}

/** ES2017-safe guard for `src/main.ts` dispatch. */
export function isBootstrapRunMessage(message: unknown): message is BootstrapRunMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'bootstrap/run') {
    return false;
  }
  if (!isTokensV1(message.tokens)) {
    return false;
  }
  return Array.isArray(message.tokens.tokens);
}

/** ES2017-safe guard for UI message listener. */
export function isBootstrapProgressMessage(message: unknown): message is BootstrapProgressMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'bootstrap/progress') {
    return false;
  }
  if (!isBootstrapStepId(message.step)) {
    return false;
  }
  if (!isBootstrapStepStatus(message.status)) {
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

export function isBootstrapResultMessage(message: unknown): message is BootstrapResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'bootstrap/result') {
    return false;
  }
  if (typeof message.ok !== 'boolean') {
    return false;
  }
  if (typeof message.totalDurationMs !== 'number') {
    return false;
  }
  if (!isPushResultShape(message.pushResult)) {
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
  return true;
}

export function isBootstrapErrorMessage(message: unknown): message is BootstrapErrorMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'bootstrap/error') {
    return false;
  }
  if (typeof message.message !== 'string') {
    return false;
  }
  if (message.failedStep !== undefined && !isBootstrapStepId(message.failedStep)) {
    return false;
  }
  return true;
}

export function isBootstrapUiMessage(message: unknown): message is BootstrapUiMessage {
  return (
    isBootstrapProgressMessage(message) ||
    isBootstrapResultMessage(message) ||
    isBootstrapErrorMessage(message)
  );
}

/** Main-thread step IDs executed after UI adapt gate (excludes adapt + complete). */
export const MAIN_BOOTSTRAP_STEP_IDS: BootstrapStepId[] = [
  'push-variables',
  'publish-typography',
  'prepare-style-guide',
  'build-primitives',
  'build-theme',
  'build-typography',
  'build-layout',
  'build-effects',
  'build-overview',
  'audit-canvas',
];

export function getMainBootstrapStepIds(
  options?: BootstrapRunMessage['options'],
): BootstrapStepId[] {
  if (options !== undefined && options.skipCanvas === true) {
    return ['push-variables', 'publish-typography', 'audit-canvas'];
  }
  return MAIN_BOOTSTRAP_STEP_IDS.slice();
}
