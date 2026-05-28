import type { ComponentSpecV1, RegistryV1 } from '@detroitlabs/fighub-contracts';

import type { LoadedDocument } from '@/io/sources/types';

export type ComponentsIngestOutcome =
  | { ok: true; kind: 'component-spec'; spec: ComponentSpecV1 }
  | { ok: true; kind: 'registry'; registry: RegistryV1 }
  | { ok: false; message: string };

export function classifyComponentsIngest(doc: LoadedDocument): ComponentsIngestOutcome {
  if (doc.kind === 'component-spec') {
    return { ok: true, kind: 'component-spec', spec: doc.payload as ComponentSpecV1 };
  }
  if (doc.kind === 'registry') {
    return { ok: true, kind: 'registry', registry: doc.payload as RegistryV1 };
  }
  return {
    ok: false,
    message:
      'Expected component-spec or registry, got "' +
      doc.kind +
      '". Token files belong on the Bootstrap tab.',
  };
}
