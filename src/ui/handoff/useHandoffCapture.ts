import { useCallback, useEffect, useRef, useState } from 'react';

import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';

import { registerHandoffMessageListener } from '@/ui/handoff/handoffMessageListener';

export interface HandoffCaptureState {
  capturing: boolean;
  markdown: string;
  document: HandoffContextV1 | null;
  warnings: string[];
  error: string;
}

const INITIAL_CAPTURE: HandoffCaptureState = {
  capturing: false,
  markdown: '',
  document: null,
  warnings: [],
  error: '',
};

let nextCaptureRequestId = 1;

function nextHandoffCaptureRequestId(): string {
  const id = 'handoff-capture-' + String(nextCaptureRequestId);
  nextCaptureRequestId += 1;
  return id;
}

export function resetHandoffCaptureStateForTests(): void {
  nextCaptureRequestId = 1;
}

export function useHandoffCapture(): {
  state: HandoffCaptureState;
  capture: () => void;
  reset: () => void;
} {
  const [state, setState] = useState<HandoffCaptureState>(INITIAL_CAPTURE);
  const pendingRequestIdRef = useRef<string | null>(null);

  useEffect(function () {
    return registerHandoffMessageListener({
      onCaptureResult: function (message) {
        if (pendingRequestIdRef.current !== message.requestId) {
          return;
        }
        pendingRequestIdRef.current = null;

        if (message.ok) {
          setState({
            capturing: false,
            markdown: message.markdown ?? '',
            document: message.document ?? null,
            warnings: message.warnings ?? [],
            error: '',
          });
          return;
        }

        setState(function (prev) {
          return {
            ...prev,
            capturing: false,
            error: message.error ?? 'Capture failed',
          };
        });
      },
    });
  }, []);

  const capture = useCallback(function () {
    if (pendingRequestIdRef.current !== null) {
      return;
    }

    const requestId = nextHandoffCaptureRequestId();
    pendingRequestIdRef.current = requestId;
    setState(function (prev) {
      return { ...prev, capturing: true, error: '' };
    });

    parent.postMessage(
      {
        pluginMessage: {
          type: 'handoff/capture',
          requestId: requestId,
        },
      },
      '*',
    );
  }, []);

  const reset = useCallback(function () {
    pendingRequestIdRef.current = null;
    setState(INITIAL_CAPTURE);
  }, []);

  return { state: state, capture: capture, reset: reset };
}
