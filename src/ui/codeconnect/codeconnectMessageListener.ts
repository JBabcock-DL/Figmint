import {
  isCodeConnectDetectResultMessage,
  isCodeConnectEmitPrResultMessage,
  type CodeConnectDetectResultMessage,
  type CodeConnectEmitPrResultMessage,
} from '@/io/messages/codeconnect';

export interface CodeConnectMessageHandlers {
  onDetectResult?: (msg: CodeConnectDetectResultMessage) => void;
  onEmitPrResult?: (msg: CodeConnectEmitPrResultMessage) => void;
}

let listenerRegistered = false;
const subscribers = new Set<CodeConnectMessageHandlers>();

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

    if (isCodeConnectDetectResultMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onDetectResult !== undefined) {
          handler.onDetectResult(pluginMessage);
        }
      }
      return;
    }

    if (isCodeConnectEmitPrResultMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onEmitPrResult !== undefined) {
          handler.onEmitPrResult(pluginMessage);
        }
      }
    }
  });
}

export function registerCodeConnectMessageListener(
  handlers?: CodeConnectMessageHandlers,
): () => void {
  ensureListener();
  if (handlers === undefined) {
    return noopUnsubscribe;
  }
  subscribers.add(handlers);
  return function () {
    subscribers.delete(handlers);
  };
}

export function resetCodeConnectMessageStateForTests(): void {
  subscribers.clear();
  listenerRegistered = false;
}
