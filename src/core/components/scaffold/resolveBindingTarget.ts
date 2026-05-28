import { resolveNodeByPath } from './selector';

export function resolveBindingTarget(
  variantRoot: BaseNode & ChildrenMixin,
  nodePath: string,
): SceneNode | null {
  if (variantRoot.type !== 'COMPONENT') {
    return null;
  }
  return resolveNodeByPath(variantRoot as ComponentNode, nodePath);
}
