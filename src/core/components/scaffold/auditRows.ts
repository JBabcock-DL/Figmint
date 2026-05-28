import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';

import { parseVariantName } from './variantMatrix';

export function buildScaffoldAuditRows(
  componentSet: ComponentSetNode,
  expectedCount: number,
): AuditRuleResult[] {
  const rows: AuditRuleResult[] = [];

  const actualCount = componentSet.children.length;
  rows.push({
    ruleId: 'comp/scaffold-variant-count',
    pass: actualCount === expectedCount,
    diagnostic:
      'expected ' +
      String(expectedCount) +
      ' variant children, found ' +
      String(actualCount),
  });

  let namingPass = true;
  const namingFailures: string[] = [];
  for (let i = 0; i < componentSet.children.length; i++) {
    const child = componentSet.children[i];
    if (parseVariantName(child.name) === null) {
      namingPass = false;
      namingFailures.push(child.name);
    }
  }
  rows.push({
    ruleId: 'comp/scaffold-naming',
    pass: namingPass,
    diagnostic: namingPass
      ? 'all variant names parse as key=value pairs'
      : 'invalid variant names: ' + namingFailures.join('; '),
  });

  let onePxPass = true;
  const onePxFailures: string[] = [];
  for (let i = 0; i < componentSet.children.length; i++) {
    const child = componentSet.children[i];
    if (child.type !== 'COMPONENT') {
      continue;
    }
    const violation = assertNoOnePxMaster(child as unknown as FrameNode);
    if (violation !== null) {
      onePxPass = false;
      onePxFailures.push(child.name);
    }
  }
  rows.push({
    ruleId: 'comp/scaffold-one-px-master',
    pass: onePxPass,
    diagnostic: onePxPass
      ? 'no 1px master violations'
      : 'one-px-master on: ' + onePxFailures.join('; '),
  });

  return rows;
}
