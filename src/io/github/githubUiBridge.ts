import {
  isGitHubContentsErrorMessage,
  isGitHubContentsResultMessage,
  isGitHubErrorMessage,
  isGitHubOAuthDeviceCodeMessage,
  isGitHubOAuthPollResultMessage,
  isGitHubRepoPathsListResultMessage,
  isGitHubSessionLoadedMessage,
  isGitHubTokenResolverClearResultMessage,
  isGitHubTokenResolverLoadResultMessage,
  isGitHubTokenResolverSaveResultMessage,
  isGitHubTokenStatusMessage,
} from '@/io/messages/github';
import type { DeviceCodeResponse, DeviceTokenPollResult } from '@/io/github/deviceFlow';
import { isValidRepoUrl } from '@/io/github/repoUrl';

let nextRequestId = 1;
let listenerRegistered = false;

interface PendingEntry {
  resolveDevice?: (device: DeviceCodeResponse) => void;
  rejectDevice?: (error: Error) => void;
  resolvePoll?: (result: DeviceTokenPollResult) => void;
  resolveContents?: (result: { text: string; sha?: string }) => void;
  rejectContents?: (error: Error) => void;
  resolveRepoPaths?: (paths: string[]) => void;
  rejectRepoPaths?: (error: Error) => void;
  resolveTokenResolverLoad?: (manualMap: Record<string, string> | null) => void;
  rejectTokenResolverLoad?: (error: Error) => void;
  resolveVoid?: () => void;
  rejectVoid?: (error: Error) => void;
}

const pending = new Map<string, PendingEntry>();

function nextId(prefix: string): string {
  const id = prefix + '-' + String(nextRequestId);
  nextRequestId += 1;
  return id;
}

function extractPluginMessage(event: MessageEvent<unknown>): unknown {
  const data = event.data;
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  const record = data as Record<string, unknown>;
  return record.pluginMessage;
}

export function registerGitHubMessageListener(): void {
  if (listenerRegistered) {
    return;
  }
  listenerRegistered = true;

  window.addEventListener('message', function (event: MessageEvent<unknown>) {
    const message = extractPluginMessage(event);
    if (message === undefined) {
      return;
    }

    if (isGitHubOAuthDeviceCodeMessage(message)) {
      const entry = pending.get(message.requestId);
      if (entry !== undefined) {
        if (message.ok && message.device !== undefined) {
          if (entry.resolveDevice !== undefined) {
            entry.resolveDevice(message.device);
          }
        } else if (entry.rejectDevice !== undefined) {
          entry.rejectDevice(
            new Error(message.error !== undefined ? message.error : 'Device code failed'),
          );
        }
        pending.delete(message.requestId);
      }
      return;
    }

    if (isGitHubOAuthPollResultMessage(message)) {
      const entry = pending.get(message.requestId);
      if (entry?.resolvePoll !== undefined) {
        entry.resolvePoll(message.result);
        pending.delete(message.requestId);
      }
      return;
    }

    if (isGitHubContentsResultMessage(message)) {
      const entry = pending.get(message.requestId);
      if (entry?.resolveContents !== undefined) {
        entry.resolveContents({ text: message.text, sha: message.sha });
        pending.delete(message.requestId);
      }
      return;
    }

    if (isGitHubContentsErrorMessage(message)) {
      const entry = pending.get(message.requestId);
      if (entry?.rejectContents !== undefined) {
        entry.rejectContents(new Error(message.message));
        pending.delete(message.requestId);
      }
      return;
    }

    if (isGitHubRepoPathsListResultMessage(message)) {
      const entry = pending.get(message.requestId);
      if (entry === undefined) {
        return;
      }
      if (message.ok && message.paths !== undefined) {
        if (entry.resolveRepoPaths !== undefined) {
          entry.resolveRepoPaths(message.paths);
        }
      } else if (entry.rejectRepoPaths !== undefined) {
        entry.rejectRepoPaths(
          new Error(message.error !== undefined ? message.error : 'Repo path list failed'),
        );
      }
      pending.delete(message.requestId);
      return;
    }

    if (isGitHubTokenResolverLoadResultMessage(message)) {
      const entry = pending.get(message.requestId);
      if (entry === undefined) {
        return;
      }
      if (message.ok) {
        if (entry.resolveTokenResolverLoad !== undefined) {
          entry.resolveTokenResolverLoad(message.manualMap !== undefined ? message.manualMap : null);
        }
      } else if (entry.rejectTokenResolverLoad !== undefined) {
        entry.rejectTokenResolverLoad(
          new Error(message.error !== undefined ? message.error : 'Token resolver load failed'),
        );
      }
      pending.delete(message.requestId);
      return;
    }

    if (isGitHubTokenResolverSaveResultMessage(message)) {
      const entry = pending.get(message.requestId);
      if (entry === undefined) {
        return;
      }
      if (message.ok) {
        if (entry.resolveVoid !== undefined) {
          entry.resolveVoid();
        }
      } else if (entry.rejectVoid !== undefined) {
        entry.rejectVoid(
          new Error(message.error !== undefined ? message.error : 'Token resolver save failed'),
        );
      }
      pending.delete(message.requestId);
      return;
    }

    if (isGitHubTokenResolverClearResultMessage(message)) {
      const entry = pending.get(message.requestId);
      if (entry === undefined) {
        return;
      }
      if (message.ok) {
        if (entry.resolveVoid !== undefined) {
          entry.resolveVoid();
        }
      } else if (entry.rejectVoid !== undefined) {
        entry.rejectVoid(
          new Error(message.error !== undefined ? message.error : 'Token resolver clear failed'),
        );
      }
      pending.delete(message.requestId);
    }
  });
}

