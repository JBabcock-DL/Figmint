import { useCallback, useEffect, useRef, useState } from 'react';

import type { ResolvedFigHubConfig } from '@detroitlabs/fighub-contracts';

import {
  isGitHubRepoFetchResultMessage,
  isGitHubRepoPullResultMessage,
  isGitHubRepoPushResultMessage,
} from '@/io/messages/github';
import { isValidRepoUrl, normalizeRepoUrl } from '@/io/github/repoUrl';

export interface RepoSyncState {
  fetching: boolean;
  pulling: boolean;
  pushing: boolean;
  lastFetchedAt: string | null;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  resolvedConfig: ResolvedFigHubConfig | null;
  configWarning: string | null;
  pushPrUrl: string | null;
  error: string | null;
}

export interface UseRepoSyncOptions {
  repoUrl: string;
  connected: boolean;
  initialResolvedConfig?: ResolvedFigHubConfig | null;
  initialLastFetchedAt?: string | null;
  initialLastPulledAt?: string | null;
  initialLastPushedAt?: string | null;
  initialConfigWarning?: string | null;
}

export interface UseRepoSyncResult extends RepoSyncState {
  fetchRepo: () => Promise<void>;
  pullDesignSystem: () => Promise<void>;
  pushUpdates: () => Promise<void>;
}

let nextRequestId = 1;

function nextSyncRequestId(prefix: string): string {
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

export function useRepoSync(options: UseRepoSyncOptions): UseRepoSyncResult {
  const [fetching, setFetching] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(
    options.initialLastFetchedAt !== undefined ? options.initialLastFetchedAt : null,
  );
  const [lastPulledAt, setLastPulledAt] = useState<string | null>(
    options.initialLastPulledAt !== undefined ? options.initialLastPulledAt : null,
  );
  const [lastPushedAt, setLastPushedAt] = useState<string | null>(
    options.initialLastPushedAt !== undefined ? options.initialLastPushedAt : null,
  );
  const [resolvedConfig, setResolvedConfig] = useState<ResolvedFigHubConfig | null>(
    options.initialResolvedConfig !== undefined ? options.initialResolvedConfig : null,
  );
  const [configWarning, setConfigWarning] = useState<string | null>(
    options.initialConfigWarning !== undefined ? options.initialConfigWarning : null,
  );
  const [pushPrUrl, setPushPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(new Map<string, 'fetch' | 'pull' | 'push'>());

  useEffect(
    function () {
      if (options.initialResolvedConfig !== undefined) {
        setResolvedConfig(options.initialResolvedConfig);
      }
      if (options.initialLastFetchedAt !== undefined) {
        setLastFetchedAt(options.initialLastFetchedAt);
      }
      if (options.initialLastPulledAt !== undefined) {
        setLastPulledAt(options.initialLastPulledAt);
      }
      if (options.initialLastPushedAt !== undefined) {
        setLastPushedAt(options.initialLastPushedAt);
      }
      if (options.initialConfigWarning !== undefined) {
        setConfigWarning(options.initialConfigWarning);
      }
    },
    [
      options.initialResolvedConfig,
      options.initialLastFetchedAt,
      options.initialLastPulledAt,
      options.initialLastPushedAt,
      options.initialConfigWarning,
    ],
  );

  useEffect(function () {
    function onMessage(event: MessageEvent<unknown>) {
      const message = extractPluginMessage(event);
      if (message === undefined) {
        return;
      }

      if (isGitHubRepoFetchResultMessage(message)) {
        const kind = pendingRef.current.get(message.requestId);
        if (kind !== 'fetch') {
          return;
        }
        pendingRef.current.delete(message.requestId);
        setFetching(false);
        if (message.ok) {
          if (message.config !== undefined) {
            setResolvedConfig(message.config);
          }
          if (message.lastFetchedAt !== undefined) {
            setLastFetchedAt(message.lastFetchedAt);
          }
          setConfigWarning(message.warning !== undefined ? message.warning : null);
          setError(null);
        } else {
          setError(message.error !== undefined ? message.error : 'Fetch failed.');
        }
        return;
      }

      if (isGitHubRepoPullResultMessage(message)) {
        const kind = pendingRef.current.get(message.requestId);
        if (kind !== 'pull') {
          return;
        }
        pendingRef.current.delete(message.requestId);
        setPulling(false);
        if (message.ok) {
          if (message.cachedAt !== undefined) {
            setLastPulledAt(message.cachedAt);
          }
          setError(null);
        } else {
          setError(message.error !== undefined ? message.error : 'Pull failed.');
        }
        return;
      }

      if (isGitHubRepoPushResultMessage(message)) {
        const kind = pendingRef.current.get(message.requestId);
        if (kind !== 'push') {
          return;
        }
        pendingRef.current.delete(message.requestId);
        setPushing(false);
        if (message.ok) {
          if (message.lastPushedAt !== undefined) {
            setLastPushedAt(message.lastPushedAt);
          }
          if (message.prUrl !== undefined) {
            setPushPrUrl(message.prUrl);
          }
          setError(null);
        } else {
          setError(message.error !== undefined ? message.error : 'Push failed.');
        }
      }
    }

    window.addEventListener('message', onMessage);
    return function () {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const postSync = useCallback(function (type: string, requestId: string, repoUrl: string) {
    parent.postMessage(
      {
        pluginMessage: {
          type: type,
          requestId: requestId,
          repoUrl: repoUrl,
        },
      },
      '*',
    );
  }, []);

  const fetchRepo = useCallback(
    async function () {
      if (!options.connected || !isValidRepoUrl(options.repoUrl)) {
        setError('Connect GitHub and enter a valid repo URL first.');
        return;
      }
      const requestId = nextSyncRequestId('repo-fetch');
      pendingRef.current.set(requestId, 'fetch');
      setFetching(true);
      setError(null);
      postSync('github/repo/fetch', requestId, normalizeRepoUrl(options.repoUrl));
    },
    [options.connected, options.repoUrl, postSync],
  );

  const pullDesignSystem = useCallback(
    async function () {
      if (!options.connected || !isValidRepoUrl(options.repoUrl)) {
        setError('Connect GitHub first.');
        return;
      }
      const requestId = nextSyncRequestId('repo-pull');
      pendingRef.current.set(requestId, 'pull');
      setPulling(true);
      setError(null);
      postSync('github/repo/pull', requestId, normalizeRepoUrl(options.repoUrl));
    },
    [options.connected, options.repoUrl, postSync],
  );

  const pushUpdates = useCallback(
    async function () {
      if (!options.connected || !isValidRepoUrl(options.repoUrl)) {
        setError('Connect GitHub first.');
        return;
      }
      const requestId = nextSyncRequestId('repo-push');
      pendingRef.current.set(requestId, 'push');
      setPushing(true);
      setPushPrUrl(null);
      setError(null);
      postSync('github/repo/push', requestId, normalizeRepoUrl(options.repoUrl));
    },
    [options.connected, options.repoUrl, postSync],
  );

  return {
    fetching: fetching,
    pulling: pulling,
    pushing: pushing,
    lastFetchedAt: lastFetchedAt,
    lastPulledAt: lastPulledAt,
    lastPushedAt: lastPushedAt,
    resolvedConfig: resolvedConfig,
    configWarning: configWarning,
    pushPrUrl: pushPrUrl,
    error: error,
    fetchRepo: fetchRepo,
    pullDesignSystem: pullDesignSystem,
    pushUpdates: pushUpdates,
  };
}

/** Test-only reset for request id sequence. */
export function resetRepoSyncRequestIdsForTests(): void {
  nextRequestId = 1;
}
