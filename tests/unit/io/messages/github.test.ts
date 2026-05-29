import { describe, expect, it } from 'vitest';

import {
  isGitHubContentsErrorMessage,
  isGitHubContentsFetchMessage,
  isGitHubContentsResultMessage,
  isGitHubErrorMessage,
  isGitHubOAuthDeviceCodeMessage,
  isGitHubOAuthPollMessage,
  isGitHubOAuthPollResultMessage,
  isGitHubOAuthStartMessage,
  isGitHubTokenClearMessage,
  isGitHubTokenProbeMessage,
  isGitHubTokenSaveMessage,
  isGitHubTokenStatusMessage,
} from '@/io/messages/github';

describe('github message guards', () => {
  it('accepts valid github/oauth/start payloads', () => {
    expect(
      isGitHubOAuthStartMessage({ type: 'github/oauth/start', requestId: 'r1', scope: 'repo' }),
    ).toBe(true);
    expect(
      isGitHubOAuthStartMessage({ type: 'github/oauth/start', requestId: 'r1', scope: 'repo' }),
    ).toBe(true);
    expect(
      isGitHubOAuthStartMessage({ type: 'github/oauth/start', requestId: 'r2', scope: 'repo' }),
    ).toBe(true);
  });

  it('rejects invalid github/oauth/start payloads', () => {
    expect(isGitHubOAuthStartMessage({ type: 'github/oauth/start', requestId: 'r1' })).toBe(false);
    expect(isGitHubOAuthStartMessage({ type: 'github/oauth/poll', requestId: 'r1' })).toBe(false);
  });

  it('accepts valid token and contents messages', () => {
    expect(
      isGitHubTokenSaveMessage({
        type: 'github/token/save',
        repoUrl: 'https://github.com/acme/widgets',
        accessToken: 'gho_test',
        scope: 'repo',
      }),
    ).toBe(true);
    expect(
      isGitHubTokenClearMessage({
        type: 'github/token/clear',
        repoUrl: 'https://github.com/acme/widgets',
      }),
    ).toBe(true);
    expect(
      isGitHubTokenProbeMessage({
        type: 'github/token/probe',
        repoUrl: 'https://github.com/acme/widgets',
      }),
    ).toBe(true);
    expect(
      isGitHubContentsFetchMessage({
        type: 'github/contents/fetch',
        requestId: 'c1',
        repoUrl: 'https://github.com/acme/widgets',
        path: 'design/tokens.json',
      }),
    ).toBe(true);
  });

  it('rejects malformed token and contents messages', () => {
    expect(isGitHubTokenSaveMessage({ type: 'github/token/save', repoUrl: 'x' })).toBe(false);
    expect(isGitHubContentsFetchMessage({ type: 'github/contents/fetch', requestId: 'c1' })).toBe(
      false,
    );
  });

  it('accepts valid main-to-UI github responses', () => {
    expect(
      isGitHubOAuthDeviceCodeMessage({
        type: 'github/oauth/device-code',
        requestId: 'r1',
        ok: true,
      }),
    ).toBe(true);
    expect(
      isGitHubOAuthPollResultMessage({
        type: 'github/oauth/poll-result',
        requestId: 'r1',
        result: { status: 'pending' },
      }),
    ).toBe(true);
    expect(
      isGitHubTokenStatusMessage({
        type: 'github/token/status',
        repoUrl: 'https://github.com/acme/widgets',
        connected: true,
      }),
    ).toBe(true);
    expect(
      isGitHubContentsResultMessage({
        type: 'github/contents/result',
        requestId: 'c1',
        text: '{}',
      }),
    ).toBe(true);
    expect(
      isGitHubContentsErrorMessage({
        type: 'github/contents/error',
        requestId: 'c1',
        message: 'missing',
      }),
    ).toBe(true);
    expect(isGitHubErrorMessage({ type: 'github/error', message: 'boom' })).toBe(true);
  });

  it('rejects malformed main-to-UI github responses', () => {
    expect(isGitHubOAuthPollMessage({ type: 'github/oauth/poll', requestId: 'r1' })).toBe(false);
    expect(isGitHubTokenStatusMessage({ type: 'github/token/status', connected: true })).toBe(
      false,
    );
  });
});
