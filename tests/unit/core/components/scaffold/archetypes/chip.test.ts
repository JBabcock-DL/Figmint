import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';
import { buildChipVariant } from '@/core/components/scaffold/archetypes/chip';
import { projectBuildContext } from '@/core/components/scaffold/specAdapter';

import chipMinimal from '../../../../../fixtures/component-spec/chip-button-minimal.v1.json';

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

// SPK-022-2: chip minimal sandbox — covered by this unit test (mock Figma).
// SPK-022-4: 24-variant latency — deferred to WO-027 VQA.
describe('buildChipVariant', () => {
  beforeEach(() => {
    installMockFigmaScaffold();
  });

  it('builds a chip variant with text/label and passes one-px-master audit', async () => {
    const spec = chipMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');
    const result = await buildChipVariant(ctx);
    const component = result.component as unknown as MockFrame;

    const label = findNodeByName(component as unknown as SceneNode, 'text/label');
    expect(label).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'icon-slot/leading')).not.toBeNull();

    const violation = assertNoOnePxMaster(result.component as unknown as FrameNode);
    expect(violation).toBeNull();
  });
});
