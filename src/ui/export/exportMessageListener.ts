import {
  isExportCompleteMessage,
  isExportSinkResultMessage,
  type ExportCompleteMessage,
  type ExportSinkResultMessage,
} from '@/io/messages/export';

export interface ExportMessageHandlers {
  onSinkResult: (message: ExportSinkResultMessage) => void;
  onComplete: (message: ExportCompleteMessage) => void;
}

let listenerRegistered = false;

const pending = new Map<string, ExportMessageHandlers>();

function readPluginMessage(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  const record = data as Record<string, unknown>;
  return record.pluginMessage;
}

export function registerExportMessageListener(): void {
  if (listenerRegistered) {
    return;
  }
  listenerRegistered = true;

  window.addEventListener('message', function (event: MessageEvent<unknown>) {
    const pluginMessage = readPluginMessage(event.data);
    if (pluginMessage === undefined) {
      return;
    }

    if (isExportSinkResultMessage(pluginMessage)) {
      const entry = pending.get(pluginMessage.requestId);
      if (entry !== undefined) {
        entry.onSinkResult(pluginMessage);
      }
      return;
    }

    if (isExportCompleteMessage(pluginMessage)) {
      const entry = pending.get(pluginMessage.requestId);
      if (entry !== undefined) {
        pending.delete(pluginMessage.requestId);
        entry.onComplete(pluginMessage);
      }
    }
  });
}

export function waitForExportMainResults(
  requestId: string,
  handlers: ExportMessageHandlers,
): void {
  registerExportMessageListener();
  pending.set(requestId, handlers);
}

export function createPendingExportMap(): Map<string, ExportMessageHandlers> {
  return pending;
}

/** Test-only reset for listener + pending state. */
export function resetExportMessageStateForTests(): void {
  pending.clear();
  listenerRegistered = false;
}
