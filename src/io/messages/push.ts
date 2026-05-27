import type { AuditReportV1, TokensV1 } from '@detroitlabs/figmint-contracts';

import type { PushResult } from '@/core/variables/types';
import { isTokensV1 } from '@/io/sources/adapters/internal';

import type { FormatError } from '@/io/sources/adapters';

/** UI → main: run variable push for canonical tokens. */
export interface PushVariablesMessage {
  type: 'push/variables';
  tokens: TokensV1;
}

/** Main → UI: push finished (includes audit from WO-010). */
export interface PushResultMessage {
  type: 'push/result';
  result: PushResult;
  audit: AuditReportV1;
}

/** Main → UI: adapt/validation failure before push, or catastrophic push failure. */
export interface PushErrorMessage {
  type: 'push/error';
  message: string;
  path?: string;
}

export type PushUiMessage = PushResultMessage | PushErrorMessage;

export function isAdaptedTokensV1(result: TokensV1 | FormatError): result is TokensV1 {
  return 'kind' in result && result.kind === 'tokens';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** ES2017-safe guard for `src/main.ts` dispatch. */
export function isPushVariablesMessage(message: unknown): message is PushVariablesMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'push/variables') {
    return false;
  }
  if (!isTokensV1(message.tokens)) {
    return false;
  }
  return Array.isArray(message.tokens.tokens);
}

/** ES2017-safe guard for optional main-side validation of outbound UI messages. */
export function isPushResultMessage(message: unknown): message is PushResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'push/result') {
    return false;
  }
  const result = message.result;
  const audit = message.audit;
  if (!isRecord(result) || !isRecord(audit)) {
    return false;
  }
  if (typeof result.totalDurationMs !== 'number') {
    return false;
  }
  return audit.v === 1 && audit.kind === 'audit-report' && typeof audit.passed === 'boolean';
}

export function isPushErrorMessage(message: unknown): message is PushErrorMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'push/error' && typeof message.message === 'string';
}

export function isPushUiMessage(message: unknown): message is PushUiMessage {
  return isPushResultMessage(message) || isPushErrorMessage(message);
}
