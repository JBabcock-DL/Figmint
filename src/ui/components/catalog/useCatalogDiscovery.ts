import { useCallback, useEffect, useRef, useState } from 'react';

import type { CatalogEntry } from '@/io/github/catalogDiscovery';
import { CATALOG_DISCOVER } from '@/io/messages/catalog';
import { registerCatalogMessageListener } from '@/ui/components/catalog/catalogMessageListener';

export interface CatalogDiscoveryState {
  loading: boolean;
  entries: CatalogEntry[];
  error: string;
  truncated: boolean;
  lastFetchedAt: number | null;
}

export function useCatalogDiscovery(input: {
  repoUrl: string;
  specsPath?: string;
  designSystemBranch?: string;
  enabled: boolean;
}): CatalogDiscoveryState & { refresh: () => void } {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const requestIdRef = useRef('');
  const forceRefreshRef = useRef(false);

  const postDiscover = useCallback(
    function (forceRefresh: boolean) {
      if (!input.enabled || input.repoUrl.length === 0) {
        return;
      }
      const requestId = 'catalog-discover-' + String(Date.now());
      requestIdRef.current = requestId;
      forceRefreshRef.current = forceRefresh;
      setLoading(true);
      setError('');
      parent.postMessage(
        {
          pluginMessage: {
            type: CATALOG_DISCOVER,
            requestId: requestId,
            repoUrl: input.repoUrl,
            specsPath: input.specsPath,
            designSystemBranch: input.designSystemBranch,
            forceRefresh: forceRefresh,
          },
        },
        '*',
      );
      console.debug('[ui] catalog/discover', { requestId: requestId, forceRefresh: forceRefresh });
    },
    [input.enabled, input.repoUrl, input.specsPath, input.designSystemBranch],
  );

  const refresh = useCallback(
    function () {
      postDiscover(true);
    },
    [postDiscover],
  );

  useEffect(
    function () {
      postDiscover(false);
    },
    [postDiscover],
  );

  useEffect(function () {
    return registerCatalogMessageListener({
      onDiscoverResult: function (message) {
        if (message.requestId !== requestIdRef.current) {
          return;
        }
        setLoading(false);
        if (!message.ok) {
          setError(message.error !== undefined ? message.error : 'Catalog discovery failed.');
          setEntries([]);
          return;
        }
        setEntries(message.entries !== undefined ? message.entries : []);
        setTruncated(message.truncated === true);
        setLastFetchedAt(Date.now());
        console.debug('[ui] catalog/discover-result', String(message.entries !== undefined ? message.entries.length : 0));
      },
    });
  }, []);

  return {
    loading: loading,
    entries: entries,
    error: error,
    truncated: truncated,
    lastFetchedAt: lastFetchedAt,
    refresh: refresh,
  };
}
