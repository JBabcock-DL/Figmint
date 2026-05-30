import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';

import type { ContractDocument } from '@/ui/export/types';
import type { SinkId } from '@/io/sinks/types';

export function prepareHandoffExport(document: HandoffContextV1): {
  doc: ContractDocument;
  defaultSinks: SinkId[];
  defaultFormats: { json: boolean; md: boolean };
} {
  const doc: ContractDocument = { kind: 'handoff-context', payload: document };
  return {
    doc: doc,
    defaultSinks: ['clipboard'],
    defaultFormats: { json: false, md: true },
  };
}
