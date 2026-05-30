import { useCallback, useEffect, useRef, useState } from 'react';

import type { FigmaFileKeySource } from '@/core/figma/resolveFileKey';
import {
  FIGMA_FILE_KEY_CLEAR,
  FIGMA_FILE_KEY_LOAD,
  FIGMA_FILE_KEY_SAVE,
  type FigmaFileKeyChangedMessage,
  type FigmaFileKeyLoadedMessage,
} from '@/io/messages/figmaFileKey';
import { describeFigmaFileKeySource } from '@/ui/figma/fileKeyLabels';
import { registerFigmaFileKeyMessageListener } from '@/ui/figma/figmaFileKeyMessageListener';

export interface UseFigmaFileKeyResult {
  fileKey: string;
  source: FigmaFileKeySource;
  override: string;
  inputValue: string;
  setInputValue: (value: string) => void;
  statusMessage: string;
  error: string;
  save: () => void;
  clear: () => void;
  ready: boolean;
}

function nextRequestId(): string {
  return 'figma-file-key-' + String(Date.now()) + '-' + String(Math.random()).slice(2, 8);
}

function applyLoadedState(
  message: FigmaFileKeyLoadedMessage | FigmaFileKeyChangedMessage,
  setters: {
    setFileKey: (value: string) => void;
    setSource: (value: FigmaFileKeySource) => void;
    setOverride: (value: string) => void;
    setInputValue: (value: string) => void;
    setError: (value: string) => void;
    setReady: (value: boolean) => void;
  },
): void {
  if ('ok' in message && message.ok === false) {
    setters.setError(message.error !== undefined ? message.error : 'Invalid file key.');
    return;
  }
  const fileKey = message.fileKey ?? '';
  const source = message.source ?? 'none';
  const override = message.override ?? '';
  setters.setError('');
  setters.setFileKey(fileKey);
  setters.setSource(source);
  setters.setOverride(override);
  if (override.length > 0) {
    setters.setInputValue(override);
  }
  setters.setReady(true);
}

export function useFigmaFileKey(): UseFigmaFileKeyResult {
  const [fileKey, setFileKey] = useState('');
  const [source, setSource] = useState<FigmaFileKeySource>('none');
  const [override, setOverride] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const pendingRequestId = useRef<string | null>(null);

  const setters = {
    setFileKey: setFileKey,
    setSource: setSource,
    setOverride: setOverride,
    setInputValue: setInputValue,
    setError: setError,
    setReady: setReady,
  };

  useEffect(function () {
    const unsubscribe = registerFigmaFileKeyMessageListener({
      onLoaded: function (message) {
        if (
          pendingRequestId.current !== null &&
          message.requestId !== pendingRequestId.current
        ) {
          return;
        }
        pendingRequestId.current = null;
        applyLoadedState(message, setters);
      },
      onChanged: function (message) {
        applyLoadedState(message, setters);
      },
    });

    const requestId = nextRequestId();
    pendingRequestId.current = requestId;
    parent.postMessage(
      { pluginMessage: { type: FIGMA_FILE_KEY_LOAD, requestId: requestId } },
      '*',
    );

    return unsubscribe;
  }, []);

  const save = useCallback(function () {
    const requestId = nextRequestId();
    pendingRequestId.current = requestId;
    parent.postMessage(
      { pluginMessage: { type: FIGMA_FILE_KEY_SAVE, requestId: requestId, input: inputValue } },
      '*',
    );
  }, [inputValue]);

  const clear = useCallback(function () {
    const requestId = nextRequestId();
    pendingRequestId.current = requestId;
    setInputValue('');
    parent.postMessage(
      { pluginMessage: { type: FIGMA_FILE_KEY_CLEAR, requestId: requestId } },
      '*',
    );
  }, []);

  return {
    fileKey: fileKey,
    source: source,
    override: override,
    inputValue: inputValue,
    setInputValue: setInputValue,
    statusMessage: describeFigmaFileKeySource(source),
    error: error,
    save: save,
    clear: clear,
    ready: ready,
  };
}

export function resetFigmaFileKeyStateForTests(): void {
  return undefined;
}
