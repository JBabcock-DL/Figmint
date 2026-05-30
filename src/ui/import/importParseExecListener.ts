import {
  IMPORT_PARSE_EXEC,
  isImportParseExecMessage,
  type ImportParseExecMessage,
} from '@/io/messages/import';

import { runImportParseExec } from './runImportParseExec';

let listenerRegistered = false;

function readPluginMessage(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  const record = data as Record<string, unknown>;
  return record.pluginMessage;
}

function postToMain(message: unknown): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

function handleExecMessage(message: ImportParseExecMessage): void {
  const result = runImportParseExec(message);
  postToMain(result);
}

function ensureListener(): void {
  if (listenerRegistered) {
    return;
  }
  listenerRegistered = true;

  window.addEventListener('message', function (event: MessageEvent<unknown>) {
    const pluginMessage = readPluginMessage(event.data);
    if (pluginMessage === undefined) {
      return;
    }
    if (isImportParseExecMessage(pluginMessage)) {
      handleExecMessage(pluginMessage);
    }
  });
}

export function registerImportParseExecListener(): void {
  ensureListener();
}

export function resetImportParseExecListenerForTests(): void {
  listenerRegistered = false;
}

export { IMPORT_PARSE_EXEC };
