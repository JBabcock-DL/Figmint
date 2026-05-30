import { useCallback, useEffect, useRef, useState } from 'react';

import { CODECONNECT_EMIT_PR } from '@/io/messages/codeconnect';
import { registerCodeConnectMessageListener } from '@/ui/codeconnect/codeconnectMessageListener';

export interface CodeConnectEmitPrState {
  emitting: boolean;
  prUrl: string;
  error: string;
  code: string;
}

const INITIAL_STATE: CodeConnectEmitPrState = {
  emitting: false,
  prUrl: '',
  error: '',
  code: '',
};

let nextRequestId = 1;

function nextEmitRequestId(): string {
  const id = 'codeconnect-emit-' + String(nextRequestId);
  nextRequestId += 1;
  return id;
}

export function resetCodeConnectEmitPrStateForTests(): void {
  nextRequestId = 1;
}

export function useCodeConnectEmitPr(): {
  state: CodeConnectEmitPrState;
  emitPr: (input: { repoUrl: string; componentIds: string[] }) => void;
  reset: () => void;
} {
  const [state, setState] = useState<CodeConnectEmitPrState>(INITIAL_STATE);
  const pendingRequestIdRef = useRef<string | null>(null);

  useEffect(function () {
    return registerCodeConnectMessageListener({
      onEmitPrResult: function (message) {
        if (pendingRequestIdRef.current !== message.requestId) {
          return;
        }
        pendingRequestIdRef.current = null;

        if (message.ok && message.prUrl !== undefined) {
          setState({
            emitting: false,
            prUrl: message.prUrl,
            error: '',
            code: '',
          });
          return;
        }

        setState({
          emitting: false,
          prUrl: '',
          error: message.error !== undefined ? message.error : 'Emit PR failed',
          code: message.code !== undefined ? message.code : '',
        });
      },
    });
  }, []);

  const emitPr = useCallback(function (input: { repoUrl: string; componentIds: string[] }) {
    if (input.repoUrl.length === 0 || input.componentIds.length === 0) {
      return;
    }
    if (pendingRequestIdRef.current !== null) {
      return;
    }

    const requestId = nextEmitRequestId();
    pendingRequestIdRef.current = requestId;
    setState(function (prev) {
      return { ...prev, emitting: true, error: '', code: '', prUrl: '' };
    });

    parent.postMessage(
      {
        pluginMessage: {
          type: CODECONNECT_EMIT_PR,
          requestId: requestId,
          repoUrl: input.repoUrl,
          componentIds: input.componentIds,
        },
      },
      '*',
    );
  }, []);

  const reset = useCallback(function () {
    pendingRequestIdRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return { state: state, emitPr: emitPr, reset: reset };
}
