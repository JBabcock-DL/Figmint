import { describe, expect, it } from 'vitest';

import {
  buildUsageFrameAuditRows,
  USAGE_AUDIT_RULE_IDS,
  usageFrameAuditPassed,
} from '@/core/components/scaffold/usageFrameAudit';

import { createMockFrame, MockTextNode } from '../../../../unit/core/canvas/__mocks__/figmaFrames';
import { createMockInstance } from './__mocks__/figmaScaffold';

describe('buildUsageFrameAuditRows', () => {
  it('exports all usage audit rule ids', () => {
    expect(USAGE_AUDIT_RULE_IDS).toEqual([
      'comp/usage-instance-count',
      'comp/usage-label-present',
      'comp/usage-setproperties',
      'comp/usage-one-px-cell',
      'comp/doc-section-width',
    ]);
  });

  it('passes comp/usage-instance-count when instance count matches min(product, max)', () => {
    const rows = buildUsageFrameAuditRows({
      instances: [createMockInstance() as unknown as InstanceNode],
      combos: [{ variant: 'a' }],
      crossProductCount: 12,
      maxInstances: 6,
      cells: [],
      setPropertiesErrors: [],
    });
    const row = rows.find((entry) => entry.ruleId === 'comp/usage-instance-count');
    expect(row).toBeDefined();
    expect(row !== undefined && row.pass).toBe(false);
  });

  it('passes comp/usage-instance-count when six instances curated from twelve combos', () => {
    const instances: InstanceNode[] = [];
    for (let i = 0; i < 6; i++) {
      instances.push(createMockInstance() as unknown as InstanceNode);
    }
    const rows = buildUsageFrameAuditRows({
      instances: instances,
      combos: [],
      crossProductCount: 12,
      maxInstances: 6,
      cells: [],
      setPropertiesErrors: [],
    });
    const row = rows.find((entry) => entry.ruleId === 'comp/usage-instance-count');
    expect(row !== undefined && row.pass).toBe(true);
  });

  it('fails comp/usage-label-present when label text is missing', () => {
    const cell = createMockFrame({ name: 'cell', width: 120, height: 80 });
    const rows = buildUsageFrameAuditRows({
      instances: [createMockInstance() as unknown as InstanceNode],
      combos: [{ variant: 'a' }],
      crossProductCount: 1,
      maxInstances: 6,
      cells: [cell as unknown as FrameNode],
      setPropertiesErrors: [],
    });
    const row = rows.find((entry) => entry.ruleId === 'comp/usage-label-present');
    expect(row !== undefined && row.pass).toBe(false);
  });

  it('passes comp/usage-label-present when label text is present', () => {
    const cell = createMockFrame({ name: 'cell', width: 120, height: 80 });
    const label = new MockTextNode();
    label.name = 'label';
    label.characters = 'variant=a';
    cell.appendChild(label as unknown as SceneNode);

    const rows = buildUsageFrameAuditRows({
      instances: [createMockInstance() as unknown as InstanceNode],
      combos: [{ variant: 'a' }],
      crossProductCount: 1,
      maxInstances: 6,
      cells: [cell as unknown as FrameNode],
      setPropertiesErrors: [],
    });
    const row = rows.find((entry) => entry.ruleId === 'comp/usage-label-present');
    expect(row !== undefined && row.pass).toBe(true);
  });

  it('fails comp/usage-setproperties when errors were captured', () => {
    const rows = buildUsageFrameAuditRows({
      instances: [],
      combos: [],
      crossProductCount: 6,
      maxInstances: 6,
      cells: [],
      setPropertiesErrors: ['bad prop key'],
    });
    const row = rows.find((entry) => entry.ruleId === 'comp/usage-setproperties');
    expect(row !== undefined && row.pass).toBe(false);
  });

  it('fails comp/usage-one-px-cell for 1px master sliver cells', () => {
    const cell = createMockFrame({ name: 'cell', width: 120, height: 1 });
    cell.appendChild(createMockFrame({ width: 10, height: 10 }) as unknown as SceneNode);
    const rows = buildUsageFrameAuditRows({
      instances: [createMockInstance() as unknown as InstanceNode],
      combos: [{ variant: 'a' }],
      crossProductCount: 1,
      maxInstances: 6,
      cells: [cell as unknown as FrameNode],
      setPropertiesErrors: [],
    });
    const row = rows.find((entry) => entry.ruleId === 'comp/usage-one-px-cell');
    expect(row !== undefined && row.pass).toBe(false);
  });

  it('fails comp/doc-section-width when setGroup is collapsed to 1px wide (BUG-S5-001)', () => {
    const setGroup = createMockFrame({ name: 'doc/component/button/component-set-group', width: 1, height: 42 });
    setGroup.appendChild(createMockFrame({ width: 1236, height: 42 }) as unknown as SceneNode);
    const usageSection = createMockFrame({ name: 'doc/component/button/usage', width: 1640, height: 652 });
    usageSection.appendChild(createMockFrame({ width: 200, height: 100 }) as unknown as SceneNode);

    const rows = buildUsageFrameAuditRows({
      instances: [createMockInstance() as unknown as InstanceNode],
      combos: [{ variant: 'a' }],
      crossProductCount: 1,
      maxInstances: 6,
      cells: [],
      setPropertiesErrors: [],
      setGroup: setGroup as unknown as FrameNode,
      usageSection: usageSection as unknown as FrameNode,
    });
    const row = rows.find((entry) => entry.ruleId === 'comp/doc-section-width');
    expect(row !== undefined && row.pass).toBe(false);
    expect(row !== undefined && row.diagnostic.includes('component-set-group')).toBe(true);
  });

  it('passes comp/doc-section-width when both sections have non-collapsed geometry', () => {
    const setGroup = createMockFrame({ name: 'doc/component/button/component-set-group', width: 1236, height: 42 });
    setGroup.appendChild(createMockFrame({ width: 1236, height: 42 }) as unknown as SceneNode);
    const usageSection = createMockFrame({ name: 'doc/component/button/usage', width: 1640, height: 652 });
    usageSection.appendChild(createMockFrame({ width: 200, height: 100 }) as unknown as SceneNode);

    const rows = buildUsageFrameAuditRows({
      instances: [createMockInstance() as unknown as InstanceNode],
      combos: [{ variant: 'a' }],
      crossProductCount: 1,
      maxInstances: 6,
      cells: [],
      setPropertiesErrors: [],
      setGroup: setGroup as unknown as FrameNode,
      usageSection: usageSection as unknown as FrameNode,
    });
    const row = rows.find((entry) => entry.ruleId === 'comp/doc-section-width');
    expect(row !== undefined && row.pass).toBe(true);
  });

  it('aggregates pass via usageFrameAuditPassed', () => {
    const rows = buildUsageFrameAuditRows({
      instances: [],
      combos: [],
      crossProductCount: 12,
      maxInstances: 6,
      cells: [],
      setPropertiesErrors: [],
    });
    expect(usageFrameAuditPassed(rows)).toBe(false);
  });
});
