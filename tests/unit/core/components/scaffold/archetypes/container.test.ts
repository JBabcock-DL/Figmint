import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';
import { buildContainerVariant } from '@/core/components/scaffold/archetypes/container';
import { projectBuildContext } from '@/core/components/scaffold/specAdapter';

import containerMinimal from '../../../../../fixtures/component-spec/container-minimal.v1.json';

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

describe('buildContainerVariant', () => {
  beforeEach(() => {
    installMockFigmaScaffold();
  });

  it('builds accordion container with trigger title and chevron', async () => {
    const spec = containerMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');
    const result = await buildContainerVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(findNodeByName(component as unknown as SceneNode, 'AccordionTrigger')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'AccordionTrigger/title')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'icon-slot/chevron')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'AccordionContent')).toBeNull();

    const violation = assertNoOnePxMaster(result.component as unknown as FrameNode);
    expect(violation).toBeNull();
  });

  it('builds accordion content panel when variant is expanded', async () => {
    const spec = containerMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { open: true }, 'open=true');
    const result = await buildContainerVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(findNodeByName(component as unknown as SceneNode, 'AccordionContent')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'AccordionContent/body')).not.toBeNull();
  });

  it('builds tabs container when spec.container.kind is tabs', async () => {
    const spec = {
      ...(containerMinimal as ComponentSpecV1),
      container: { kind: 'tabs' as const, tabs: ['Overview', 'Settings'] },
    };
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');
    const result = await buildContainerVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(findNodeByName(component as unknown as SceneNode, 'TabsList')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'TabsTrigger/overview')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'TabsTrigger/settings')).not.toBeNull();
    expect(findNodeByName(component as unknown as SceneNode, 'TabsContent')).not.toBeNull();
  });
});
