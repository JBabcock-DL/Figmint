/// <reference types="@figma/plugin-typings" />

import { describe, expect, it } from 'vitest';

import { walkSceneTree } from '@/core/handoff/walk';

import { createMockContainer } from '../../../mocks/handoffFigma';

describe('walkSceneTree', () => {
  it('visits nodes depth-first in preorder across a nested tree', () => {
    const leafA = createMockContainer({ id: '3:1', name: 'Leaf A', type: 'RECTANGLE' });
    const leafB = createMockContainer({ id: '3:2', name: 'Leaf B', type: 'RECTANGLE' });
    const mid = createMockContainer({
      id: '2:1',
      name: 'Mid',
      type: 'FRAME',
      children: [leafA, leafB],
    });
    const root = createMockContainer({
      id: '1:1',
      name: 'Root',
      type: 'FRAME',
      children: [mid],
    });

    const visited: string[] = [];
    walkSceneTree(root, function (node) {
      visited.push(node.name);
    });

    expect(visited).toEqual(['Root', 'Mid', 'Leaf A', 'Leaf B']);
  });

  it('skips DOCUMENT nodes but still walks their children', () => {
    const frame = createMockContainer({ id: '2:1', name: 'Frame', type: 'FRAME' });
    const document = {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: [frame],
      parent: null,
    } as unknown as BaseNode;

    const visited: string[] = [];
    walkSceneTree(document, function (node) {
      visited.push(node.name);
    });

    expect(visited).toEqual(['Frame']);
  });
});
