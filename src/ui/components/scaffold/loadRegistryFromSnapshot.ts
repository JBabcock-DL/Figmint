import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

import {
  emptyCanvasRegistryMessage,
  syncRegistryLoadedMessage,
} from '@/ui/components/scaffold/registryLoadMessages';

export async function loadRegistryForComponentsTab(): Promise<
  { ok: true; registry: RegistryV1 | null; message?: string } | { ok: false; message: string }
> {
  return new Promise(function (resolve) {
    const requestId = 'snapshot-read-' + String(Date.now());

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (typeof data !== 'object' || data === null || !('pluginMessage' in data)) {
        return;
      }
      const msg = (data as { pluginMessage: unknown }).pluginMessage;
      if (typeof msg !== 'object' || msg === null) {
        return;
      }
      const typed = msg as Record<string, unknown>;
      if (typed.type !== 'snapshot/read/result' || typed.requestId !== requestId) {
        return;
      }
      window.removeEventListener('message', onMessage);
      if (typed.ok !== true) {
        resolve({
          ok: false,
          message: typeof typed.error === 'string' ? typed.error : 'Snapshot read failed',
        });
        return;
      }
      const registry =
        typed.registry !== undefined ? (typed.registry as RegistryV1) : null;
      const keys = registry !== null ? Object.keys(registry.components) : [];
      resolve({
        ok: true,
        registry: registry,
        message:
          keys.length === 0
            ? emptyCanvasRegistryMessage()
            : syncRegistryLoadedMessage(keys.length),
      });
    }

    window.addEventListener('message', onMessage);
    parent.postMessage(
      {
        pluginMessage: {
          type: 'snapshot/read',
          requestId: requestId,
        },
      },
      '*',
    );
  });
}
