import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { DOC_FRAME_WIDTH } from '@/core/canvas/doc/constants';
import {
  docComponentRootName,
  docPipelineSectionNames,
  docUsageSectionName,
} from '@/core/components/scaffold/componentPageRouting';
import { buildUsageFrame } from '@/core/components/scaffold/usageFrame';
import { buildUsageFrameAuditRows } from '@/core/components/scaffold/usageFrameAudit';

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
  framework: 'react',
  archetype: 'chip',
  variantMatrix: acMatrix,
  props: [],
  bindings: [],
  layout: {
    direction: 'horizontal',
    gap: '8',
    padding: '16',
    sizing: { horizontal: 'hug', vertical: 'hug' },
  },
};

describe('buildUsageFrame integration', () => {
  beforeEach(() => {
    installMockUsageFrameHarness();
  });

  it('builds full five-section doc pipeline on docRoot', async () => {
    const page = createMockPage();
    const componentSet = createMockComponentSet({
      variantNames: ['variant=default, size=sm, disabled=false'],
    });
    page.appendChild(componentSet);

    await buildUsageFrame(asComponentSetNode(componentSet), buttonLikeSpec, {
      targetPage: asPageNode(page),
    });

    const docRoot = page.findAll(function findDocRoot(child: SceneNode) {
      return child.name === docComponentRootName('button');
    })[0] as FrameNode;

    expect(docRoot.children.length).toBe(5);
    const childNames: string[] = [];
    for (let i = 0; i < docRoot.children.length; i++) {
      childNames.push(docRoot.children[i].name);
    }
    expect(childNames).toEqual(docPipelineSectionNames('button'));
  });

  it('emits Do/Don\'t cards instead of an instance gallery', async () => {
    const page = createMockPage();
    const componentSet = createMockComponentSet({
      id: 'set-stable',
      variantNames: ['variant=default, size=sm, disabled=false'],
    });
    page.appendChild(componentSet);

    const result = await buildUsageFrame(asComponentSetNode(componentSet), buttonLikeSpec, {
      targetPage: asPageNode(page),
    });

    expect(result.instances).toHaveLength(0);
    expect(result.instanceCount).toBe(0);
    expect(result.frame.name).toBe(docUsageSectionName('button'));
    expect(result.frame.layoutMode).toBe('HORIZONTAL');
    expect(result.frame.children).toHaveLength(2);

    const childNames: string[] = [];
    for (let i = 0; i < result.frame.children.length; i++) {
      childNames.push(result.frame.children[i].name);
    }
    expect(childNames).toEqual(['usage/do', 'usage/dont']);
  });

  it('returns passing doc-section-width audit and ok when Do/Don\'t cards render', async () => {
    const page = createMockPage();
    const componentSet = createMockComponentSet({
      variantNames: ['variant=default, size=sm, disabled=false'],
    });
    page.appendChild(componentSet);

    const result = await buildUsageFrame(asComponentSetNode(componentSet), buttonLikeSpec, {
      targetPage: asPageNode(page),
    });

    const docWidthRow = result.auditRows.find((entry) => entry.ruleId === 'comp/doc-section-width');
    expect(docWidthRow).toBeDefined();
    expect(docWidthRow !== undefined && docWidthRow.pass).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('fails comp/usage-instance-count when instance count is deliberately wrong', () => {
    const rows = buildUsageFrameAuditRows({
      instances: [],
      combos: [],
      crossProductCount: 12,
      maxInstances: 6,
      cells: [],
      setPropertiesErrors: [],
    });
    const row = rows.find((entry) => entry.ruleId === 'comp/usage-instance-count');
    expect(row !== undefined && row.pass).toBe(false);
  });

  it('rebuilds usage section on rescaffold while preserving ComponentSet id', async () => {
    const page = createMockPage();
    const componentSet = createMockComponentSet({
      id: 'set-stable',
      variantNames: ['variant=default, size=sm, disabled=false'],
    });
    page.appendChild(componentSet);

    await buildUsageFrame(asComponentSetNode(componentSet), buttonLikeSpec, {
      targetPage: asPageNode(page),
    });
    const firstUsage = page.findAll(function findUsage(child: SceneNode) {
      return child.name === docUsageSectionName('button');
    });
    expect(firstUsage.length).toBeGreaterThan(0);

    const second = await buildUsageFrame(asComponentSetNode(componentSet), buttonLikeSpec, {
      targetPage: asPageNode(page),
    });

    expect(componentSet.id).toBe('set-stable');
    expect(second.frame.name).toBe(docUsageSectionName('button'));
    expect(second.frame.width).toBe(DOC_FRAME_WIDTH);
    const afterRescaffold = page.findAll(function findUsage(child: SceneNode) {
      return child.name === docUsageSectionName('button');
    });
    expect(afterRescaffold.length).toBe(1);
  });
});
