/// <reference types="@figma/plugin-typings" />

import type { ComponentComparable } from './types';
import { figmaComponentSetToComparable } from './figmaComponent';
import { getSnapshot } from '@/core/sync/snapshotStore';

export function collectFigmaComponentComparablesFromSnapshot(
  specNames: Record<string, boolean>,
): Record<string, ComponentComparable> {
  const snapshot = getSnapshot();
  const result: Record<string, ComponentComparable> = {};
  for (const specName of Object.keys(specNames)) {
    const entry = snapshot.registry.components[specName];
    if (entry === undefined) {
      continue;
    }
    const node = figma.getNodeById(entry.nodeId);
    if (node !== null && node.type === 'COMPONENT_SET') {
      result[specName] = figmaComponentSetToComparable(node as ComponentSetNode, specName);
    }
  }
  return result;
}
