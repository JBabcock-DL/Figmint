import type { ReactElement } from 'react';

import type { DependencyNode, DependencyTree } from '@/core/import/shared/types';

export interface DependencyTreePanelProps {
  tree: DependencyTree | null;
  resolvedUnknowns: Record<string, boolean>;
  onResolveUnknown: (nodeName: string, action: 'import-first' | 'placeholder' | 'cancel') => void;
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11,
  marginBottom: 4,
} as const;

function renderNode(
  node: DependencyNode,
  depth: number,
  resolvedUnknowns: Record<string, boolean>,
  onResolveUnknown: DependencyTreePanelProps['onResolveUnknown'],
): ReactElement {
  const indent = depth * 12;
  let statusLabel: ReactElement | null = null;

  if (node.status === 'registered') {
    statusLabel = (
      <span style={{ color: '#1b5e20' }} aria-label={'Registered ' + node.name}>
        ✓ {node.name}
      </span>
    );
  } else if (node.status === 'circular') {
    statusLabel = (
      <span style={{ color: '#b00020' }} role="alert">
        Circular dependency: {node.name}
      </span>
    );
  } else if (node.status === 'unknown') {
    if (resolvedUnknowns[node.name]) {
      statusLabel = (
        <span style={{ color: '#666' }} aria-label={'Resolved placeholder for ' + node.name}>
          ○ {node.name} (placeholder)
        </span>
      );
    } else {
      statusLabel = (
        <span style={{ color: '#8a6d00' }}>
          ⚠ {node.name} — unknown
          <span style={{ marginLeft: 6 }}>
            <button
              type="button"
              aria-label={'Import ' + node.name + ' first'}
              onClick={function () {
                onResolveUnknown(node.name, 'import-first');
              }}
              style={{ fontSize: 10, marginRight: 4 }}
            >
              Import first
            </button>
            <button
              type="button"
              aria-label={'Use placeholder for ' + node.name}
              onClick={function () {
                onResolveUnknown(node.name, 'placeholder');
              }}
              style={{ fontSize: 10, marginRight: 4 }}
            >
              Placeholder
            </button>
            <button
              type="button"
              aria-label={'Cancel resolving ' + node.name}
              onClick={function () {
                onResolveUnknown(node.name, 'cancel');
              }}
              style={{ fontSize: 10 }}
            >
              Cancel
            </button>
          </span>
        </span>
      );
    }
  }

  const children: ReactElement[] = [];
  for (let i = 0; i < node.children.length; i++) {
    children.push(
      renderNode(node.children[i], depth + 1, resolvedUnknowns, onResolveUnknown),
    );
  }

  return (
    <li key={node.name + node.importPath + String(depth)} style={{ listStyle: 'none' }}>
      <div style={{ ...rowStyle, paddingLeft: indent }}>{statusLabel}</div>
      {children.length > 0 ? <ul style={{ margin: 0, padding: 0 }}>{children}</ul> : null}
    </li>
  );
}

export function treeHasBlockingUnknowns(
  tree: DependencyTree | null,
  resolvedUnknowns: Record<string, boolean>,
): boolean {
  if (tree === null) {
    return false;
  }

  function walk(nodes: DependencyNode[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.status === 'unknown' && !resolvedUnknowns[node.name]) {
        return true;
      }
      if (walk(node.children)) {
        return true;
      }
    }
    return false;
  }

  return walk(tree.nodes);
}

export function DependencyTreePanel(props: DependencyTreePanelProps) {
  if (props.tree === null || props.tree.nodes.length === 0) {
    return null;
  }

  const items: ReactElement[] = [];
  for (let i = 0; i < props.tree.nodes.length; i++) {
    items.push(
      renderNode(props.tree.nodes[i], 0, props.resolvedUnknowns, props.onResolveUnknown),
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 6px' }}>Dependencies</p>
      <ul aria-label="Component dependency tree" style={{ margin: 0, padding: 0 }}>
        {items}
      </ul>
    </div>
  );
}
