import { resolveBindingTarget } from './resolveBindingTarget';

export interface PropNodeBinding {
  nodePath: string;
  ref: 'characters' | 'visible' | 'mainComponent';
}

export const PROP_NODE_BINDINGS: Record<string, PropNodeBinding> = {
  label: { nodePath: 'text/label', ref: 'characters' },
  title: { nodePath: 'text/title', ref: 'characters' },
  placeholder: { nodePath: 'text/placeholder', ref: 'characters' },
  helper: { nodePath: 'text/helper', ref: 'characters' },
  leadingIcon: { nodePath: 'icon-slot/leading', ref: 'visible' },
  trailingIcon: { nodePath: 'icon-slot/trailing', ref: 'visible' },
  icon: { nodePath: 'icon-slot/center', ref: 'mainComponent' },
};

export function wireComponentPropertyReferences(
  variant: ComponentNode,
  propKey: string,
  binding: PropNodeBinding,
): { ok: boolean; reason?: string } {
  const node = resolveBindingTarget(variant, binding.nodePath);
  if (node === null) {
    return { ok: false, reason: 'missing node: ' + binding.nodePath };
  }

  const existing =
    node.componentPropertyReferences !== undefined ? node.componentPropertyReferences : {};
  const nextRefs: Record<string, string> = Object.assign({}, existing);
  nextRefs[binding.ref] = propKey;
  (node as { componentPropertyReferences?: Record<string, string> }).componentPropertyReferences =
    nextRefs;

  return { ok: true };
}

export function resolvePropBinding(bindKey: string): PropNodeBinding | null {
  if (Object.prototype.hasOwnProperty.call(PROP_NODE_BINDINGS, bindKey)) {
    return PROP_NODE_BINDINGS[bindKey];
  }
  return null;
}
