import {
  isSinkErrorMessage,
  isSinkResultMessage,
} from '@/io/messages/sinks';
import type { LoadedDocument } from '@/io/sources/types';

import type { SerializableDocument, SinkResult } from './types';

interface PendingEntry {
  resolve: (result: SinkResult) => void;
  reject: (error: Error) => void;
}

let nextRequestId = 1;
let listenerRegistered = false;

const pending = new Map<string, PendingEntry>();

function nextId(): string {
  const id = 'sink-' + String(nextRequestId);
  nextRequestId += 1;
  return id;
}

export function serializeDoc(doc: LoadedDocument): SerializableDocument {
  return {
    kind: doc.kind,
    payload: doc.payload,
  };
}

export function createPendingMap(): Map<string, PendingEntry> {
  return pending;
}

export function registerSinkMessageListener(): void {
  if (listenerRegistered) {
    return;
  }
  listenerRegistered = true;

  window.addEventListener('message', function (event: MessageEvent<unknown>) {
    const data = event.data;
    if (typeof data !== 'object' || data === null) {
      return;
    }
    const record = data as Record<string, unknown>;
    const pluginMessage = record.pluginMessage;
    if (pluginMessage === undefined) {
      return;
    }

    if (isSinkResultMessage(pluginMessage)) {
      const entry = pending.get(pluginMessage.requestId);
      if (entry !== undefined) {
        pending.delete(pluginMessage.requestId);
        entry.resolve(pluginMessage.result);
      }
      return;
    }

    if (isSinkErrorMessage(pluginMessage)) {
      const entry = pending.get(pluginMessage.requestId);
      if (entry !== undefined) {
        pending.delete(pluginMessage.requestId);
        entry.reject(new Error(pluginMessage.message));
      }
    }
  });
}

export function postSinkRequest(
  type: 'sink/output-page' | 'sink/plugin-data',
  doc: LoadedDocument,
  options: import('./types').FormatOptions,
): Promise<SinkResult> {
  registerSinkMessageListener();
  const requestId = nextId();

  return new Promise(function (resolve, reject) {
    pending.set(requestId, { resolve: resolve, reject: reject });
    parent.postMessage(
      {
        pluginMessage: {
          type: type,
          requestId: requestId,
          doc: serializeDoc(doc),
          options: options,
        },
      },
      '*',
    );
  });
}

/** Test-only reset for listener + pending state. */
export function resetSinkClientStateForTests(): void {
  pending.clear();
  nextRequestId = 1;
  listenerRegistered = false;
}
