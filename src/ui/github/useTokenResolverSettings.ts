import { useCallback, useEffect, useState } from 'react';

import {
  detectTokenSource,
  formatDetectionLabel,
} from '@/core/import/shared/tokenResolver/detectSources';
import type { TokenResolverFetchText } from '@/core/import/shared/tokenResolver/detectSources';
import type { DetectedSource } from '@/core/import/shared/tokenResolver/types';
import {
  postContentsFetch,
  postListRepoPaths,
  postTokenResolverOverrideClear,
  postTokenResolverOverrideLoad,
  postTokenResolverOverrideSave,
} from '@/io/github/githubUiBridge';

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

export interface TokenResolverSyncHint {
  path: string;
  kind: 'tokens-dtcg' | 'tokens-legacy';
  count: number;
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

function detectionLabelFromSyncHint(hint: TokenResolverSyncHint): string {
  const source: DetectedSource = {
    kind: hint.kind === 'tokens-dtcg' ? 'dtcg-tokens' : 'tokens-studio',
    path: hint.path,
  };
  const base = formatDetectionLabel(source);
  return base + ' (' + String(hint.count) + ' tokens synced)';
}

export function useTokenResolverSettings(
  repoUrl: string,
  connected: boolean,
  tokensPath?: string,
  syncHint?: TokenResolverSyncHint,
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
      const designTokensPath =
        tokensPath !== undefined && tokensPath.length > 0 ? tokensPath : undefined;
      const detected = await detectTokenSource(
        repoUrl,
        fetchText,
        designTokensPath,
        repoPaths,
      );
      if (detected !== null) {
        setDetectionLabel(formatDetectionLabel(detected.source));
        return;
      }
      if (syncHint !== undefined) {
        setDetectionLabel(detectionLabelFromSyncHint(syncHint));
        return;
      }
      setDetectionLabel('Not detected — using defaults');
    } catch {
      if (syncHint !== undefined) {
        setDetectionLabel(detectionLabelFromSyncHint(syncHint));
        return;
      }
      setDetectionLabel('Not detected — using defaults');
    }
  }, [connected, repoUrl, tokensPath, syncHint]);

  useEffect(
    function () {
      if (!connected || repoUrl.length === 0) {
        setOverrideText('{}');
        setDetectionLabel('Not detected — using defaults');
        return;
      }
      void (async function () {
        try {
          const manualMap = await postTokenResolverOverrideLoad(repoUrl);
          if (manualMap !== null) {
            setOverrideText(JSON.stringify(manualMap, null, 2));
          } else {
            setOverrideText('{}');
          }
        } catch {
          setOverrideText('{}');
        }
        await refreshDetection();
      })();
    },
    [connected, repoUrl, tokensPath, syncHint, refreshDetection],
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
      await postTokenResolverOverrideSave(repoUrl, parsed as Record<string, string>);
      setStatusMessage('Token resolver override saved.');
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
    try {
      await postTokenResolverOverrideClear(repoUrl);
      setOverrideText('{}');
      setStatusMessage('Token resolver override cleared.');
      await refreshDetection();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage(message);
    }
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
