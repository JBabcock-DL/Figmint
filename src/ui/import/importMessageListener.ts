import {
  isImportListFilesResultMessage,
  isImportParseResultMessage,
  type ImportListFilesResultMessage,
  type ImportParseResultMessage,
} from '@/io/messages/import';

export interface ImportMessageHandlers {
  onListFilesResult?: (msg: ImportListFilesResultMessage) => void;
  onParseResult?: (msg: ImportParseResultMessage) => void;
}

let listenerRegistered = false;
const subscribers = new Set<ImportMessageHandlers>();

function readPluginMessage(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  const record = data as Record<string, unknown>;
  return record.pluginMessage;
}

function noopUnsubscribe(): void {
  return undefined;
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

    if (isImportListFilesResultMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onListFilesResult !== undefined) {
          handler.onListFilesResult(pluginMessage);
        }
      }
      return;
    }

    if (isImportParseResultMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onParseResult !== undefined) {
          handler.onParseResult(pluginMessage);
        }
      }
    }
  });
}

export function registerImportMessageListener(handlers?: ImportMessageHandlers): () => void {
  ensureListener();
  if (handlers === undefined) {
    return noopUnsubscribe;
  }
  subscribers.add(handlers);
  return function () {
    subscribers.delete(handlers);
  };
}

export function resetImportMessageStateForTests(): void {
  subscribers.clear();
  listenerRegistered = false;
}
