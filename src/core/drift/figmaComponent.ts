/// <reference types="@figma/plugin-typings" />

import { hashVariantMatrix } from '@/core/components/scaffold/variantMatrix';

import {
  extractPropsFromDefinitions,
  extractVariantMatrixFromDefinitions,
} from './componentDiff';
import type { ComponentComparable } from './types';

function scanBindings(node: SceneNode, prefix: string, out: ComponentComparable['bindings']): void {
  const record = node as unknown as Record<string, unknown>;
  const boundVariables = record.boundVariables;
  if (typeof boundVariables === 'object' && boundVariables !== null) {
    const fields = Object.keys(boundVariables);
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const binding = (boundVariables as Record<string, { id: string }>)[field];
      if (binding !== undefined && typeof binding.id === 'string') {
        const selector = prefix.length > 0 ? prefix + '/' + node.name : node.name;
        out.push({ selector: selector, variable: binding.id });
      }
    }
  }

  if ('children' in node) {
    const parent = node as ChildrenMixin;
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      const childPrefix = prefix.length > 0 ? prefix + '/' + node.name : node.name;
      scanBindings(child, childPrefix, out);
    }
  }
}

export function figmaComponentSetToComparable(
  componentSet: ComponentSetNode,
  specName: string,
): ComponentComparable {
  const definitions = componentSet.componentPropertyDefinitions;
  const variantMatrix = extractVariantMatrixFromDefinitions(definitions);
  const bindings: ComponentComparable['bindings'] = [];
  scanBindings(componentSet, '', bindings);
  bindings.sort(function (left, right) {
    const leftKey = left.selector + '\0' + left.variable;
    const rightKey = right.selector + '\0' + right.variable;
    return leftKey.localeCompare(rightKey);
  });

  return {
    specName: specName,
    variantMatrixHash: hashVariantMatrix(variantMatrix),
    variantMatrix: variantMatrix,
    props: extractPropsFromDefinitions(definitions),
    bindings: bindings,
    nodeId: componentSet.id,
    pageName: componentSet.parent !== null && componentSet.parent.type === 'PAGE' ? componentSet.parent.name : undefined,
  };
}
