import { useCallback, useEffect, useRef, useState } from 'react';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import type { DependencyTree } from '@/core/import/shared/types';
import type { ImportParseIssue } from '@/io/messages/import';
import { IMPORT_PARSE } from '@/io/messages/import';
import { registerImportMessageListener } from '@/ui/import/importMessageListener';

export interface ImportParseState {
  parsing: boolean;
  spec: ComponentSpecV1 | null;
  dependencyTree: DependencyTree | null;
  issues: ImportParseIssue[];
  error: string;
}

const INITIAL_STATE: ImportParseState = {
  parsing: false,
  spec: null,
  dependencyTree: null,
  issues: [],
  error: '',
};

let nextRequestId = 1;

function nextImportParseRequestId(): string {
  const id = 'import-parse-' + String(nextRequestId);
  nextRequestId += 1;
  return id;
}

export function resetImportParseStateForTests(): void {
  nextRequestId = 1;
}

export function useImportParse(): {
  state: ImportParseState;
  parse: (input: { repoUrl: string; sourcePath: string }) => void;
  reset: () => void;
} {
  const [state, setState] = useState<ImportParseState>(INITIAL_STATE);
  const pendingRequestIdRef = useRef<string | null>(null);

  useEffect(function () {
    return registerImportMessageListener({
      onParseResult: function (message) {
        if (pendingRequestIdRef.current !== message.requestId) {
          return;
        }
        pendingRequestIdRef.current = null;

        if (message.ok && message.spec !== undefined) {
          setState({
            parsing: false,
            spec: message.spec,
            dependencyTree: message.dependencyTree !== undefined ? message.dependencyTree : null,
            issues: message.issues !== undefined ? message.issues : [],
            error: '',
          });
          console.debug('[ui] import/parse', { name: message.spec.name });
          return;
        }

        setState(function (prev) {
          return {
            ...prev,
            parsing: false,
            error: message.error !== undefined ? message.error : 'Parse failed',
          };
        });
      },
    });
  }, []);

  const parse = useCallback(function (input: { repoUrl: string; sourcePath: string }) {
    if (input.repoUrl.length === 0 || input.sourcePath.length === 0) {
      return;
    }
    if (pendingRequestIdRef.current !== null) {
      return;
    }

    const requestId = nextImportParseRequestId();
    pendingRequestIdRef.current = requestId;
    setState(function (prev) {
      return {
        ...prev,
        parsing: true,
        error: '',
        spec: null,
        dependencyTree: null,
        issues: [],
      };
    });

    parent.postMessage(
      {
        pluginMessage: {
          type: IMPORT_PARSE,
          requestId: requestId,
          repoUrl: input.repoUrl,
          sourcePath: input.sourcePath,
        },
      },
      '*',
    );
  }, []);

  const reset = useCallback(function () {
    pendingRequestIdRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return { state: state, parse: parse, reset: reset };
}
