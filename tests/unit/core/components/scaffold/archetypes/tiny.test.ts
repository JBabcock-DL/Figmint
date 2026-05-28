import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';
import { buildTinyVariant } from '@/core/components/scaffold/archetypes/tiny';
import { projectBuildContext } from '@/core/components/scaffold/specAdapter';

import tinyMinimal from '../../../../../fixtures/component-spec/tiny-minimal.v1.json';

import { installMockFigmaScaffold } from '../__mocks__/figmaScaffold';
import type { MockFrame } from '../../../canvas/__mocks__/figmaFrames';

describe('buildTinyVariant', () => {
  beforeEach(() => {
    installMockFigmaScaffold();
  });

  it('builds a separator tiny variant and passes one-px-master audit', async () => {
    const spec = tinyMinimal as ComponentSpecV1;
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');
    const result = await buildTinyVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(component.name).toBe('variant=default');
    expect(component.width).toBe(240);
    expect(component.height).toBe(1);

    const violation = assertNoOnePxMaster(result.component as unknown as FrameNode);
    expect(violation).toBeNull();
  });

  it('builds a progress tiny variant with progress/bar layer', async () => {
    const spec = {
      ...(tinyMinimal as ComponentSpecV1),
      tiny: {
        shape: 'progress',
        filled: 0.5,
      },
    };
    const ctx = projectBuildContext(spec, { variant: 'default' }, 'variant=default');
    const result = await buildTinyVariant(ctx);
    const component = result.component as unknown as MockFrame;

    expect(component.children.length).toBe(1);
    expect(component.children[0].name).toBe('progress/bar');

    const violation = assertNoOnePxMaster(result.component as unknown as FrameNode);
    expect(violation).toBeNull();
  });
});
