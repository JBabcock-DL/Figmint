import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';
import { buildFieldVariant } from '@/core/components/scaffold/archetypes/field';
import { projectBuildContext } from '@/core/components/scaffold/specAdapter';

import fieldMinimal from '../../../../../fixtures/component-spec/field-minimal.v1.json';

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

describe('buildFieldVariant', () => {
  beforeEach(() => {
    installMockFigmaScaffold();
  });

  it('builds a field variant with label, field chrome, and placeholder', async () => {
    const spec = fieldMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { state: 'default' }, 'state=default');
    const result = await buildFieldVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(findNodeByName(component as unknown as SceneNode, 'Label')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'field')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'placeholder')).not.toBeNull();

    const violation = assertNoOnePxMaster(result.component as unknown as FrameNode);
    expect(violation).toBeNull();
  });
});
