import type { RegistryComponentEntry, RegistryV1 } from '@detroitlabs/fighub-contracts';

import { hashVariantMatrix } from './scaffold/variantMatrix';
import {
  REGISTRY_FILE_KEY_MISMATCH,
  RegistryMergeError,
  type BuildRegistryEntryInput,
  type NormalizeRegistryOutcome,
  type UpsertRegistryEntryInput,
} from './registry.types';

const REGISTRY_ENVELOPE_KEYS = new Set(['v', 'kind', 'fileKey', 'components']);

export function createEmptyRegistry(fileKey: string): RegistryV1 {
  return {
    v: 1,
    kind: 'registry',
    fileKey: fileKey,
    components: {},
  };
}

export function assertRegistryFileKey(registry: RegistryV1, fileKey: string): void {
  if (registry.fileKey !== fileKey) {
    throw new RegistryMergeError(
      REGISTRY_FILE_KEY_MISMATCH,
      'registry fileKey ' +
        registry.fileKey +
        ' != entry fileKey ' +
        fileKey +
        ' — refuse to merge (cross-file pollution).',
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRegistryV1Shape(value: Record<string, unknown>): boolean {
  return value.v === 1 && value.kind === 'registry';
}

function hasExtraEnvelopeKeys(value: Record<string, unknown>): boolean {
  for (const key of Object.keys(value)) {
    if (!REGISTRY_ENVELOPE_KEYS.has(key)) {
      return true;
    }
  }
  return false;
}

export function normalizeRegistryInput(raw: unknown): NormalizeRegistryOutcome {
  if (!isPlainObject(raw)) {
    return { ok: false, message: 'Registry input must be a JSON object.' };
  }

  if (isRegistryV1Shape(raw)) {
    if (hasExtraEnvelopeKeys(raw)) {
      return { ok: false, message: 'Registry envelope contains unsupported properties.' };
    }
    if (typeof raw.fileKey !== 'string' || raw.fileKey.length === 0) {
      return { ok: false, message: 'Registry fileKey must be a non-empty string.' };
    }
    if (!isPlainObject(raw.components)) {
      return { ok: false, message: 'Registry components must be an object.' };
    }
    return {
      ok: true,
      registry: {
        v: 1,
        kind: 'registry',
        fileKey: raw.fileKey,
        components: raw.components as RegistryV1['components'],
      },
    };
  }

  if (typeof raw.fileKey === 'string' && raw.fileKey.length > 0 && isPlainObject(raw.components)) {
    return {
      ok: true,
      registry: {
        v: 1,
        kind: 'registry',
        fileKey: raw.fileKey,
        components: raw.components as RegistryV1['components'],
      },
    };
  }

  return { ok: false, message: 'Registry input must include fileKey and components.' };
}

export function resolveComponentKey(registry: RegistryV1, specName: string): string {
  if (Object.prototype.hasOwnProperty.call(registry.components, specName)) {
    return specName;
  }

  const keys = Object.keys(registry.components);
  let match: string | null = null;
  const lowerSpec = specName.toLowerCase();
  for (const key of keys) {
    if (key.toLowerCase() === lowerSpec) {
      if (match !== null) {
        return specName;
      }
      match = key;
    }
  }

  if (match !== null) {
    return match;
  }
  return specName;
}

function readExistingVersion(registry: RegistryV1 | null, specName: string): number {
  if (registry === null) {
    return 0;
  }
  const readKey = resolveComponentKey(registry, specName);
  if (!Object.prototype.hasOwnProperty.call(registry.components, readKey)) {
    return 0;
  }
  return registry.components[readKey].version;
}

function buildComposedChildVersions(
  spec: BuildRegistryEntryInput['spec'],
  existingRegistry: RegistryV1 | null,
): Record<string, number | null> | undefined {
  if (spec.composes === undefined || spec.composes.length === 0) {
    return undefined;
  }

  const versions: Record<string, number | null> = {};
  for (const composeEntry of spec.composes) {
    const childRef = composeEntry.component;
    let childVersion: number | null = null;
    if (existingRegistry !== null) {
      const childKey = resolveComponentKey(existingRegistry, childRef);
      if (Object.prototype.hasOwnProperty.call(existingRegistry.components, childKey)) {
        childVersion = existingRegistry.components[childKey].version;
      }
    }
    versions[childRef] = childVersion;
  }
  return versions;
}

export function buildRegistryEntry(input: BuildRegistryEntryInput): RegistryComponentEntry {
  // ES2017 main thread — avoid ?? for Figma sandbox compatibility.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- ES2017
  const now = input.now !== undefined ? input.now : new Date();
  const nextVersion = readExistingVersion(input.existingRegistry, input.spec.name) + 1;

  const entry: RegistryComponentEntry = {
    nodeId: input.scaffold.componentSet.id,
    key: input.scaffold.componentSet.key,
    pageName: input.targetPage.name,
    publishedAt: now.toISOString(),
    version: nextVersion,
    cvaHash: hashVariantMatrix(input.spec.variantMatrix),
  };

  const composedChildVersions = buildComposedChildVersions(input.spec, input.existingRegistry);
  if (composedChildVersions !== undefined) {
    entry.composedChildVersions = composedChildVersions;
  }

  return entry;
}

export function mergeRegistryEntry(
  registry: RegistryV1,
  componentKey: string,
  entry: RegistryComponentEntry,
): RegistryV1 {
  const nextComponents = Object.assign({}, registry.components);
  nextComponents[componentKey] = entry;
  return {
    v: registry.v,
    kind: registry.kind,
    fileKey: registry.fileKey,
    components: nextComponents,
  };
}

function omitComponentKey(
  components: RegistryV1['components'],
  componentKey: string,
): RegistryV1['components'] {
  const next: RegistryV1['components'] = {};
  for (const key of Object.keys(components)) {
    if (key !== componentKey) {
      next[key] = components[key];
    }
  }
  return next;
}

export function upsertRegistryEntry(input: UpsertRegistryEntryInput): RegistryV1 {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- ES2017
  const base = input.registry !== null ? input.registry : createEmptyRegistry(input.fileKey);
  assertRegistryFileKey(base, input.fileKey);

  const readKey = resolveComponentKey(base, input.spec.name);
  const entry = buildRegistryEntry({
    spec: input.spec,
    scaffold: input.scaffold,
    targetPage: input.targetPage,
    fileKey: input.fileKey,
    existingRegistry: base,
    now: input.now,
  });
  let merged = mergeRegistryEntry(base, input.spec.name, entry);

  if (readKey !== input.spec.name && Object.prototype.hasOwnProperty.call(merged.components, readKey)) {
    merged = {
      v: merged.v,
      kind: merged.kind,
      fileKey: merged.fileKey,
      components: omitComponentKey(merged.components, readKey),
    };
  }

  return merged;
}
