import type { DeviceCodeResponse, DeviceTokenPollResult } from '@/io/github/deviceFlow';
import type { ResolvedFigHubConfig } from '@detroitlabs/fighub-contracts';

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
}

export interface GitHubTokenClearMessage {
  type: 'github/token/clear';
  repoUrl: string;
}

export interface GitHubTokenProbeMessage {
  type: 'github/token/probe';
  repoUrl: string;
}

export interface GitHubSessionLoadMessage {
  type: 'github/session/load';
}

export interface GitHubSessionLoadedMessage {
  type: 'github/session/loaded';
  repoUrl?: string;
  connected?: boolean;
  resolvedConfig?: ResolvedFigHubConfig;
  lastFetchedAt?: string | null;
  lastPulledAt?: string | null;
  lastPushedAt?: string | null;
  configWarning?: string | null;
}

export interface GitHubRepoFetchMessage {
  type: 'github/repo/fetch';
  requestId: string;
  repoUrl: string;
}

export interface GitHubRepoFetchResultMessage {
  type: 'github/repo/fetch-result';
  requestId: string;
  ok: boolean;
  config?: ResolvedFigHubConfig;
  lastFetchedAt?: string;
  warning?: string;
  error?: string;
}

export interface GitHubRepoPullMessage {
  type: 'github/repo/pull';
  requestId: string;
  repoUrl: string;
}

export interface GitHubRepoPullResultMessage {
  type: 'github/repo/pull-result';
  requestId: string;
  ok: boolean;
  kind?: string;
  cachedAt?: string;
  error?: string;
}

export interface GitHubRepoPushMessage {
  type: 'github/repo/push';
  requestId: string;
  repoUrl: string;
}

export interface GitHubRepoPushResultMessage {
  type: 'github/repo/push-result';
  requestId: string;
  ok: boolean;
  prUrl?: string;
  prNumber?: number;
  lastPushedAt?: string;
  error?: string;
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
  | GitHubSessionLoadMessage
  | GitHubContentsFetchMessage
  | GitHubRepoFetchMessage
  | GitHubRepoPullMessage
  | GitHubRepoPushMessage;

export type GitHubUiMessage =
  | GitHubOAuthDeviceCodeMessage
  | GitHubOAuthPollResultMessage
  | GitHubTokenStatusMessage
  | GitHubSessionLoadedMessage
  | GitHubContentsResultMessage
  | GitHubContentsErrorMessage
  | GitHubRepoFetchResultMessage
  | GitHubRepoPullResultMessage
  | GitHubRepoPushResultMessage
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

export function isGitHubSessionLoadMessage(message: unknown): message is GitHubSessionLoadMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'github/session/load';
}

export function isGitHubSessionLoadedMessage(
  message: unknown,
): message is GitHubSessionLoadedMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'github/session/loaded';
}

export function isGitHubRepoFetchMessage(message: unknown): message is GitHubRepoFetchMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/repo/fetch' &&
    typeof message.requestId === 'string' &&
    typeof message.repoUrl === 'string'
  );
}

export function isGitHubRepoFetchResultMessage(
  message: unknown,
): message is GitHubRepoFetchResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/repo/fetch-result' && typeof message.requestId === 'string'
  );
}

export function isGitHubRepoPullMessage(message: unknown): message is GitHubRepoPullMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/repo/pull' &&
    typeof message.requestId === 'string' &&
    typeof message.repoUrl === 'string'
  );
}

export function isGitHubRepoPullResultMessage(
  message: unknown,
): message is GitHubRepoPullResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'github/repo/pull-result' && typeof message.requestId === 'string';
}

export function isGitHubRepoPushMessage(message: unknown): message is GitHubRepoPushMessage {
  if (!isRecord(message)) {
    return false;
  }
  return (
    message.type === 'github/repo/push' &&
    typeof message.requestId === 'string' &&
    typeof message.repoUrl === 'string'
  );
}

export function isGitHubRepoPushResultMessage(
  message: unknown,
): message is GitHubRepoPushResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  return message.type === 'github/repo/push-result' && typeof message.requestId === 'string';
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
