/// <reference types="@figma/plugin-typings" />

import { afterEach, describe, expect, it } from 'vitest';

import { enumerateTokensAndLayout } from '@/core/handoff/tokens';
import { walkSceneTree } from '@/core/handoff/walk';
import { createMockFrame } from '../canvas/__mocks__/figmaFrames';

import {
  installHandoffFigmaMock,
  installVariableRegistry,
  restoreHandoffFigmaMock,
} from '../../../mocks/handoffFigma';

// AC examples like Theme/Primary are illustrative; snapshot uses bootstrap-complete paths.
describe('enumerateTokensAndLayout integration', () => {
  afterEach(function () {
    restoreHandoffFigmaMock();
  });

  it('matches stable tokens and autoLayout snapshot for a bound frame', async function () {
    installHandoffFigmaMock({ selection: [] });
    installVariableRegistry([
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
    ]);

    const root = createMockFrame({ layoutMode: 'VERTICAL', name: 'handoff-frame' });
    root.itemSpacing = 0;
    root.paddingTop = 16;
    root.paddingRight = 16;
    root.paddingBottom = 16;
    root.paddingLeft = 16;
    Object.assign(root as Record<string, unknown>, {
      boundVariables: {
        fills: [{ id: 'var:theme-primary' }],
        itemSpacing: { id: 'var:layout-gap' },
        paddingTop: { id: 'var:layout-pad' },
        paddingRight: { id: 'var:layout-pad' },
        paddingBottom: { id: 'var:layout-pad' },
        paddingLeft: { id: 'var:layout-pad' },
      },
    });

    const label = createMockFrame({ name: 'title' });
    Object.assign(label as Record<string, unknown>, {
      boundVariables: {
        fontFamily: { id: 'var:typo-body' },
        fontSize: { id: 'var:typo-body' },
      },
    });
    root.appendChild(label as unknown as SceneNode);

    const child = createMockFrame({ name: 'content' });
    Object.assign(child as Record<string, unknown>, {
      boundVariables: {
        paddingTop: { id: 'var:layout-md' },
      },
    });
    root.appendChild(child as unknown as SceneNode);

    const result = await enumerateTokensAndLayout(root as unknown as SceneNode);

    expect({
      tokens: result.tokens,
      autoLayout: result.autoLayout,
    }).toMatchInlineSnapshot(`
      {
        "autoLayout": {
          "direction": "vertical",
          "gap": "Layout/space/md",
          "padding": "Layout/space/lg",
        },
        "tokens": [
          "Layout/space/lg",
          "Layout/space/md",
          "Theme/color/primary/default",
          "Typography/body/medium",
        ],
      }
    `);
  });

  it('walkSceneTree visits every node in document order', function () {
    const root = createMockFrame({ name: 'root' });
    const a = createMockFrame({ name: 'a' });
    const b = createMockFrame({ name: 'b' });
    root.appendChild(a as unknown as SceneNode);
    a.appendChild(b as unknown as SceneNode);

    const names: string[] = [];
    walkSceneTree(root as unknown as SceneNode, function (node) {
      names.push(node.name);
    });

    expect(names).toEqual(['root', 'a', 'b']);
  });

  it('resolves 100-node tree with 20 bindings under 150ms', async function () {
    installHandoffFigmaMock({ selection: [] });
    const registry = [
      {
        id: 'var:bench',
        name: 'space/md',
        collectionName: 'Layout',
      },
    ];
    installVariableRegistry(registry);

    const root = createMockFrame({ layoutMode: 'VERTICAL', name: 'bench-root' });
    for (let i = 0; i < 100; i++) {
      const child = createMockFrame({ name: 'node-' + String(i) });
      if (i < 20) {
        Object.assign(child as Record<string, unknown>, {
          boundVariables: {
            paddingTop: { id: 'var:bench' },
          },
        });
      }
      root.appendChild(child as unknown as SceneNode);
    }

    const start = performance.now();
    const result = await enumerateTokensAndLayout(root as unknown as SceneNode);
    const elapsed = performance.now() - start;

    expect(result.tokens).toEqual(['Layout/space/md']);
    expect(elapsed).toBeLessThan(150);
  });
});
