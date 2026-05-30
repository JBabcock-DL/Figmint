import {
  isHandoffCaptureResultMessage,
  isHandoffSelectionMessage,
  type HandoffCaptureResultMessage,
  type HandoffSelectionMessage,
} from '@/io/messages/handoff';

export interface HandoffMessageHandlers {
  onCaptureResult?: (msg: HandoffCaptureResultMessage) => void;
  onSelection?: (msg: HandoffSelectionMessage) => void;
}

let listenerRegistered = false;
const subscribers = new Set<HandoffMessageHandlers>();

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

    if (isHandoffCaptureResultMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onCaptureResult !== undefined) {
          handler.onCaptureResult(pluginMessage);
        }
      }
      return;
    }

    if (isHandoffSelectionMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onSelection !== undefined) {
          handler.onSelection(pluginMessage);
        }
      }
    }
  });
}

export function registerHandoffMessageListener(handlers?: HandoffMessageHandlers): () => void {
  ensureListener();
  if (handlers === undefined) {
    return noopUnsubscribe;
  }
  subscribers.add(handlers);
  return function () {
    subscribers.delete(handlers);
  };
}

/** Test-only reset for listener state. */
export function resetHandoffMessageStateForTests(): void {
  subscribers.clear();
  listenerRegistered = false;
}
