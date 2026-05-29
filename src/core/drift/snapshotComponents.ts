import { getSnapshot } from '@/core/sync/snapshotStore';

import type { ComponentComparable } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isComponentComparable(value: unknown): value is ComponentComparable {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.specName === 'string' && typeof value.variantMatrixHash === 'string';
}

export function readSnapshotComponentComparables(): Record<string, ComponentComparable> {
  const snapshot = getSnapshot();
  const result: Record<string, ComponentComparable> = {};

  for (const entryKey of Object.keys(snapshot.keys)) {
    if (!entryKey.startsWith('cmp/')) {
      continue;
    }
    const entry = snapshot.keys[entryKey];
    if (!isComponentComparable(entry.value)) {
      continue;
    }
    result[entry.value.specName] = entry.value;
  }

  for (const specName of Object.keys(snapshot.registry.components)) {
    if (result[specName] !== undefined) {
      continue;
    }
    const registryEntry = snapshot.registry.components[specName];
    const hash =
      registryEntry.cvaHash !== undefined && registryEntry.cvaHash !== null
        ? registryEntry.cvaHash
        : '';
    result[specName] = {
      specName: specName,
      variantMatrixHash: hash,
      props: [],
      bindings: [],
      nodeId: registryEntry.nodeId,
      pageName: registryEntry.pageName,
    };
  }

  return result;
}
