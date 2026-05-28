import type {
  ComponentSpecV1,
  RegistryComponentEntry,
  RegistryV1,
} from '@detroitlabs/figmint-contracts';

import type { ScaffoldResult } from '@/core/components/scaffold/types';

export const REGISTRY_FILE_KEY_MISMATCH = 'REGISTRY_FILE_KEY_MISMATCH';

export class RegistryMergeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RegistryMergeError';
    this.code = code;
  }
}

export interface BuildRegistryEntryInput {
  spec: ComponentSpecV1;
  scaffold: ScaffoldResult;
  targetPage: PageNode;
  fileKey: string;
  existingRegistry: RegistryV1 | null;
  now?: Date;
}

export interface UpsertRegistryEntryInput {
  spec: ComponentSpecV1;
  scaffold: ScaffoldResult;
  targetPage: PageNode;
  fileKey: string;
  /** When null, treated as greenfield for this fileKey. */
  registry: RegistryV1 | null;
  now?: Date;
}

export interface NormalizeRegistryResult {
  ok: true;
  registry: RegistryV1;
}

export interface NormalizeRegistryFailure {
  ok: false;
  message: string;
}

export type NormalizeRegistryOutcome = NormalizeRegistryResult | NormalizeRegistryFailure;

export interface MergeRegistryEntryArgs {
  registry: RegistryV1;
  componentKey: string;
  entry: RegistryComponentEntry;
}
