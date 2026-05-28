import { useCallback, useEffect, useRef, useState } from 'react';

import type { DeviceCodeResponse } from '@/io/github/deviceFlow';
import {
  onGitHubError,
  onGitHubTokenStatus,
  postOAuthPoll,
  postOAuthStart,
  postTokenClear,
  postTokenSave,
  postTokenProbe,
} from '@/io/github/githubUiBridge';
import { probeRelayHealth } from '@/io/github/relayClient';
import { isValidRepoUrl, normalizeRepoUrl } from '@/io/github/repoUrl';
import type { GitHubTokenStatusMessage } from '@/io/messages/github';

export type GitHubOAuthPhase = 'idle' | 'code' | 'polling' | 'error';

export interface UseGitHubConnectOptions {
  repoUrl: string;
  tokensPath: string;
  onStatus?: (status: GitHubTokenStatusMessage) => void;
}

export interface UseGitHubConnectResult {
  oauthPhase: GitHubOAuthPhase;
  statusMessage: string;
  device: DeviceCodeResponse | null;
  relayOk: boolean | null;
  connected: boolean;
  tokenPreview: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  probeConnection: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

export function useGitHubConnect(options: UseGitHubConnectOptions): UseGitHubConnectResult {
  const [oauthPhase, setOauthPhase] = useState<GitHubOAuthPhase>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [device, setDevice] = useState<DeviceCodeResponse | null>(null);
  const [relayOk, setRelayOk] = useState<boolean | null>(null);
  const [connected, setConnected] = useState(false);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const pollingRef = useRef(false);

  const probeConnection = useCallback(function () {
    if (!isValidRepoUrl(options.repoUrl)) {
      setConnected(false);
      setTokenPreview(null);
      setStatusMessage('Enter a valid GitHub repo URL to probe connection.');
      return;
    }
    postTokenProbe(normalizeRepoUrl(options.repoUrl));
  }, [options.repoUrl]);

  useEffect(function () {
    void probeRelayHealth().then(function (ok) {
      setRelayOk(ok);
    });
  }, []);

  useEffect(function () {
    const unsubscribeStatus = onGitHubTokenStatus(function (message) {
      if (!isValidRepoUrl(options.repoUrl)) {
        return;
      }
      if (message.repoUrl !== normalizeRepoUrl(options.repoUrl)) {
        return;
      }
      setConnected(message.connected);
      setTokenPreview(message.tokenPreview !== undefined ? message.tokenPreview : null);
      if (message.connected) {
        setStatusMessage('Connected · scope=' + (message.scope !== undefined ? message.scope : 'repo'));
      } else {
        setStatusMessage('Not connected');
      }
      if (options.onStatus !== undefined) {
        options.onStatus(message);
      }
    });

    const unsubscribeError = onGitHubError(function (message) {
      setStatusMessage(message);
      setOauthPhase('error');
    });

    probeConnection();

    return function () {
      unsubscribeStatus();
      unsubscribeError();
    };
  }, [options.repoUrl, options.onStatus, probeConnection]);

  const connect = useCallback(async function () {
    if (pollingRef.current) {
      return;
    }

    if (!isValidRepoUrl(options.repoUrl)) {
      setOauthPhase('error');
      setStatusMessage('Enter a valid https://github.com/{owner}/{repo} URL before connecting.');
      return;
    }

    if (relayOk !== true) {
      setOauthPhase('error');
      setStatusMessage('OAuth relay is not reachable. Run npm run spike:oauth-relay.');
      return;
    }

    pollingRef.current = true;
    setOauthPhase('code');
    setStatusMessage('Requesting device code…');

    try {
      const deviceCode = await postOAuthStart('repo');
      setDevice(deviceCode);
      setOauthPhase('polling');
      setStatusMessage('Enter the code on GitHub, then wait for authorization…');

      let intervalMs = deviceCode.interval * 1000;
      const deadline = Date.now() + deviceCode.expires_in * 1000;

      while (Date.now() < deadline) {
        const result = await postOAuthPoll(deviceCode.device_code);
        if (result.status === 'success') {
          postTokenSave({
            repoUrl: normalizeRepoUrl(options.repoUrl),
            accessToken: result.accessToken,
            scope: result.scope,
            tokensPath: options.tokensPath,
          });
          setOauthPhase('idle');
          setStatusMessage('Authorized (scope: ' + (result.scope || 'repo') + ')');
          probeConnection();
          return;
        }
        if (result.status === 'slow_down') {
          intervalMs = (result.interval + 5) * 1000;
        }
        if (result.status === 'error') {
          setOauthPhase('error');
          setStatusMessage(
            result.error + (result.description !== undefined ? ': ' + result.description : ''),
          );
          return;
        }
        await sleep(intervalMs);
      }

      setOauthPhase('error');
      setStatusMessage('Device code expired — try again.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOauthPhase('error');
      setStatusMessage(message);
    } finally {
      pollingRef.current = false;
    }
  }, [options.repoUrl, options.tokensPath, probeConnection, relayOk]);

  const disconnect = useCallback(function () {
    if (!isValidRepoUrl(options.repoUrl)) {
      return;
    }
    const confirmed = window.confirm('Disconnect GitHub for this repository?');
    if (!confirmed) {
      return;
    }
    postTokenClear(normalizeRepoUrl(options.repoUrl));
    setConnected(false);
    setTokenPreview(null);
    setOauthPhase('idle');
    setStatusMessage('Disconnected');
  }, [options.repoUrl]);

  return {
    oauthPhase: oauthPhase,
    statusMessage: statusMessage,
    device: device,
    relayOk: relayOk,
    connected: connected,
    tokenPreview: tokenPreview,
    connect: connect,
    disconnect: disconnect,
    probeConnection: probeConnection,
  };
}
