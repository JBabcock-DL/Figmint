import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1, RegistryV1 } from '@detroitlabs/fighub-contracts';

import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';
import { buildComposedVariant } from '@/core/components/scaffold/archetypes/composed';
import { projectBuildContext } from '@/core/components/scaffold/specAdapter';

import composedSpec from '../../../../../fixtures/component-spec/composed-button-group.v1.json';
import registryFixture from '../../../../../fixtures/component-spec/registry-button-child.v1.json';

import {
  createMockComponent,
  createMockComponentSet,
  installMockFigmaScaffold,
  registerMockRegistryNode,
  type MockComponentSet,
} from '../__mocks__/figmaScaffold';
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

function countInstancesUnder(node: SceneNode): number {
  let count = 0;
  if (node.type === 'INSTANCE') {
    count += 1;
  }
  if ('children' in node) {
    const parent = node as ChildrenMixin & SceneNode;
    for (let i = 0; i < parent.children.length; i++) {
      count += countInstancesUnder(parent.children[i]);
    }
  }
  return count;
}

// SPK-022-3: composed + registry sandbox validation — optional @figma/sandbox only.
describe.skip('@figma/sandbox SPK-022-3 composed registry smoke', () => {
  it('requires live Figma file with registry child ComponentSet', () => {
    expect(true).toBe(true);
  });
});

describe('buildComposedVariant', () => {
  beforeEach(() => {
    installMockFigmaScaffold();
  });

  it('creates slot/actions with registry-resolved child instances (beta)', async () => {
    const registry = registryFixture as RegistryV1;
    const childSet = createMockComponentSet({ id: 'component-999' });
    registerMockRegistryNode('component-999', childSet);

    const spec = composedSpec as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default', { registry });
    const result = await buildComposedVariant(ctx);
    const component = result.component as unknown as MockFrame;

    const slot = findNodeByName(component as unknown as SceneNode, 'slot/actions');
    expect(slot).not.toBeNull();
    expect(countInstancesUnder(component as unknown as SceneNode)).toBe(2);

    const violation = assertNoOnePxMaster(result.component as unknown as FrameNode);
    expect(violation).toBeNull();
  });

  it('throws COMPOSED_CHILD_MISSING when registry lookup fails (beta)', async () => {
    const spec = composedSpec as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');

    await expect(buildComposedVariant(ctx)).rejects.toThrow('COMPOSED_CHILD_MISSING: button');
  });

  it('throws COMPOSED_CHILD_INVALID when registry node is not a ComponentSet', async () => {
    const registry = registryFixture as RegistryV1;
    const badNodeId = 'plain-component-node';
    const badComponent = createMockComponent();
    badComponent.id = badNodeId;
    registerMockRegistryNode(badNodeId, badComponent as unknown as MockComponentSet);
    const badRegistry: RegistryV1 = {
      ...registry,
      components: {
        button: {
          ...registry.components.button,
          nodeId: badNodeId,
        },
      },
    };

    const spec = composedSpec as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default', {
      registry: badRegistry,
    });

    await expect(buildComposedVariant(ctx)).rejects.toThrow('COMPOSED_CHILD_INVALID');
  });
});
