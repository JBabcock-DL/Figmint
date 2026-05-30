/**
 * WO-041 `parse()` integration (WO-043 ships helpers only):
 * - Call `scanDependencies(ctx.sourceText, ctx.sourcePath, { registryKeys: ctx.registryKeys })` before prop/binding extraction.
 * - `spec.subComponents = buildSubComponentsFromTree(tree, ctx.registryKeys)`
 * - Return the same `tree` on `ImportTemplateResult.dependencyTree`.
 */
import type { ComponentSpecSubComponent } from '@detroitlabs/fighub-contracts';

import type { DependencyTree } from './types';
import { resolveRegistryKey } from './resolveRegistryKey';

export function buildSubComponentsFromTree(
  tree: DependencyTree,
  registryKeys: readonly string[],
  nameToKey?: Readonly<Record<string, string>>,
): ComponentSpecSubComponent[] {
  const result: ComponentSpecSubComponent[] = [];

  for (let i = 0; i < tree.nodes.length; i++) {
    const node = tree.nodes[i];
    if (node.status !== 'registered') {
      continue;
    }

    const registryRef = resolveRegistryKey(node.name, registryKeys, nameToKey);
    result.push({
      name: node.name,
      registryRef: registryRef !== null ? registryRef : node.name,
    });
  }

  return result;
}
