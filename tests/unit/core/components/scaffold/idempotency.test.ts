import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { scaffold } from '@/core/components/scaffold';
import { PLUGIN_DATA_SCAFFOLD_ID } from '@/core/components/scaffold/types';

import matrixSpec from '../../../../fixtures/component-spec/chip-button-3x2x2.v1.json';

import {
  MockComponentSet,
  MockPage,
  asPageNode,
  createMockPage,
  installMockFigmaScaffold,
} from './__mocks__/figmaScaffold';

function countComponentSets(page: MockPage): number {
  let count = 0;
  for (let i = 0; i < page.children.length; i++) {
    if (page.children[i].type === 'COMPONENT_SET') {
      count += 1;
    }
  }
  return count;
}

function countStagingOrphans(page: MockPage): number {
  let count = 0;
  for (let i = 0; i < page.children.length; i++) {
    if (page.children[i].name.startsWith('_ccVariantBuild/')) {
      count += 1;
    }
  }
  return count;
}

describe('scaffold idempotency', () => {
  let page: MockPage;

  beforeEach(() => {
    installMockFigmaScaffold();
    page = createMockPage();
  });

  it('replaces the existing ComponentSet on a second scaffold call', async () => {
    const spec = matrixSpec as ComponentSpecV1;
    const first = await scaffold(spec, asPageNode(page));
    expect(first.replacedExisting).toBe(false);
    expect(first.variantCount).toBe(12);

    const second = await scaffold(spec, asPageNode(page));
    expect(second.replacedExisting).toBe(true);
    expect(second.variantCount).toBe(12);
    expect(second.scaffoldId).toBe(first.scaffoldId);
    expect(countComponentSets(page)).toBe(1);
    expect(countStagingOrphans(page)).toBe(0);

    const set = second.componentSet as unknown as MockComponentSet;
    expect(set.getPluginData(PLUGIN_DATA_SCAFFOLD_ID)).toBe(second.scaffoldId);
    expect(set.children.length).toBe(12);
  });
});
