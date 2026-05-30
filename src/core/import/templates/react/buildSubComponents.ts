import type { ComponentSpecSubComponent } from '@detroitlabs/fighub-contracts';

import { buildSubComponentsFromTree } from '@/core/import/shared/buildSubComponents';
import type { DependencyTree } from '@/core/import/shared/types';

export function buildSubComponents(
  dependencyTree: DependencyTree,
  registryKeys: readonly string[],
  nameToKey?: Record<string, string>,
): ComponentSpecSubComponent[] {
  return buildSubComponentsFromTree(dependencyTree, registryKeys, nameToKey);
}
