import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';
import { buildRowItemVariant } from '@/core/components/scaffold/archetypes/rowItem';
import { projectBuildContext } from '@/core/components/scaffold/specAdapter';

import rowItemMinimal from '../../../../../fixtures/component-spec/row-item-minimal.v1.json';

import { installMockFigmaScaffold } from '../__mocks__/figmaScaffold';
import type { MockFrame } from '../../../canvas/__mocks__/figmaFrames';

function findNodeByName(node: SceneNode, targetName: string): SceneNode | null {
  if (node.name === targetName) {
    return node;
  }
  if ('children' in node) {
    const parent = node as ChildrenMixin & SceneNode;
    for (let i = 0; i < parent.children.length; i++) {
      const found = findNodeByName(parent.children[i], targetName);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
}

describe('buildRowItemVariant', () => {
  beforeEach(() => {
    installMockFigmaScaffold();
  });

  it('builds a row-item variant with row/title, leading icon, and passes one-px-master audit', async () => {
    const spec = rowItemMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');
    const result = await buildRowItemVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(findNodeByName(component as unknown as SceneNode, 'row/title')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'row/text-stack')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'icon-slot/leading')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'icon-slot/trailing')).not.toBeNull();

    const violation = assertNoOnePxMaster(result.component as unknown as FrameNode);
    expect(violation).toBeNull();
  });
});
