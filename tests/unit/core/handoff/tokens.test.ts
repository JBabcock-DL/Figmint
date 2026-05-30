/// <reference types="@figma/plugin-typings" />

import { afterEach, describe, expect, it } from 'vitest';

import { collectBoundVariableIds, enumerateTokensAndLayout } from '@/core/handoff/tokens';
import { createMockFrame } from '../canvas/__mocks__/figmaFrames';

import {
  installHandoffFigmaMock,
  installVariableRegistry,
  restoreHandoffFigmaMock,
} from '../../../mocks/handoffFigma';

// AC examples like Theme/Primary are illustrative; tests use bootstrap-complete paths.
const REGISTRY = [
  {
    id: 'var:theme-primary',
    name: 'color/primary/default',
    collectionName: 'Theme',
  },
  {
    id: 'var:layout-md',
    name: 'space/md',
    collectionName: 'Layout',
  },
  {
    id: 'var:typo-body',
    name: 'body/medium',
    collectionName: 'Typography',
  },
  {
    id: 'var:layout-gap',
    name: 'space/md',
    collectionName: 'Layout',
  },
  {
    id: 'var:layout-pad',
    name: 'space/lg',
    collectionName: 'Layout',
  },
];

function bindNode(
  node: SceneNode,
  boundVariables: Record<string, unknown>,
): SceneNode {
  Object.assign(node as Record<string, unknown>, { boundVariables: boundVariables });
  return node;
}

describe('enumerateTokensAndLayout', () => {
  afterEach(function () {
    restoreHandoffFigmaMock();
  });

  it('returns empty tokens and neutral autoLayout when nothing is bound', async function () {
    installHandoffFigmaMock({ selection: [] });
    installVariableRegistry(REGISTRY);

    const frame = createMockFrame({ layoutMode: 'NONE' }) as unknown as SceneNode;
    const result = await enumerateTokensAndLayout(frame);

    expect(result.tokens).toEqual([]);
    expect(result.autoLayout).toEqual({
      direction: 'vertical',
      gap: '0',
      padding: '0',
    });
  });

  it('collects three sorted token paths across a subtree', async function () {
    installHandoffFigmaMock({ selection: [] });
    installVariableRegistry(REGISTRY);

    const root = createMockFrame({ layoutMode: 'VERTICAL', name: 'root' });
    bindNode(root as unknown as SceneNode, {
      fills: [{ id: 'var:theme-primary' }],
    });

    const child = createMockFrame({ name: 'child' });
    bindNode(child as unknown as SceneNode, {
      paddingTop: { id: 'var:layout-md' },
    });
    root.appendChild(child as unknown as SceneNode);

    const text = createMockFrame({ name: 'label' });
    bindNode(text as unknown as SceneNode, {
      fontSize: { id: 'var:typo-body' },
    });
    root.appendChild(text as unknown as SceneNode);

    const result = await enumerateTokensAndLayout(root as unknown as SceneNode);

    expect(result.tokens).toEqual([
      'Layout/space/md',
      'Theme/color/primary/default',
      'Typography/body/medium',
    ]);
  });

  it('skips deleted variable IDs silently', async function () {
    installHandoffFigmaMock({ selection: [] });
    installVariableRegistry(REGISTRY);

    const frame = createMockFrame();
    bindNode(frame as unknown as SceneNode, {
      fills: [{ id: 'var:missing' }, { id: 'var:theme-primary' }],
    });

    const result = await enumerateTokensAndLayout(frame as unknown as SceneNode);
    expect(result.tokens).toEqual(['Theme/color/primary/default']);
  });

  it('reads horizontal auto-layout with px gap fallback', async function () {
    installHandoffFigmaMock({ selection: [] });
    installVariableRegistry(REGISTRY);

    const frame = createMockFrame({ layoutMode: 'HORIZONTAL' });
    frame.itemSpacing = 16;

    const result = await enumerateTokensAndLayout(frame as unknown as SceneNode);
    expect(result.autoLayout.direction).toBe('horizontal');
    expect(result.autoLayout.gap).toBe('16px');
  });

  it('reads bound layout gap as a token path', async function () {
    installHandoffFigmaMock({ selection: [] });
    installVariableRegistry(REGISTRY);

    const frame = createMockFrame({ layoutMode: 'VERTICAL' });
    bindNode(frame as unknown as SceneNode, {
      itemSpacing: { id: 'var:layout-gap' },
    });

    const result = await enumerateTokensAndLayout(frame as unknown as SceneNode);
    expect(result.autoLayout.gap).toBe('Layout/space/md');
  });

  it('formats mixed padding with bound and px sides', async function () {
    installHandoffFigmaMock({ selection: [] });
    installVariableRegistry(REGISTRY);

    const frame = createMockFrame({ layoutMode: 'VERTICAL' });
    frame.paddingTop = 8;
    frame.paddingRight = 12;
    frame.paddingBottom = 8;
    frame.paddingLeft = 12;
    bindNode(frame as unknown as SceneNode, {
      paddingTop: { id: 'var:layout-pad' },
      paddingRight: { id: 'var:layout-md' },
    });

    const result = await enumerateTokensAndLayout(frame as unknown as SceneNode);
    expect(result.autoLayout.padding).toBe(
      'T:Layout/space/lg R:Layout/space/md B:8px L:12px',
    );
  });

  it('collectBoundVariableIds gathers fill and padding IDs from one node', function () {
    const frame = createMockFrame();
    bindNode(frame as unknown as SceneNode, {
      fills: [{ color: { id: 'var:fill' } }],
      paddingLeft: { id: 'var:pad' },
    });

    const ids = new Set<string>();
    collectBoundVariableIds(frame as unknown as SceneNode, ids);
    expect(Array.from(ids).sort()).toEqual(['var:fill', 'var:pad']);
  });
});
