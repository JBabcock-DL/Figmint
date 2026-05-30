/// <reference types="@figma/plugin-typings" />

import type { UnmappedComponentRef } from './types';

interface ComponentPropertyDef {
  type: string;
  defaultValue?: string | boolean;
  variantOptions?: string[];
}

function mapPluginPropType(type: string): string {
  if (type === 'VARIANT') {
    return 'VARIANT';
  }
  if (type === 'BOOLEAN') {
    return 'BOOLEAN';
  }
  if (type === 'TEXT') {
    return 'TEXT';
  }
  if (type === 'INSTANCE_SWAP') {
    return 'INSTANCE_SWAP';
  }
  return type;
}

export function readComponentPropertyDefinitions(
  node: ComponentNode | ComponentSetNode,
): Record<string, { type: string; defaultValue?: string | boolean; variantOptions?: string[] }> {
  const defs = node.componentPropertyDefinitions;
  const result: Record<string, ComponentPropertyDef> = {};
  const keys = Object.keys(defs);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const def = defs[key];
    const mapped: ComponentPropertyDef = {
      type: mapPluginPropType(def.type),
    };

    if (def.defaultValue !== undefined) {
      if (typeof def.defaultValue === 'string' || typeof def.defaultValue === 'boolean') {
        mapped.defaultValue = def.defaultValue;
      }
    }

    if (def.type === 'VARIANT' && 'variantOptions' in def) {
      const variantDef = def as { variantOptions?: string[] };
      if (variantDef.variantOptions !== undefined) {
        mapped.variantOptions = variantDef.variantOptions;
      }
    }

    result[key] = mapped;
  }

  return result;
}

function readComponentRef(node: ComponentNode | ComponentSetNode, fileKey: string): UnmappedComponentRef {
  return {
    nodeId: node.id,
    name: node.name,
    componentKey: node.key,
    fileKey: fileKey,
    componentProperties: readComponentPropertyDefinitions(node),
  };
}

function isComponentLike(node: BaseNode): node is ComponentNode | ComponentSetNode {
  return node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
}

/** Variant masters inside a set cannot expose componentPropertyDefinitions — scan the set only. */
function isScannableComponent(node: ComponentNode | ComponentSetNode): boolean {
  if (node.type === 'COMPONENT_SET') {
    return true;
  }
  const parent = node.parent;
  return parent === null || parent.type !== 'COMPONENT_SET';
}

function walkPageComponents(page: PageNode, visit: (node: ComponentNode | ComponentSetNode) => void): void {
  function walk(node: BaseNode): void {
    if (isComponentLike(node)) {
      visit(node);
    }
    if ('children' in node) {
      const parent = node as ChildrenMixin;
      for (let i = 0; i < parent.children.length; i++) {
        walk(parent.children[i]);
      }
    }
  }

  walk(page);
}

function findNodeById(nodeId: string): BaseNode | null {
  const node = figma.getNodeById(nodeId);
  if (node === null) {
    return null;
  }
  return node;
}

export function collectUnmappedCandidates(
  selectedNodeIds: readonly string[] | undefined,
): UnmappedComponentRef[] {
  const fileKey = figma.fileKey !== undefined && figma.fileKey.length > 0 ? figma.fileKey : '';
  const results: UnmappedComponentRef[] = [];
  const seenIds: Record<string, boolean> = {};

  function addCandidate(node: ComponentNode | ComponentSetNode): void {
    if (!isScannableComponent(node)) {
      return;
    }
    if (seenIds[node.id]) {
      return;
    }
    seenIds[node.id] = true;
    results.push(readComponentRef(node, fileKey));
  }

  if (selectedNodeIds !== undefined && selectedNodeIds.length > 0) {
    for (let i = 0; i < selectedNodeIds.length; i++) {
      const node = findNodeById(selectedNodeIds[i]);
      if (node === null) {
        continue;
      }
      if (isComponentLike(node)) {
        addCandidate(node);
        continue;
      }
      if ('children' in node) {
        walkPageComponents(node as PageNode, addCandidate);
      }
    }
  } else {
    walkPageComponents(figma.currentPage, addCandidate);
  }

  return results;
}
