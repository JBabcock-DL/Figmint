import type { AuditRuleResult, RegistryV1 } from '@detroitlabs/figmint-contracts';
import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { flags } from '@/config/flags';
import {
  normalizeRegistryInput,
  resolveRegistryReadPath,
  upsertRegistryEntry,
} from '@/core/components/registry';
import { buildRegistryAuditRows } from '@/core/components/registryAuditRows';
import type { ScaffoldResult } from '@/core/components/scaffold/types';
import { loadFromGitHub } from '@/io/sources/github';
import { postContentsFetch } from '@/io/github/githubUiBridge';
import type { SinkId } from '@/io/sinks/types';
import { createInitialExportSheetState } from '@/ui/export/exportSheetReducer';
import type { ContractDocument } from '@/ui/export/types';

export function defaultRegistryExportSinks(githubConnected?: boolean): SinkId[] {
  // Flags gate Org PR sink; always true in Phase 1 build but kept for WO-021 dual-target.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- dual-build contract
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

function isNotFoundError(message: string): boolean {
  return message.includes('Not Found') || message.includes('404');
}

async function loadLegacyRegistryBody(
  repoUrl: string,
  path: string,
  ref?: string,
): Promise<RegistryV1 | { error: string } | null> {
  try {
    const contents = await postContentsFetch({
      repoUrl: repoUrl,
      path: path,
      ref: ref,
    });
    const parsed: unknown = JSON.parse(contents.text);
    const normalized = normalizeRegistryInput(parsed);
    if (!normalized.ok) {
      return { error: normalized.message };
    }
    return normalized.registry;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isNotFoundError(message)) {
      return null;
    }
    return { error: message };
  }
}

export async function loadRegistryFromGitHub(
  repoUrl: string,
  path?: string,
  ref?: string,
): Promise<RegistryV1 | null | { error: string }> {
  const resolvedPath = resolveRegistryReadPath(path);
  const result = await loadFromGitHub(repoUrl, resolvedPath, ref);

  if ('payload' in result) {
    const normalized = normalizeRegistryInput(result.payload);
    if (!normalized.ok) {
      return { error: normalized.message };
    }
    return normalized.registry;
  }

  if (isNotFoundError(result.message)) {
    return null;
  }

  if (result.kind === 'unknown-contract') {
    return loadLegacyRegistryBody(repoUrl, resolvedPath, ref);
  }

  return { error: result.message };
}

export interface RegistryExportFlowInput {
  spec: ComponentSpecV1;
  scaffold: ScaffoldResult;
  targetPage: PageNode;
  repoUrl?: string;
  registryPath?: string;
}

export async function runRegistryExportFlow(
  input: RegistryExportFlowInput,
): Promise<{
  registry: RegistryV1;
  auditRows: AuditRuleResult[];
  exportProps: ReturnType<typeof prepareRegistryExport>;
  loadWarning?: string;
}> {
  const fileKey = figma.fileKey !== undefined && figma.fileKey.length > 0 ? figma.fileKey : '';
  let base: RegistryV1 | null = null;
  let loadWarning: string | undefined;

  if (input.repoUrl !== undefined && input.repoUrl.length > 0) {
    const loaded = await loadRegistryFromGitHub(input.repoUrl, input.registryPath);
    if (loaded === null) {
      base = null;
    } else if ('error' in loaded) {
      loadWarning = loaded.error;
      base = null;
    } else {
      base = loaded;
    }
  }

  const registry = upsertRegistryEntry({
    registry: base,
    spec: input.spec,
    scaffold: input.scaffold,
    targetPage: input.targetPage,
    fileKey: fileKey,
  });

  const entry = registry.components[input.spec.name];
  const auditRows = buildRegistryAuditRows(registry, input.spec.name, entry);
  console.debug('[registry]', 'merge', input.spec.name, entry.version);

  return {
    registry: registry,
    auditRows: auditRows,
    exportProps: prepareRegistryExport(registry),
    loadWarning: loadWarning,
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
