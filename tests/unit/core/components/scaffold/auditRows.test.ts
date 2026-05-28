import { describe, expect, it } from 'vitest';

import { buildScaffoldAuditRows } from '@/core/components/scaffold/auditRows';

import {
  asComponentSetNode,
  createMockComponent,
  createMockComponentSet,
} from './__mocks__/figmaScaffold';

describe('buildScaffoldAuditRows', () => {
  it('passes comp/scaffold-variant-count when child count matches', () => {
    const set = createMockComponentSet();
    set.appendChild(createMockComponent({ name: 'variant=default' }) as unknown as SceneNode);
    const rows = buildScaffoldAuditRows(asComponentSetNode(set), 1);
    const row = rows.find((entry) => entry.ruleId === 'comp/scaffold-variant-count');
    expect(row).toBeDefined();
    expect(row !== undefined && row.pass).toBe(true);
  });

  it('fails comp/scaffold-variant-count when child count mismatches', () => {
    const set = createMockComponentSet();
    const rows = buildScaffoldAuditRows(asComponentSetNode(set), 2);
    const row = rows.find((entry) => entry.ruleId === 'comp/scaffold-variant-count');
    expect(row).toBeDefined();
    expect(row !== undefined && row.pass).toBe(false);
  });

  it('passes comp/scaffold-naming when every child name parses', () => {
    const set = createMockComponentSet();
    set.appendChild(createMockComponent({ name: 'disabled=false, size=sm, variant=a' }) as unknown as SceneNode);
    const rows = buildScaffoldAuditRows(asComponentSetNode(set), 1);
    const row = rows.find((entry) => entry.ruleId === 'comp/scaffold-naming');
    expect(row).toBeDefined();
    expect(row !== undefined && row.pass).toBe(true);
  });

  it('fails comp/scaffold-naming when a child name is invalid', () => {
    const set = createMockComponentSet();
    set.appendChild(createMockComponent({ name: 'not-a-variant-name' }) as unknown as SceneNode);
    const rows = buildScaffoldAuditRows(asComponentSetNode(set), 1);
    const row = rows.find((entry) => entry.ruleId === 'comp/scaffold-naming');
    expect(row).toBeDefined();
    expect(row !== undefined && row.pass).toBe(false);
  });

  it('passes comp/scaffold-one-px-master for healthy component children', () => {
    const set = createMockComponentSet();
    const child = createMockComponent({ name: 'variant=default', width: 80, height: 32 });
    set.appendChild(child as unknown as SceneNode);
    const rows = buildScaffoldAuditRows(asComponentSetNode(set), 1);
    const row = rows.find((entry) => entry.ruleId === 'comp/scaffold-one-px-master');
    expect(row).toBeDefined();
    expect(row !== undefined && row.pass).toBe(true);
  });

  it('fails comp/scaffold-one-px-master when a child is a 1px master sliver', () => {
    const set = createMockComponentSet();
    const child = createMockComponent({ name: 'variant=default', width: 120, height: 1 });
    child.appendChild(createMockComponent({ name: 'text/label', width: 10, height: 10 }) as unknown as SceneNode);
    set.appendChild(child as unknown as SceneNode);
    const rows = buildScaffoldAuditRows(asComponentSetNode(set), 1);
    const row = rows.find((entry) => entry.ruleId === 'comp/scaffold-one-px-master');
    expect(row).toBeDefined();
    expect(row !== undefined && row.pass).toBe(false);
  });
});
