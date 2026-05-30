import {
  isFigmaFileKeyChangedMessage,
  isFigmaFileKeyLoadedMessage,
  type FigmaFileKeyChangedMessage,
  type FigmaFileKeyLoadedMessage,
} from '@/io/messages/figmaFileKey';

export interface FigmaFileKeyMessageHandlers {
  onLoaded?: (msg: FigmaFileKeyLoadedMessage) => void;
  onChanged?: (msg: FigmaFileKeyChangedMessage) => void;
}

let listenerRegistered = false;
const subscribers = new Set<FigmaFileKeyMessageHandlers>();

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

    if (isFigmaFileKeyLoadedMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onLoaded !== undefined) {
          handler.onLoaded(pluginMessage);
        }
      }
      return;
    }

    if (isFigmaFileKeyChangedMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onChanged !== undefined) {
          handler.onChanged(pluginMessage);
        }
      }
    }
  });
}

export function registerFigmaFileKeyMessageListener(
  handlers?: FigmaFileKeyMessageHandlers,
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

export function resetFigmaFileKeyMessageStateForTests(): void {
  subscribers.clear();
  listenerRegistered = false;
}
