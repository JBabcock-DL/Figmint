import { useEffect, useState } from 'react';

import { loadGitHubSession } from '@/io/github/githubUiBridge';
import { DEFAULT_REGISTRY_PATH } from '@/ui/components/scaffold/constants';

const DEFAULT_TOKENS_PATH = 'design/tokens.json';

export interface GitHubSessionState {
  repoUrl: string;
  setRepoUrl: (value: string) => void;
  tokensPath: string;
  setTokensPath: (value: string) => void;
  registryPath: string;
  setRegistryPath: (value: string) => void;
  sessionReady: boolean;
}

/** Shared GitHub repo settings — survives tab switches; hydrated from main-thread clientStorage. */
export function useGitHubSession(): GitHubSessionState {
  const [repoUrl, setRepoUrl] = useState('');
  const [tokensPath, setTokensPath] = useState(DEFAULT_TOKENS_PATH);
  const [registryPath, setRegistryPath] = useState(DEFAULT_REGISTRY_PATH);
  const [sessionReady, setSessionReady] = useState(false);

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
        if (session.tokensPath !== undefined && session.tokensPath.length > 0) {
          setTokensPath(session.tokensPath);
        }
        if (session.registryPath !== undefined && session.registryPath.length > 0) {
          setRegistryPath(session.registryPath);
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
    tokensPath: tokensPath,
    setTokensPath: setTokensPath,
    registryPath: registryPath,
    setRegistryPath: setRegistryPath,
    sessionReady: sessionReady,
  };
}
