import type { BindingFailureReason, BindingKind } from './types';

const VALID_KINDS: BindingKind[] = ['fill', 'stroke', 'radius', 'padding', 'gap', 'text-style'];

function isBindingKind(value: string): value is BindingKind {
  for (let i = 0; i < VALID_KINDS.length; i++) {
    if (VALID_KINDS[i] === value) {
      return true;
    }
  }
  return false;
}

export function parseBindingSelector(selector: string): { nodePath: string; kind: BindingKind } {
  const dotIndex = selector.lastIndexOf('.');
  if (dotIndex < 0) {
    throw new Error('invalid binding selector: missing kind suffix');
  }
  const nodePath = selector.slice(0, dotIndex);
  const kindRaw = selector.slice(dotIndex + 1);
  if (!isBindingKind(kindRaw)) {
    throw new Error('invalid binding kind: ' + kindRaw);
  }
  return { nodePath: nodePath, kind: kindRaw };
}

function normalizeNodePath(nodePath: string): string {
  if (nodePath === 'root' || nodePath === '.' || nodePath === '') {
    return '';
  }
  return nodePath;
}

export function resolveNodeByPath(variantRoot: ComponentNode, nodePath: string): SceneNode | null {
  const normalized = normalizeNodePath(nodePath);
  if (normalized === '') {
    return variantRoot;
  }
  const segments = normalized.split('/').filter(function (segment) {
    return segment.length > 0;
  });
  let current: SceneNode = variantRoot;
  let index = 0;
  while (index < segments.length) {
    if (!('children' in current)) {
      return null;
    }
    const parent = current as ChildrenMixin;
    let matched: SceneNode | null = null;
    let nextIndex = index;
    for (let end = segments.length; end > index; end--) {
      const candidateParts: string[] = [];
      for (let p = index; p < end; p++) {
        candidateParts.push(segments[p]);
      }
      const candidateName = candidateParts.join('/');
      for (let c = 0; c < parent.children.length; c++) {
        const child = parent.children[c];
        if (child.name === candidateName) {
          matched = child;
          nextIndex = end;
          break;
        }
      }
      if (matched !== null) {
        break;
      }
    }
    if (matched === null) {
      return null;
    }
    current = matched;
    index = nextIndex;
  }
  return current;
}

export function validateKindForNode(
  node: SceneNode,
  kind: BindingKind,
): BindingFailureReason | null {
  if (node.type === 'TEXT') {
    if (kind === 'fill' || kind === 'text-style') {
      return null;
    }
    return 'type-mismatch';
  }
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    if (kind === 'text-style') {
      return 'type-mismatch';
    }
    return null;
  }
  return 'type-mismatch';
}

export function normalizeVariablePath(raw: string): string {
  const trimmed = raw.trim();
  const collectionMatch = /^(Primitives|Theme|Typography|Layout|Effects)\/(.+)$/.exec(trimmed);
  if (collectionMatch !== null) {
    return collectionMatch[2];
  }
  return trimmed;
}
