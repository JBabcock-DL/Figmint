import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { isTokensV1 } from '@/io/sources/adapters/internal';

import type { StyleGuidePageSlug } from '@/core/canvas/types';

/** UI → main: bench a canvas page build (timing only). */
export interface CanvasBenchMessage {
  type: 'canvas/bench';
  page: StyleGuidePageSlug;
  tokens: TokensV1;
  label?: string;
}

/** Main → UI: bench finished. */
export interface CanvasBenchResultMessage {
  type: 'canvas/bench-result';
  result: import('@/core/canvas/bench').CanvasBenchResult;
}

/** UI → main: build a single style-guide page from canonical tokens. */
export interface CanvasBuildPageMessage {
  type: 'canvas/build-page';
  page: StyleGuidePageSlug;
  tokens: TokensV1;
}

/** Main → UI: canvas build finished. */
export interface CanvasBuildResultMessage {
  type: 'canvas/result';
  result: import('@/core/canvas/types').CanvasBuildResult;
}

/** Main → UI: canvas build failure. */
export interface CanvasBuildErrorMessage {
  type: 'canvas/error';
  message: string;
}

export type CanvasUiMessage = CanvasBuildResultMessage | CanvasBuildErrorMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isCanvasBenchMessage(message: unknown): message is CanvasBenchMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'canvas/bench') {
    return false;
  }
  if (
    message.page !== 'primitives' &&
    message.page !== 'theme' &&
    message.page !== 'text-styles' &&
    message.page !== 'token-overview' &&
    message.page !== 'layout' &&
    message.page !== 'effects'
  ) {
    return false;
  }
  if (!isTokensV1(message.tokens)) {
    return false;
  }
  return Array.isArray(message.tokens.tokens);
}

/** ES2017-safe guard for `src/main.ts` dispatch. */
export function isCanvasBuildPageMessage(message: unknown): message is CanvasBuildPageMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'canvas/build-page') {
    return false;
  }
  if (
    message.page !== 'primitives' &&
    message.page !== 'theme' &&
    message.page !== 'text-styles' &&
    message.page !== 'token-overview' &&
    message.page !== 'layout' &&
    message.page !== 'effects'
  ) {
    return false;
  }
  if (!isTokensV1(message.tokens)) {
    return false;
  }
  return Array.isArray(message.tokens.tokens);
}

export function isCanvasBuildResultMessage(message: unknown): message is CanvasBuildResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== 'canvas/result') {
    return false;
  }
  const result = message.result;
  if (!isRecord(result)) {
    return false;
  }
  return typeof result.durationMs === 'number' && typeof result.tableCount === 'number';
}

export function isCanvasBuildErrorMessage(message: unknown): message is CanvasBuildErrorMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'canvas/error' && typeof message.message === 'string';
}

export function isCanvasUiMessage(message: unknown): message is CanvasUiMessage {
  return isCanvasBuildResultMessage(message) || isCanvasBuildErrorMessage(message);
}
