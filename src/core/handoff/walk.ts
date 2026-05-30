/// <reference types="@figma/plugin-typings" />

export function walkSceneTree(root: BaseNode, visit: (node: SceneNode) => void): void {
  function walk(node: BaseNode): void {
    if ('type' in node) {
      const nodeType = (node as { type: string }).type;
      if (nodeType !== 'DOCUMENT') {
        visit(node as SceneNode);
      }
    }

    if ('children' in node) {
      const parent = node as ChildrenMixin;
      for (let i = 0; i < parent.children.length; i++) {
        walk(parent.children[i]);
      }
    }
  }

  walk(root);
}
