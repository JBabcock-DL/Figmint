import { useCallback, useEffect, useState } from 'react';

import {
  detectTokenSource,
  formatDetectionLabel,
} from '@/core/import';
import type { TokenResolverFetchText } from '@/core/import/shared/tokenResolver/detectSources';
import {
  clearTokenResolverOverride,
  loadTokenResolverOverride,
  saveTokenResolverOverride,
} from '@/io/github/tokenResolverStorage';
import { postContentsFetch, postListRepoPaths } from '@/io/github/githubUiBridge';

function fetchTextFromGitHub(repoUrl: string): TokenResolverFetchText {
  return async function (path: string) {
    try {
      const contents = await postContentsFetch({
        repoUrl: repoUrl,
        path: path,
      });
      return { text: contents.text, sha: contents.sha };
    } catch {
      return null;
    }
  };
}

export interface UseTokenResolverSettingsResult {
  detectionLabel: string;
  overrideText: string;
  setOverrideText: (value: string) => void;
  statusMessage: string;
  saveOverride: () => Promise<void>;
  clearOverride: () => Promise<void>;
  refreshDetection: () => Promise<void>;
}

export function useTokenResolverSettings(
  repoUrl: string,
  connected: boolean,
): UseTokenResolverSettingsResult {
  const [detectionLabel, setDetectionLabel] = useState('Not detected — using defaults');
  const [overrideText, setOverrideText] = useState('{}');
  const [statusMessage, setStatusMessage] = useState('');

  const refreshDetection = useCallback(async function () {
    if (!connected || repoUrl.length === 0) {
      setDetectionLabel('Not detected — using defaults');
      return;
    }
    try {
      const fetchText = fetchTextFromGitHub(repoUrl);
      const repoPaths = await postListRepoPaths(repoUrl);
      const detected = await detectTokenSource(repoUrl, fetchText, undefined, repoPaths);
      setDetectionLabel(formatDetectionLabel(detected !== null ? detected.source : null));
      console.debug('[token-resolver] detection', detected !== null ? detected.source.kind : 'none');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDetectionLabel('Not detected — using defaults');
      console.debug('[token-resolver] detection failed', message);
    }
  }, [connected, repoUrl]);

  useEffect(
    function () {
      if (!connected || repoUrl.length === 0) {
        setOverrideText('{}');
        setDetectionLabel('Not detected — using defaults');
        return;
      }
      void (async function () {
        const stored = await loadTokenResolverOverride(repoUrl);
        if (stored !== null) {
          setOverrideText(JSON.stringify(stored.manualMap, null, 2));
        } else {
          setOverrideText('{}');
        }
        await refreshDetection();
      })();
    },
    [connected, repoUrl, refreshDetection],
  );

  const saveOverride = useCallback(async function () {
    if (repoUrl.length === 0) {
      setStatusMessage('Connect a repository first.');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(overrideText);
    } catch {
      setStatusMessage('Invalid JSON.');
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setStatusMessage('Override must be a JSON object.');
      return;
    }
    try {
      await saveTokenResolverOverride(repoUrl, parsed as Record<string, string>);
      setStatusMessage('Token resolver override saved.');
      console.debug('[token-resolver] override saved', repoUrl);
      await refreshDetection();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage(message);
    }
  }, [overrideText, repoUrl, refreshDetection]);

  const clearOverride = useCallback(async function () {
    if (repoUrl.length === 0) {
      return;
    }
    await clearTokenResolverOverride(repoUrl);
    setOverrideText('{}');
    setStatusMessage('Token resolver override cleared.');
    console.debug('[token-resolver] override cleared', repoUrl);
    await refreshDetection();
  }, [repoUrl, refreshDetection]);

  return {
    detectionLabel: detectionLabel,
    overrideText: overrideText,
    setOverrideText: setOverrideText,
    statusMessage: statusMessage,
    saveOverride: saveOverride,
    clearOverride: clearOverride,
    refreshDetection: refreshDetection,
  };
}
