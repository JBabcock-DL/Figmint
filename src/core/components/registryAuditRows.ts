import type { AuditRuleResult, RegistryComponentEntry, RegistryV1 } from '@detroitlabs/figmint-contracts';

function hasComponentKey(registry: RegistryV1, componentKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(registry.components, componentKey);
}

export function buildRegistryAuditRows(
  registry: RegistryV1,
  componentKey: string,
  entry: RegistryComponentEntry,
): AuditRuleResult[] {
  const rows: AuditRuleResult[] = [];
  const envelopePass = registry.fileKey.length > 0;

  rows.push({
    ruleId: 'comp/registry-envelope',
    pass: envelopePass,
    diagnostic: envelopePass
      ? 'registry envelope v=1 kind=registry'
      : 'expected v=1 kind=registry',
  });

  const entryPresent = hasComponentKey(registry, componentKey);
  rows.push({
    ruleId: 'comp/registry-entry-present',
    pass: entryPresent,
    diagnostic: entryPresent
      ? 'component key present in registry'
      : 'missing component key ' + componentKey,
  });

  rows.push({
    ruleId: 'comp/registry-entry-nodeid',
    pass: entry.nodeId.length > 0,
    diagnostic:
      entry.nodeId.length > 0 ? 'nodeId populated' : 'nodeId must be non-empty',
  });

  rows.push({
    ruleId: 'comp/registry-entry-key',
    pass: entry.key.length > 0,
    diagnostic: entry.key.length > 0 ? 'Figma key populated' : 'key must be non-empty',
  });

  rows.push({
    ruleId: 'comp/registry-entry-version',
    pass: Number.isInteger(entry.version) && entry.version >= 1,
    diagnostic:
      Number.isInteger(entry.version) && entry.version >= 1
        ? 'version >= 1'
        : 'version must be integer >= 1',
  });

  rows.push({
    ruleId: 'comp/registry-filekey',
    pass: registry.fileKey.length > 0,
    diagnostic:
      registry.fileKey.length > 0 ? 'fileKey populated' : 'fileKey must be non-empty',
  });

  return rows;
}
