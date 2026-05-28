import type { DeviceCodeResponse, DeviceTokenPollResult } from '@/io/github/deviceFlow';

export interface GitHubOAuthStartMessage {
  type: 'github/oauth/start';
  requestId: string;
  scope: string;
}

export interface GitHubOAuthPollMessage {
  type: 'github/oauth/poll';
  requestId: string;
  deviceCode: string;
}

export interface GitHubTokenSaveMessage {
  type: 'github/token/save';
  repoUrl: string;
  accessToken: string;
  scope: string;
  tokensPath?: string;
}

export interface GitHubTokenClearMessage {
  type: 'github/token/clear';
  repoUrl: string;
}

export interface GitHubTokenProbeMessage {
  type: 'github/token/probe';
  repoUrl: string;
}

export interface GitHubContentsFetchMessage {
  type: 'github/contents/fetch';
  requestId: string;
  repoUrl: string;
  path: string;
  ref?: string;
}

export interface GitHubOAuthDeviceCodeMessage {
  type: 'github/oauth/device-code';
  requestId: string;
  ok: boolean;
  device?: DeviceCodeResponse;
  error?: string;
}

export interface GitHubOAuthPollResultMessage {
  type: 'github/oauth/poll-result';
  requestId: string;
  result: DeviceTokenPollResult;
}

export interface GitHubTokenStatusMessage {
  type: 'github/token/status';
  repoUrl: string;
  connected: boolean;
  scope?: string;
  tokenPreview?: string;
  tokensPath?: string;
}

export interface GitHubContentsResultMessage {
  type: 'github/contents/result';
  requestId: string;
  text: string;
  sha?: string;
}

export interface GitHubContentsErrorMessage {
  type: 'github/contents/error';
  requestId: string;
  message: string;
}

export interface GitHubErrorMessage {
  type: 'github/error';
  message: string;
}

export type GitHubMainMessage =
  | GitHubOAuthStartMessage
  | GitHubOAuthPollMessage
  | GitHubTokenSaveMessage
  | GitHubTokenClearMessage
  | GitHubTokenProbeMessage
  | GitHubContentsFetchMessage;

export type GitHubUiMessage =
  | GitHubOAuthDeviceCodeMessage
  | GitHubOAuthPollResultMessage
  | GitHubTokenStatusMessage
  | GitHubContentsResultMessage
  | GitHubContentsErrorMessage
  | GitHubErrorMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isGitHubOAuthStartMessage(message: unknown): message is GitHubOAuthStartMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/oauth/start' &&
    typeof message.requestId === 'string' &&
    typeof message.scope === 'string'
  );
}

export function isGitHubOAuthPollMessage(message: unknown): message is GitHubOAuthPollMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/oauth/poll' &&
    typeof message.requestId === 'string' &&
    typeof message.deviceCode === 'string'
  );
}

export function isGitHubTokenSaveMessage(message: unknown): message is GitHubTokenSaveMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/token/save' &&
    typeof message.repoUrl === 'string' &&
    typeof message.accessToken === 'string' &&
    typeof message.scope === 'string'
  );
}

export function isGitHubTokenClearMessage(message: unknown): message is GitHubTokenClearMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'github/token/clear' && typeof message.repoUrl === 'string';
}

export function isGitHubTokenProbeMessage(message: unknown): message is GitHubTokenProbeMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'github/token/probe' && typeof message.repoUrl === 'string';
}

export function isGitHubContentsFetchMessage(
  message: unknown,
): message is GitHubContentsFetchMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/contents/fetch' &&
    typeof message.requestId === 'string' &&
    typeof message.repoUrl === 'string' &&
    typeof message.path === 'string'
  );
}

export function isGitHubOAuthDeviceCodeMessage(
  message: unknown,
): message is GitHubOAuthDeviceCodeMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'github/oauth/device-code' && typeof message.requestId === 'string';
}

export function isGitHubOAuthPollResultMessage(
  message: unknown,
): message is GitHubOAuthPollResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'github/oauth/poll-result' && typeof message.requestId === 'string';
}

export function isGitHubTokenStatusMessage(message: unknown): message is GitHubTokenStatusMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/token/status' &&
    typeof message.repoUrl === 'string' &&
    typeof message.connected === 'boolean'
  );
}

export function isGitHubContentsResultMessage(
  message: unknown,
): message is GitHubContentsResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/contents/result' &&
    typeof message.requestId === 'string' &&
    typeof message.text === 'string'
  );
}

export function isGitHubContentsErrorMessage(
  message: unknown,
): message is GitHubContentsErrorMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/contents/error' &&
    typeof message.requestId === 'string' &&
    typeof message.message === 'string'
  );
}

export function isGitHubErrorMessage(message: unknown): message is GitHubErrorMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'github/error' && typeof message.message === 'string';
}
