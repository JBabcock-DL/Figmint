import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { buildDocPipeline } from '@/core/canvas/doc';
import {
  docComponentRootName,
  docPipelineSectionNames,
} from '@/core/components/scaffold/componentPageRouting';

import acMatrix from '@/core/components/scaffold/__fixtures__/usage-curation-ac-matrix.v1.json';

import {
  asComponentSetNode,
  asPageNode,
  createMockComponentSet,
  createMockPage,
  installMockUsageFrameHarness,
} from './mockUsageFrameHarness';

const buttonLikeSpec: ComponentSpecV1 = {
  v: 1,
  kind: 'component-spec',
  name: 'Button',
  displayTitle: 'Button',
  summary: 'Trigger an action or navigate. Follows shadcn/ui defaults.',
  framework: 'react',
  archetype: 'chip',
  variantMatrix: acMatrix as Record<string, (string | boolean)[]>,
  props: [
    { name: 'variant', type: 'enum', default: 'default', required: false, description: 'Visual style' },
    { name: 'size', type: 'enum', default: 'default', required: false, description: 'Control size' },
  ],
  bindings: [],
  layout: {
    direction: 'horizontal',
    gap: '8',
    padding: '16',
    sizing: { horizontal: 'hug', vertical: 'hug' },
  },
};

describe('buildDocPipeline integration', () => {
  beforeEach(() => {
    installMockUsageFrameHarness();
  });

  it('emits five doc sections in canonical order on docRoot', async () => {
    const page = createMockPage();
    const componentSet = createMockComponentSet({
      id: 'set-doc-pipeline',
      variantNames: ['variant=default, size=sm'],
    });
    page.appendChild(componentSet as unknown as SceneNode);

    const result = await buildDocPipeline(asComponentSetNode(componentSet), buttonLikeSpec, {
      targetPage: asPageNode(page),
    });

    const docRoot = page.findAll(function findDocRoot(child: SceneNode) {
      return child.name === docComponentRootName('button');
    })[0] as FrameNode;

    expect(docRoot).toBeDefined();
    expect(docRoot.children.length).toBe(5);

    const childNames: string[] = [];
    for (let i = 0; i < docRoot.children.length; i++) {
      childNames.push(docRoot.children[i].name);
    }
    expect(childNames).toEqual(docPipelineSectionNames('button'));

    const sectionCountRow = result.auditRows.find(
      (row) => row.ruleId === 'doc-pipeline/section-count',
    );
    expect(sectionCountRow).toBeDefined();
    expect(sectionCountRow !== undefined && sectionCountRow.pass).toBe(true);
    expect(result.ok).toBe(true);
  });
});
