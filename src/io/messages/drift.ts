import type { ComponentSpecV1, DriftReportV1, TokensV1 } from '@detroitlabs/fighub-contracts';

import type { ComponentDriftDetectResult, VariableDriftDetectResult } from '@/core/drift/types';

export interface DriftDetectVariablesMessage {
  type: 'drift/detect-variables';
  requestId: string;
  repoTokens: TokensV1;
}

export interface DriftDetectVariablesResultMessage {
  type: 'drift/detect-variables/result';
  requestId: string;
  ok: boolean;
  result?: VariableDriftDetectResult;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTokensV1(value: unknown): value is TokensV1 {
  if (!isRecord(value)) {
    return false;
  }
  return value.v === 1 && value.kind === 'tokens' && Array.isArray(value.tokens);
}

export function isDriftDetectVariablesMessage(message: unknown): message is DriftDetectVariablesMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'drift/detect-variables' &&
    typeof message.requestId === 'string' &&
    isTokensV1(message.repoTokens)
  );
}

export function isDriftDetectVariablesResultMessage(
  message: unknown,
): message is DriftDetectVariablesResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'drift/detect-variables/result' && typeof message.requestId === 'string';
}

export interface DriftDetectComponentsMessage {
  type: 'drift/detect-components';
  requestId: string;
  repoSpecs: Array<{ name: string; spec: ComponentSpecV1 }>;
  quickDetect?: boolean;
}

export interface DriftDetectComponentsResultMessage {
  type: 'drift/detect-components/result';
  requestId: string;
  ok: boolean;
  result?: ComponentDriftDetectResult;
  error?: string;
}

function isComponentSpecV1(value: unknown): value is ComponentSpecV1 {
  if (!isRecord(value)) {
    return false;
  }
  return value.v === 1 && value.kind === 'component-spec' && typeof value.name === 'string';
}

export function isDriftDetectComponentsMessage(message: unknown): message is DriftDetectComponentsMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'drift/detect-components' || typeof message.requestId !== 'string') {
    return false;
  }
  if (!Array.isArray(message.repoSpecs)) {
    return false;
  }
  for (let i = 0; i < message.repoSpecs.length; i++) {
    const entry = message.repoSpecs[i];
    if (!isRecord(entry) || typeof entry.name !== 'string' || !isComponentSpecV1(entry.spec)) {
      return false;
    }
  }
  return true;
}

export function isDriftDetectComponentsResultMessage(
  message: unknown,
): message is DriftDetectComponentsResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'drift/detect-components/result' && typeof message.requestId === 'string';
}

export interface DriftBuildReportMessage {
  type: 'drift/build-report';
  requestId: string;
  repoUrl: string;
  repoTokens: TokensV1;
  repoSpecs: Array<{ name: string; spec: ComponentSpecV1 }>;
  quickDetect?: boolean;
}

export interface DriftBuildReportResultMessage {
  type: 'drift/build-report/result';
  requestId: string;
  ok: boolean;
  report?: DriftReportV1;
  error?: string;
}

export function isDriftBuildReportMessage(message: unknown): message is DriftBuildReportMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'drift/build-report' || typeof message.requestId !== 'string') {
    return false;
  }
  if (typeof message.repoUrl !== 'string' || !isTokensV1(message.repoTokens)) {
    return false;
  }
  if (!Array.isArray(message.repoSpecs)) {
    return false;
  }
  for (let i = 0; i < message.repoSpecs.length; i++) {
    const entry = message.repoSpecs[i];
    if (!isRecord(entry) || typeof entry.name !== 'string' || !isComponentSpecV1(entry.spec)) {
      return false;
    }
  }
  return true;
}

export function isDriftBuildReportResultMessage(
  message: unknown,
): message is DriftBuildReportResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'drift/build-report/result' && typeof message.requestId === 'string';
}

export type ResolutionChoice =
  | { type: 'push' }
  | { type: 'pull' }
  | { type: 'skip' }
  | { type: 'custom'; value: unknown };

export interface DriftDetectQuickMessage {
  type: 'drift/detect-quick';
  requestId: string;
  repoUrl: string;
  repoTokens: TokensV1;
  repoSpecs: Array<{ name: string; spec: ComponentSpecV1 }>;
}

export interface DriftDetectQuickResultMessage {
  type: 'drift/detect-quick/result';
  requestId: string;
  ok: boolean;
  summary?: import('@detroitlabs/fighub-contracts').DriftReportSummary;
  report?: DriftReportV1;
  error?: string;
}

export interface OpsDetectDriftMessage {
  type: 'ops/detect-drift';
  requestId: string;
  repoUrl: string;
  repoTokens: TokensV1;
  repoSpecs: Array<{ name: string; spec: ComponentSpecV1 }>;
  scope?: ('variables' | 'components')[];
}

export interface OpsDetectDriftResultMessage {
  type: 'ops/detect-drift/result';
  requestId: string;
  ok: boolean;
  report?: DriftReportV1;
  error?: string;
}

export interface ResolutionBulkPushMessage {
  type: 'resolution/bulk-push';
  requestId: string;
  repoUrl: string;
  report: DriftReportV1;
  resolutions: Record<string, ResolutionChoice>;
  driftIds: string[];
  repoTokens: TokensV1;
  tokensPath?: string;
  specsPath?: string;
  repoSpecs?: Array<{ name: string; spec: ComponentSpecV1 }>;
  tokensWireFormat?: 'dtcg' | 'canonical';
}

export interface ResolutionBulkPullMessage {
  type: 'resolution/bulk-pull';
  requestId: string;
  report: DriftReportV1;
  resolutions: Record<string, ResolutionChoice>;
  driftIds: string[];
  repoSpecs?: Array<{ name: string; spec: ComponentSpecV1 }>;
}

export interface ResolutionBulkResultMessage {
  type: 'resolution/bulk-result';
  requestId: string;
  ok: boolean;
  prUrl?: string;
  appliedCount?: number;
  error?: string;
  warning?: string;
}

export function isDriftDetectQuickMessage(message: unknown): message is DriftDetectQuickMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'drift/detect-quick' &&
    typeof message.requestId === 'string' &&
    typeof message.repoUrl === 'string' &&
    isTokensV1(message.repoTokens)
  );
}

export function isDriftDetectQuickResultMessage(
  message: unknown,
): message is DriftDetectQuickResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'drift/detect-quick/result' && typeof message.requestId === 'string';
}

export function isOpsDetectDriftMessage(message: unknown): message is OpsDetectDriftMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'ops/detect-drift' &&
    typeof message.requestId === 'string' &&
    typeof message.repoUrl === 'string' &&
    isTokensV1(message.repoTokens)
  );
}

export function isOpsDetectDriftResultMessage(
  message: unknown,
): message is OpsDetectDriftResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'ops/detect-drift/result' && typeof message.requestId === 'string';
}

export function isResolutionBulkPushMessage(message: unknown): message is ResolutionBulkPushMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'resolution/bulk-push' &&
    typeof message.requestId === 'string' &&
    typeof message.repoUrl === 'string' &&
    isTokensV1(message.repoTokens)
  );
}

export function isResolutionBulkPullMessage(message: unknown): message is ResolutionBulkPullMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'resolution/bulk-pull' && typeof message.requestId === 'string';
}

export function isResolutionBulkResultMessage(
  message: unknown,
): message is ResolutionBulkResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'resolution/bulk-result' && typeof message.requestId === 'string';
}
