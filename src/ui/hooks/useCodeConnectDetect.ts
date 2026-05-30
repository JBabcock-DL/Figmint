import { useCallback, useEffect, useRef, useState } from 'react';

import type { UnmappedComponentRef } from '@/io/messages/codeconnect';
import { CODECONNECT_DETECT } from '@/io/messages/codeconnect';
import { registerCodeConnectMessageListener } from '@/ui/codeconnect/codeconnectMessageListener';

export interface CodeConnectDetectState {
  scanning: boolean;
  unmapped: UnmappedComponentRef[];
  error: string;
}

const INITIAL_STATE: CodeConnectDetectState = {
  scanning: false,
  unmapped: [],
  error: '',
};

let nextRequestId = 1;

function nextDetectRequestId(): string {
  const id = 'codeconnect-detect-' + String(nextRequestId);
  nextRequestId += 1;
  return id;
}

export function resetCodeConnectDetectStateForTests(): void {
  nextRequestId = 1;
}

export function useCodeConnectDetect(): {
  state: CodeConnectDetectState;
  scan: (input: { repoUrl: string; nodeIds?: string[] }) => void;
} {
  const [state, setState] = useState<CodeConnectDetectState>(INITIAL_STATE);
  const pendingRequestIdRef = useRef<string | null>(null);

  useEffect(function () {
    return registerCodeConnectMessageListener({
      onDetectResult: function (message) {
        if (pendingRequestIdRef.current !== message.requestId) {
          return;
        }
        pendingRequestIdRef.current = null;

        if (message.ok) {
          setState({
            scanning: false,
            unmapped: message.unmapped,
            error: '',
          });
          return;
        }

        setState(function (prev) {
          return {
            ...prev,
            scanning: false,
            error: message.error !== undefined ? message.error : 'Scan failed',
          };
        });
      },
    });
  }, []);

  const scan = useCallback(function (input: { repoUrl: string; nodeIds?: string[] }) {
    if (input.repoUrl.length === 0 || pendingRequestIdRef.current !== null) {
      return;
    }

    const requestId = nextDetectRequestId();
    pendingRequestIdRef.current = requestId;
    setState(function (prev) {
      return { ...prev, scanning: true, error: '' };
    });

    parent.postMessage(
      {
        pluginMessage: {
          type: CODECONNECT_DETECT,
          requestId: requestId,
          repoUrl: input.repoUrl,
          nodeIds: input.nodeIds,
        },
      },
      '*',
    );
  }, []);

  return { state: state, scan: scan };
}
