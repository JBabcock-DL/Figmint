import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';
import { buildControlVariant } from '@/core/components/scaffold/archetypes/control';
import { projectBuildContext } from '@/core/components/scaffold/specAdapter';

import controlMinimal from '../../../../../fixtures/component-spec/control-checkbox-minimal.v1.json';

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

describe('buildControlVariant', () => {
  beforeEach(() => {
    installMockFigmaScaffold();
  });

  it('builds unchecked checkbox without check icon', async () => {
    const spec = controlMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { checked: false }, 'checked=false');
    const result = await buildControlVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(findNodeByName(component as unknown as SceneNode, 'checkbox/check-icon')).toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'focus-ring')).not.toBeNull();

    const violation = assertNoOnePxMaster(result.component as unknown as FrameNode);
    expect(violation).toBeNull();
  });

  it('builds checked checkbox with check icon glyph', async () => {
    const spec = controlMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { checked: true }, 'checked=true');
    const result = await buildControlVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(findNodeByName(component as unknown as SceneNode, 'checkbox/check-icon')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'focus-ring')).not.toBeNull();
  });

  it('builds switch with switch/thumb layer', async () => {
    const spec = {
      ...(controlMinimal as ComponentSpecV1),
      control: { shape: 'switch' as const },
    };
    const ctx = projectBuildContext(spec, { checked: true }, 'checked=true');
    const result = await buildControlVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(findNodeByName(component as unknown as SceneNode, 'switch/thumb')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'focus-ring')).not.toBeNull();
  });
});