export function postOAuthStart(scope: string): Promise<DeviceCodeResponse> {
  registerGitHubMessageListener();
  const requestId = nextId('github-oauth');
  return new Promise(function (resolve, reject) {
    pending.set(requestId, { resolveDevice: resolve, rejectDevice: reject });
    parent.postMessage(
      {
        pluginMessage: {
          type: 'github/oauth/start',
          requestId: requestId,
          scope: scope,
        },
      },
      '*',
    );
  });
}

export function postOAuthPoll(deviceCode: string): Promise<DeviceTokenPollResult> {
  registerGitHubMessageListener();
  const requestId = nextId('github-poll');
  return new Promise(function (resolve) {
    pending.set(requestId, { resolvePoll: resolve });
    parent.postMessage(
      {
        pluginMessage: {
          type: 'github/oauth/poll',
          requestId: requestId,
          deviceCode: deviceCode,
        },
      },
      '*',
    );
  });
}

export function postTokenSave(input: {
  repoUrl: string;
  accessToken: string;
  scope: string;
}): void {
  parent.postMessage(
    {
      pluginMessage: {
        type: 'github/token/save',
        repoUrl: input.repoUrl,
        accessToken: input.accessToken,
        scope: input.scope,
      },
    },
    '*',
  );
}

export function postTokenClear(repoUrl: string): void {
  parent.postMessage(
    {
      pluginMessage: {
        type: 'github/token/clear',
        repoUrl: repoUrl,
      },
    },
    '*',
  );
}

export function postTokenProbe(repoUrl: string): void {
  parent.postMessage(
    {
      pluginMessage: {
        type: 'github/token/probe',
        repoUrl: repoUrl,
      },
    },
    '*',
  );
}

export interface GitHubSessionSnapshot {
  repoUrl?: string;
  connected?: boolean;
  resolvedConfig?: import('@detroitlabs/fighub-contracts').ResolvedFigHubConfig;
  lastFetchedAt?: string | null;
  lastPulledAt?: string | null;
  lastPushedAt?: string | null;
  configWarning?: string | null;
}

export function loadGitHubSession(timeoutMs?: number): Promise<GitHubSessionSnapshot> {
  registerGitHubMessageListener();
  const waitMs = timeoutMs !== undefined ? timeoutMs : 5000;

  return new Promise(function (resolve, reject) {
    function onMessage(event: MessageEvent<unknown>) {
      const message = extractPluginMessage(event);
      if (message === undefined) {
        return;
      }
      if (isGitHubSessionLoadedMessage(message)) {
        window.removeEventListener('message', onMessage);
        resolve({
          repoUrl: message.repoUrl,
          connected: message.connected,
          resolvedConfig: message.resolvedConfig,
          lastFetchedAt: message.lastFetchedAt,
          lastPulledAt: message.lastPulledAt,
          lastPushedAt: message.lastPushedAt,
          configWarning: message.configWarning,
        });
        return;
      }
      if (isGitHubErrorMessage(message)) {
        window.removeEventListener('message', onMessage);
        reject(new Error(message.message));
      }
    }

    window.addEventListener('message', onMessage);
    parent.postMessage({ pluginMessage: { type: 'github/session/load' } }, '*');

    setTimeout(function () {
      window.removeEventListener('message', onMessage);
      reject(new Error('Timed out waiting for GitHub session.'));
    }, waitMs);
  });
}

