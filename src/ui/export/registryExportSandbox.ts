import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

import { flags } from '@/config/flags';
import type { SinkId } from '@/io/sinks/types';
import { createInitialExportSheetState } from '@/ui/export/exportSheetReducer';
import type { ContractDocument } from '@/ui/export/types';

/** Export sandbox helpers — production registry SSOT is canvas snapshot (WO-058). */
export function defaultRegistryExportSinks(githubConnected?: boolean): SinkId[] {
  if (githubConnected === true && flags.githubOAuth && flags.githubPRSink) {
    return ['download', 'github-pr'];
  }
  return ['download'];
}

export function prepareRegistryExport(
  registry: RegistryV1,
  options?: { title?: string; defaultSinks?: SinkId[] },
): {
  document: ContractDocument;
  defaultSinks: SinkId[];
  title: string;
} {
  const document: ContractDocument = {
    kind: 'registry',
    payload: registry,
  };
  return {
    document: document,
    defaultSinks: options?.defaultSinks ?? defaultRegistryExportSinks(),
    title: options?.title ?? 'Update registry',
  };
}

export function createRegistryDocument(registry: RegistryV1): ContractDocument {
  return {
    kind: 'registry',
    payload: registry,
  };
}

export function createRegistryExportSheetInitialState(registry: RegistryV1) {
  const props = prepareRegistryExport(registry);
  return createInitialExportSheetState(props.document, {
    defaultSinks: props.defaultSinks,
  });
}
