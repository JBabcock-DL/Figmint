import { useEffect, useState } from 'react';

import type { ResolvedFigHubConfig } from '@detroitlabs/fighub-contracts';

import { loadGitHubSession } from '@/io/github/githubUiBridge';

export interface GitHubSessionState {
  repoUrl: string;
  setRepoUrl: (value: string) => void;
  sessionReady: boolean;
  resolvedConfig: ResolvedFigHubConfig | null;
  lastFetchedAt: string | null;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  configWarning: string | null;
}

/** Shared GitHub repo settings — survives tab switches; hydrated from main-thread clientStorage. */
export function useGitHubSession(): GitHubSessionState {
  const [repoUrl, setRepoUrl] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [resolvedConfig, setResolvedConfig] = useState<ResolvedFigHubConfig | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [lastPulledAt, setLastPulledAt] = useState<string | null>(null);
  const [lastPushedAt, setLastPushedAt] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);

  useEffect(function () {
    let cancelled = false;
    void loadGitHubSession()
      .then(function (session) {
        if (cancelled) {
          return;
        }
        if (session.repoUrl !== undefined && session.repoUrl.length > 0) {
          setRepoUrl(session.repoUrl);
        }
        if (session.resolvedConfig !== undefined) {
          setResolvedConfig(session.resolvedConfig);
        }
        if (session.lastFetchedAt !== undefined) {
          setLastFetchedAt(session.lastFetchedAt);
        }
        if (session.lastPulledAt !== undefined) {
          setLastPulledAt(session.lastPulledAt);
        }
        if (session.lastPushedAt !== undefined) {
          setLastPushedAt(session.lastPushedAt);
        }
        if (session.configWarning !== undefined) {
          setConfigWarning(session.configWarning);
        }
        setSessionReady(true);
      })
      .catch(function () {
        if (!cancelled) {
          setSessionReady(true);
        }
      });

    return function () {
      cancelled = true;
    };
  }, []);

  return {
    repoUrl: repoUrl,
    setRepoUrl: setRepoUrl,
    sessionReady: sessionReady,
    resolvedConfig: resolvedConfig,
    lastFetchedAt: lastFetchedAt,
    lastPulledAt: lastPulledAt,
    lastPushedAt: lastPushedAt,
    configWarning: configWarning,
  };
}
