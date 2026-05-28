import { describe, expect, it } from 'vitest';

import { buildRegistryAuditRows } from '@/core/components/registryAuditRows';
import type { RegistryComponentEntry, RegistryV1 } from '@detroitlabs/figmint-contracts';

const registry: RegistryV1 = {
  v: 1,
  kind: 'registry',
  fileKey: 'mock-file-key',
  components: {},
};

const healthyEntry: RegistryComponentEntry = {
  nodeId: 'CS:1',
  key: 'abc123',
  pageName: '↳ Buttons',
  publishedAt: '2026-05-28T00:00:00.000Z',
  version: 1,
};

describe('buildRegistryAuditRows', () => {
  it('passes all comp/registry-* rules for a healthy entry', () => {
    const withEntry: RegistryV1 = {
      v: 1,
      kind: 'registry',
      fileKey: 'mock-file-key',
      components: { Button: healthyEntry },
    };
    const rows = buildRegistryAuditRows(withEntry, 'Button', healthyEntry);
    expect(rows.every((row) => row.pass)).toBe(true);
  });

  it('fails comp/registry-entry-nodeid when nodeId is empty', () => {
    const badEntry: RegistryComponentEntry = Object.assign({}, healthyEntry, { nodeId: '' });
    const rows = buildRegistryAuditRows(registry, 'Button', badEntry);
    const row = rows.find((entry) => entry.ruleId === 'comp/registry-entry-nodeid');
    expect(row).toBeDefined();
    expect(row?.pass).toBe(false);
  });

  it('fails comp/registry-entry-version when version is below 1', () => {
    const badEntry: RegistryComponentEntry = Object.assign({}, healthyEntry, { version: 0 });
    const rows = buildRegistryAuditRows(registry, 'Button', badEntry);
    const row = rows.find((entry) => entry.ruleId === 'comp/registry-entry-version');
    expect(row).toBeDefined();
    expect(row?.pass).toBe(false);
  });

  it('fails comp/registry-entry-present when component key is missing', () => {
    const rows = buildRegistryAuditRows(registry, 'Button', healthyEntry);
    const row = rows.find((entry) => entry.ruleId === 'comp/registry-entry-present');
    expect(row).toBeDefined();
    expect(row?.pass).toBe(false);
  });
});
