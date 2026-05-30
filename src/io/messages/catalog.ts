import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

import type { CatalogEntry } from '@/io/github/catalogDiscovery';

export const CATALOG_DISCOVER = 'catalog/discover';
export const CATALOG_DISCOVER_RESULT = 'catalog/discover-result';
export const CATALOG_SCAFFOLD_BATCH = 'catalog/scaffold-batch';
export const CATALOG_SCAFFOLD_BATCH_PROGRESS = 'catalog/scaffold-batch/progress';
export const CATALOG_SCAFFOLD_BATCH_RESULT = 'catalog/scaffold-batch/result';

export type { CatalogEntry };

export interface CatalogDiscoverMessage {
  type: typeof CATALOG_DISCOVER;
  requestId: string;
  repoUrl: string;
  specsPath?: string;
  designSystemBranch?: string;
  forceRefresh?: boolean;
}

export interface CatalogDiscoverResultMessage {
  type: typeof CATALOG_DISCOVER_RESULT;
  requestId: string;
  ok: boolean;
  entries?: CatalogEntry[];
  truncated?: boolean;
  error?: string;
}

export interface CatalogScaffoldBatchMessage {
  type: typeof CATALOG_SCAFFOLD_BATCH;
  requestId: string;
  repoUrl: string;
  specPaths: string[];
  options?: {
    continueOnError?: boolean;
    skipUsageFrame?: boolean;
  };
}

export interface CatalogScaffoldBatchProgressMessage {
  type: typeof CATALOG_SCAFFOLD_BATCH_PROGRESS;
  requestId: string;
  index: number;
  total: number;
  specPath: string;
  status: 'running' | 'done' | 'error';
  error?: string;
  componentSetName?: string;
  displayName?: string;
}

export interface CatalogScaffoldBatchResultMessage {
  type: typeof CATALOG_SCAFFOLD_BATCH_RESULT;
  requestId: string;
  ok: boolean;
  completed: number;
  failed: number;
  registry: RegistryV1;
  errors?: { specPath: string; message: string }[];
}

export type CatalogUiMessage =
  | CatalogDiscoverResultMessage
  | CatalogScaffoldBatchProgressMessage
  | CatalogScaffoldBatchResultMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCatalogEntry(value: unknown): value is CatalogEntry {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.key === 'string' &&
    typeof value.path === 'string' &&
    typeof value.displayName === 'string' &&
    value.kind === 'component-spec'
  );
}

function isRegistryV1(value: unknown): value is RegistryV1 {
  if (!isRecord(value)) {
    return false;
  }
  return value.v === 1 && value.kind === 'registry' && isRecord(value.components);
}

function isBatchProgressStatus(value: unknown): value is 'running' | 'done' | 'error' {
  return value === 'running' || value === 'done' || value === 'error';
}

export function isCatalogDiscoverMessage(message: unknown): message is CatalogDiscoverMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== CATALOG_DISCOVER) {
    return false;
  }
  if (typeof message.requestId !== 'string' || typeof message.repoUrl !== 'string') {
    return false;
  }
  if (message.specsPath !== undefined && typeof message.specsPath !== 'string') {
    return false;
  }
  if (message.designSystemBranch !== undefined && typeof message.designSystemBranch !== 'string') {
    return false;
  }
  if (message.forceRefresh !== undefined && typeof message.forceRefresh !== 'boolean') {
    return false;
  }
  return true;
}

export function isCatalogScaffoldBatchMessage(
  message: unknown,
): message is CatalogScaffoldBatchMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== CATALOG_SCAFFOLD_BATCH) {
    return false;
  }
  if (typeof message.requestId !== 'string' || typeof message.repoUrl !== 'string') {
    return false;
  }
  if (!Array.isArray(message.specPaths)) {
    return false;
  }
  for (let i = 0; i < message.specPaths.length; i++) {
    if (typeof message.specPaths[i] !== 'string') {
      return false;
    }
  }
  return true;
}

export function isCatalogDiscoverResultMessage(
  message: unknown,
): message is CatalogDiscoverResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== CATALOG_DISCOVER_RESULT) {
    return false;
  }
  if (typeof message.requestId !== 'string' || typeof message.ok !== 'boolean') {
    return false;
  }
  if (message.entries !== undefined) {
    if (!Array.isArray(message.entries)) {
      return false;
    }
    for (let i = 0; i < message.entries.length; i++) {
      if (!isCatalogEntry(message.entries[i])) {
        return false;
      }
    }
  }
  if (message.truncated !== undefined && typeof message.truncated !== 'boolean') {
    return false;
  }
  if (message.error !== undefined && typeof message.error !== 'string') {
    return false;
  }
  return true;
}

export function isCatalogScaffoldBatchProgressMessage(
  message: unknown,
): message is CatalogScaffoldBatchProgressMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== CATALOG_SCAFFOLD_BATCH_PROGRESS) {
    return false;
  }
  if (typeof message.requestId !== 'string') {
    return false;
  }
  if (typeof message.index !== 'number' || typeof message.total !== 'number') {
    return false;
  }
  if (typeof message.specPath !== 'string') {
    return false;
  }
  if (!isBatchProgressStatus(message.status)) {
    return false;
  }
  return true;
}

export function isCatalogScaffoldBatchResultMessage(
  message: unknown,
): message is CatalogScaffoldBatchResultMessage {
  if (!isRecord(message)) {
    return false;
  }
  if (message.type !== CATALOG_SCAFFOLD_BATCH_RESULT) {
    return false;
  }
  if (typeof message.requestId !== 'string') {
    return false;
  }
  if (typeof message.ok !== 'boolean') {
    return false;
  }
  if (typeof message.completed !== 'number' || typeof message.failed !== 'number') {
    return false;
  }
  if (!isRegistryV1(message.registry)) {
    return false;
  }
  return true;
}

export function isCatalogUiMessage(message: unknown): message is CatalogUiMessage {
  return (
    isCatalogDiscoverResultMessage(message) ||
    isCatalogScaffoldBatchProgressMessage(message) ||
    isCatalogScaffoldBatchResultMessage(message)
  );
}
