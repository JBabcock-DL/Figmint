import { useCallback, useEffect, useRef, useState } from 'react';

import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

import { CATALOG_SCAFFOLD_BATCH } from '@/io/messages/catalog';
import { registerCatalogMessageListener } from '@/ui/components/catalog/catalogMessageListener';

export interface CatalogBatchState {
  running: boolean;
  currentIndex: number;
  total: number;
  currentLabel: string;
  completed: number;
  failed: number;
  lastError: string;
  registry: RegistryV1 | null;
  batchErrors: { specPath: string; message: string }[];
}

const INITIAL_BATCH_STATE: CatalogBatchState = {
  running: false,
  currentIndex: 0,
  total: 0,
  currentLabel: '',
  completed: 0,
  failed: 0,
  lastError: '',
  registry: null,
  batchErrors: [],
};

export function useCatalogBatchScaffold(): {
  state: CatalogBatchState;
  runBatch: (specPaths: string[], repoUrl: string) => void;
  reset: () => void;
} {
  const [state, setState] = useState<CatalogBatchState>(INITIAL_BATCH_STATE);
  const requestIdRef = useRef('');

  const reset = useCallback(function () {
    setState(INITIAL_BATCH_STATE);
    requestIdRef.current = '';
  }, []);

  const runBatch = useCallback(function (specPaths: string[], repoUrl: string) {
    if (specPaths.length === 0 || repoUrl.length === 0) {
      return;
    }
    const requestId = 'catalog-batch-' + String(Date.now());
    requestIdRef.current = requestId;
    setState({
      running: true,
      currentIndex: 0,
      total: specPaths.length,
      currentLabel: specPaths[0],
      completed: 0,
      failed: 0,
      lastError: '',
      registry: null,
      batchErrors: [],
    });
    parent.postMessage(
      {
        pluginMessage: {
          type: CATALOG_SCAFFOLD_BATCH,
          requestId: requestId,
          repoUrl: repoUrl,
          specPaths: specPaths,
          options: { continueOnError: true },
        },
      },
      '*',
    );
    console.debug('[ui] catalog/scaffold-batch', { count: specPaths.length });
  }, []);

  useEffect(function () {
    return registerCatalogMessageListener({
      onBatchProgress: function (message) {
        if (message.requestId !== requestIdRef.current) {
          return;
        }
        setState(function (prev) {
          return Object.assign({}, prev, {
            currentIndex: message.index,
            total: message.total,
            currentLabel:
              message.displayName !== undefined
                ? message.displayName
                : message.componentSetName !== undefined
                  ? message.componentSetName
                  : message.specPath,
            lastError:
              message.status === 'error' && message.error !== undefined
                ? message.error
                : prev.lastError,
          });
        });
      },
      onBatchResult: function (message) {
        if (message.requestId !== requestIdRef.current) {
          return;
        }
        setState(function (prev) {
          return {
            running: false,
            currentIndex: prev.currentIndex,
            total: prev.total,
            currentLabel: prev.currentLabel,
            completed: message.completed,
            failed: message.failed,
            lastError: prev.lastError,
            registry: message.registry,
            batchErrors: message.errors !== undefined ? message.errors : [],
          };
        });
      },
    });
  }, []);

  return { state: state, runBatch: runBatch, reset: reset };
}
