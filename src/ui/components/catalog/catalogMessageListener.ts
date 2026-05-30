import {
  isCatalogDiscoverResultMessage,
  isCatalogScaffoldBatchProgressMessage,
  isCatalogScaffoldBatchResultMessage,
  type CatalogDiscoverResultMessage,
  type CatalogScaffoldBatchProgressMessage,
  type CatalogScaffoldBatchResultMessage,
} from '@/io/messages/catalog';

export interface CatalogMessageHandlers {
  onDiscoverResult?: (msg: CatalogDiscoverResultMessage) => void;
  onBatchProgress?: (msg: CatalogScaffoldBatchProgressMessage) => void;
  onBatchResult?: (msg: CatalogScaffoldBatchResultMessage) => void;
}

let listenerRegistered = false;
const subscribers = new Set<CatalogMessageHandlers>();

function readPluginMessage(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  return (data as Record<string, unknown>).pluginMessage;
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

    if (isCatalogDiscoverResultMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onDiscoverResult !== undefined) {
          handler.onDiscoverResult(pluginMessage);
        }
      }
      return;
    }

    if (isCatalogScaffoldBatchProgressMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onBatchProgress !== undefined) {
          handler.onBatchProgress(pluginMessage);
        }
      }
      return;
    }

    if (isCatalogScaffoldBatchResultMessage(pluginMessage)) {
      for (const handler of subscribers) {
        if (handler.onBatchResult !== undefined) {
          handler.onBatchResult(pluginMessage);
        }
      }
    }
  });
}

export function registerCatalogMessageListener(handlers?: CatalogMessageHandlers): () => void {
  ensureListener();
  if (handlers === undefined) {
    return noopUnsubscribe;
  }
  subscribers.add(handlers);
  return function () {
    subscribers.delete(handlers);
  };
}

export function resetCatalogMessageStateForTests(): void {
  subscribers.clear();
  listenerRegistered = false;
}
