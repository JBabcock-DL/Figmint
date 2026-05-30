import { useCallback, useEffect, useRef, useState } from 'react';

import { IMPORT_LIST_FILES } from '@/io/messages/import';
import { registerImportMessageListener } from '@/ui/import/importMessageListener';

export interface ImportListFilesState {
  loading: boolean;
  files: { path: string; name: string }[];
  error: string;
}

const INITIAL_STATE: ImportListFilesState = {
  loading: false,
  files: [],
  error: '',
};

let nextRequestId = 1;

function nextImportListRequestId(): string {
  const id = 'import-list-' + String(nextRequestId);
  nextRequestId += 1;
  return id;
}

export function resetImportListFilesStateForTests(): void {
  nextRequestId = 1;
}

export function useImportListFiles(repoUrl: string): {
  state: ImportListFilesState;
  refresh: (rootPath?: string) => void;
} {
  const [state, setState] = useState<ImportListFilesState>(INITIAL_STATE);
  const pendingRequestIdRef = useRef<string | null>(null);

  useEffect(function () {
    return registerImportMessageListener({
      onListFilesResult: function (message) {
        if (pendingRequestIdRef.current !== message.requestId) {
          return;
        }
        pendingRequestIdRef.current = null;

        if (message.ok) {
          setState({
            loading: false,
            files: message.files,
            error: '',
          });
          return;
        }

        setState(function (prev) {
          return {
            ...prev,
            loading: false,
            error: message.error !== undefined ? message.error : 'File list failed',
          };
        });
      },
    });
  }, []);

  const refresh = useCallback(
    function (rootPath?: string) {
      if (repoUrl.length === 0 || pendingRequestIdRef.current !== null) {
        return;
      }

      const requestId = nextImportListRequestId();
      pendingRequestIdRef.current = requestId;
      setState(function (prev) {
        return { ...prev, loading: true, error: '' };
      });

      parent.postMessage(
        {
          pluginMessage: {
            type: IMPORT_LIST_FILES,
            requestId: requestId,
            repoUrl: repoUrl,
            rootPath: rootPath,
          },
        },
        '*',
      );
    },
    [repoUrl],
  );

  return { state: state, refresh: refresh };
}
