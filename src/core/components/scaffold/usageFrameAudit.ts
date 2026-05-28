import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import {
  assertNoCollapsedAxis,
  assertNoOnePxMaster,
} from '@/core/canvas/helpers/autoLayout';

import type { VariantCombo } from './types';

export const USAGE_AUDIT_RULE_IDS = [
  'comp/usage-instance-count',
  'comp/usage-label-present',
  'comp/usage-setproperties',
  'comp/usage-one-px-cell',
  'comp/doc-section-width',
] as const;

function findLabelText(cell: FrameNode): TextNode | null {
  for (let i = 0; i < cell.children.length; i++) {
    const child = cell.children[i];
    if (child.type === 'TEXT' && child.name === 'label') {
      return child as TextNode;
    }
  }
  return null;
}

export function buildUsageFrameAuditRows(input: {
  instances: InstanceNode[];
  combos: VariantCombo[];
  crossProductCount: number;
  maxInstances: number;
  cells: FrameNode[];
  setPropertiesErrors: string[];
  setGroup?: FrameNode;
  usageSection?: FrameNode;
}): AuditRuleResult[] {
  const expectedCount = Math.min(input.crossProductCount, input.maxInstances);
  const rows: AuditRuleResult[] = [];

  rows.push({
    ruleId: 'comp/usage-instance-count',
    pass: input.instances.length === expectedCount,
    diagnostic:
      'expected ' +
      String(expectedCount) +
      ' usage instances, found ' +
      String(input.instances.length),
    severity: 'error',
  });

  let labelPass = true;
  const labelFailures: string[] = [];
  for (let i = 0; i < input.cells.length; i++) {
    const cell = input.cells[i];
    const label = findLabelText(cell);
    if (label === null || label.characters === '') {
      labelPass = false;
      labelFailures.push(cell.name);
    }
  }
  rows.push({
    ruleId: 'comp/usage-label-present',
    pass: labelPass,
    diagnostic: labelPass
      ? 'all usage cells have non-empty label text'
      : 'missing or empty labels on: ' + labelFailures.join('; '),
    severity: 'error',
  });

  rows.push({
    ruleId: 'comp/usage-setproperties',
    pass: input.setPropertiesErrors.length === 0,
    diagnostic:
      input.setPropertiesErrors.length === 0
        ? 'all setProperties calls succeeded'
        : 'setProperties failures: ' + input.setPropertiesErrors.join('; '),
    severity: 'error',
  });

  let onePxPass = true;
  const onePxFailures: string[] = [];
  for (let i = 0; i < input.cells.length; i++) {
    const cell = input.cells[i];
    const violation = assertNoOnePxMaster(cell);
    if (violation !== null) {
      onePxPass = false;
      onePxFailures.push(cell.name);
    }
  }
  rows.push({
    ruleId: 'comp/usage-one-px-cell',
    pass: onePxPass,
    diagnostic: onePxPass
      ? 'no 1px usage cell violations'
      : 'one-px-cell on: ' + onePxFailures.join('; '),
    severity: 'error',
  });

  // BUG-S5-001 / BUG-S5-002 — catch doc/component/*/{component-set-group,usage}
  // sections that ended up at width=1 (Hug reassert failed after `resize(1,1)`).
  const sectionsToCheck: FrameNode[] = [];
  if (input.setGroup !== undefined) {
    sectionsToCheck.push(input.setGroup);
  }
  if (input.usageSection !== undefined) {
    sectionsToCheck.push(input.usageSection);
  }
  let docSectionPass = true;
  const docSectionFailures: string[] = [];
  for (let i = 0; i < sectionsToCheck.length; i++) {
    const section = sectionsToCheck[i];
    const violation = assertNoCollapsedAxis(section);
    if (violation !== null) {
      docSectionPass = false;
      docSectionFailures.push(
        section.name +
          ' (' +
          violation.axis +
          ' ' +
          String(violation.width) +
          'x' +
          String(violation.height) +
          ', ' +
          String(violation.childCount) +
          ' children)',
      );
    }
  }
  rows.push({
    ruleId: 'comp/doc-section-width',
    pass: docSectionPass,
    diagnostic: docSectionPass
      ? 'doc/component/* sections meet minimum geometry'
      : 'collapsed-axis on: ' + docSectionFailures.join('; '),
    severity: 'error',
  });

  return rows;
}

export function usageFrameAuditPassed(rows: AuditRuleResult[]): boolean {
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].pass) {
      return false;
    }
  }
  return true;
}