export function waitForTokenStatus(
  repoUrl: string,
  timeoutMs?: number,
): Promise<import('@/io/messages/github').GitHubTokenStatusMessage> {
  registerGitHubMessageListener();
  const waitMs = timeoutMs !== undefined ? timeoutMs : 5000;

  return new Promise(function (resolve, reject) {
    function onMessage(event: MessageEvent<unknown>) {
      const message = extractPluginMessage(event);
      if (message === undefined) {
        return;
      }
      if (isGitHubTokenStatusMessage(message) && message.repoUrl === repoUrl) {
        window.removeEventListener('message', onMessage);
        resolve(message);
      }
      if (isGitHubErrorMessage(message)) {
        window.removeEventListener('message', onMessage);
        reject(new Error(message.message));
      }
    }

    window.addEventListener('message', onMessage);
    postTokenProbe(repoUrl);

    setTimeout(function () {
      window.removeEventListener('message', onMessage);
      reject(new Error('Timed out waiting for GitHub token status.'));
    }, waitMs);
  });
}

export function postContentsFetch(input: {
  repoUrl: string;
  path: string;
  ref?: string;
}): Promise<{ text: string; sha?: string }> {
  registerGitHubMessageListener();
  const requestId = nextId('github-contents');

  return new Promise(function (resolve, reject) {
    pending.set(requestId, { resolveContents: resolve, rejectContents: reject });
    parent.postMessage(
      {
        pluginMessage: {
          type: 'github/contents/fetch',
          requestId: requestId,
          repoUrl: input.repoUrl,
          path: input.path,
          ref: input.ref,
        },
      },
      '*',
    );
  });
}

export function postListRepoPaths(repoUrl: string): Promise<string[]> {
  registerGitHubMessageListener();
  const requestId = nextId('github-repo-paths');

  return new Promise(function (resolve, reject) {
    pending.set(requestId, { resolveRepoPaths: resolve, rejectRepoPaths: reject });
    parent.postMessage(
      {
        pluginMessage: {
          type: 'github/repo/paths/list',
          requestId: requestId,
          repoUrl: repoUrl,
        },
      },
      '*',
    );
  });
}

export function postTokenResolverOverrideLoad(
  repoUrl: string,
): Promise<Record<string, string> | null> {
  registerGitHubMessageListener();
  const requestId = nextId('github-token-resolver-load');

  return new Promise(function (resolve, reject) {
    pending.set(requestId, {
      resolveTokenResolverLoad: resolve,
      rejectTokenResolverLoad: reject,
    });
    parent.postMessage(
      {
        pluginMessage: {
          type: 'github/token-resolver/load',
          requestId: requestId,
          repoUrl: repoUrl,
        },
      },
      '*',
    );
  });
}

export function postTokenResolverOverrideSave(
  repoUrl: string,
  manualMap: Record<string, string>,
): Promise<void> {
  registerGitHubMessageListener();
  const requestId = nextId('github-token-resolver-save');

  return new Promise(function (resolve, reject) {
    pending.set(requestId, { resolveVoid: resolve, rejectVoid: reject });
    parent.postMessage(
      {
        pluginMessage: {
          type: 'github/token-resolver/save',
          requestId: requestId,
          repoUrl: repoUrl,
          manualMap: manualMap,
        },
      },
      '*',
    );
  });
}

export function postTokenResolverOverrideClear(repoUrl: string): Promise<void> {
  registerGitHubMessageListener();
  const requestId = nextId('github-token-resolver-clear');

  return new Promise(function (resolve, reject) {
    pending.set(requestId, { resolveVoid: resolve, rejectVoid: reject });
    parent.postMessage(
      {
        pluginMessage: {
          type: 'github/token-resolver/clear',
          requestId: requestId,
          repoUrl: repoUrl,
        },
      },
      '*',
    );
  });
}

export function validateGitHubRepoUrl(repoUrl: string): string | null {
  if (!isValidRepoUrl(repoUrl)) {
    return 'Enter a valid https://github.com/{owner}/{repo} URL.';
  }
  return null;
}

/** Test-only reset for listener + pending state. */
export function resetGitHubClientStateForTests(): void {
  pending.clear();
  nextRequestId = 1;
  listenerRegistered = false;
}

export function onGitHubTokenStatus(
  handler: (message: import('@/io/messages/github').GitHubTokenStatusMessage) => void,
): () => void {
  registerGitHubMessageListener();

  function onMessage(event: MessageEvent<unknown>) {
    const message = extractPluginMessage(event);
    if (message !== undefined && isGitHubTokenStatusMessage(message)) {
      handler(message);
    }
  }

  window.addEventListener('message', onMessage);
  return function () {
    window.removeEventListener('message', onMessage);
  };
}

export function onGitHubError(handler: (message: string) => void): () => void {
  registerGitHubMessageListener();

  function onMessage(event: MessageEvent<unknown>) {
    const message = extractPluginMessage(event);
    if (message !== undefined && isGitHubErrorMessage(message)) {
      handler(message.message);
    }
  }

  window.addEventListener('message', onMessage);
  return function () {
    window.removeEventListener('message', onMessage);
  };
}
