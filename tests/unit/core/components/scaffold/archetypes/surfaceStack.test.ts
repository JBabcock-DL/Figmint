import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';
import { buildSurfaceStackVariant } from '@/core/components/scaffold/archetypes/surfaceStack';
import { projectBuildContext } from '@/core/components/scaffold/specAdapter';

import surfaceStackMinimal from '../../../../../fixtures/component-spec/surface-stack-minimal.v1.json';

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

describe('buildSurfaceStackVariant', () => {
  beforeEach(() => {
    installMockFigmaScaffold();
  });

  it('builds a surface-stack card with header, title, and content slot', async () => {
    const spec = surfaceStackMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');
    const result = await buildSurfaceStackVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(findNodeByName(component as unknown as SceneNode, 'CardHeader')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'CardTitle')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'CardContent')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'content-slot')).not.toBeNull();

    const violation = assertNoOnePxMaster(result.component as unknown as FrameNode);
    expect(violation).toBeNull();
  });
});
