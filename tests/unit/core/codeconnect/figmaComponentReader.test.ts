import { beforeEach, describe, expect, it, vi } from 'vitest';

import { collectUnmappedCandidates } from '@/core/codeconnect/figmaComponentReader';

describe('collectUnmappedCandidates', () => {
  beforeEach(() => {
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.figma = {
      fileKey: 'mock-file-key',
      currentPage: {
        type: 'PAGE',
        children: [],
      },
      getNodeById: vi.fn(function () {
        return null;
      }),
    };
  });

  it('reads property definitions from component sets, not variant masters', () => {
    const variantMaster = {
      type: 'COMPONENT',
      id: 'C:variant',
      name: 'tone=info',
      key: 'variant-key',
      parent: null as { type: string } | null,
      componentPropertyDefinitions: {},
    };
    const componentSet = {
      type: 'COMPONENT_SET',
      id: 'CS:1',
      name: 'AlertBanner — ComponentSet',
      key: 'set-key',
      parent: { type: 'PAGE' },
      children: [variantMaster],
      componentPropertyDefinitions: {
        tone: { type: 'VARIANT', variantOptions: ['info', 'warning'] },
      },
    };
    variantMaster.parent = componentSet;

    let visitedVariantMaster = false;
    variantMaster.componentPropertyDefinitions = new Proxy(
      {},
      {
        get: function () {
          visitedVariantMaster = true;
          throw new Error('variant master property defs');
        },
      },
    );

    const globalRecord = globalThis as Record<string, unknown>;
    const figmaApi = globalRecord.figma as {
      currentPage: { children: unknown[] };
    };
    figmaApi.currentPage.children = [componentSet];

    const refs = collectUnmappedCandidates(undefined);
    expect(visitedVariantMaster).toBe(false);
    expect(refs).toHaveLength(1);
    expect(refs[0].nodeId).toBe('CS:1');
    expect(refs[0].componentProperties.tone.type).toBe('VARIANT');
  });
});
