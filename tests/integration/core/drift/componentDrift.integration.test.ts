import { describe, expect, it } from 'vitest';

import { detectComponentDrift, specToComparable } from '@/core/drift/components';
import { figmaComponentSetToComparable } from '@/core/drift/figmaComponent';
import { buildMockVariantTree } from '../../../helpers/scaffold/mockVariantTree';
import chipButtonSpec from '../../../fixtures/component-spec/chip-button-minimal.v1.json';
import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

describe('component drift integration', () => {
  it('detects push when mock figma matrix adds loading axis', () => {
    const spec = chipButtonSpec as ComponentSpecV1;
    const repo = specToComparable(spec);
    const snapshot = specToComparable(spec);

    const tree = buildMockVariantTree(1);
    const definitions: ComponentPropertyDefinitions = {
      'variant#1': {
        type: 'VARIANT',
        defaultValue: 'default',
        variantOptions: ['default'],
      },
      'loading#2': {
        type: 'VARIANT',
        defaultValue: 'false',
        variantOptions: ['false', 'true'],
      },
    };
    Object.defineProperty(tree.componentSet, 'componentPropertyDefinitions', {
      value: definitions,
      configurable: true,
    });

    const figma = figmaComponentSetToComparable(tree.componentSet as unknown as ComponentSetNode, 'Button');

    const result = detectComponentDrift({
      repoSpecs: { Button: repo },
      figmaComponents: { Button: figma },
      snapshotComponents: { Button: snapshot },
    });

    expect(result.drifts).toHaveLength(1);
    expect(result.drifts[0].direction).toBe('push');
  });
});
