import { describe, expect, it } from 'vitest';

import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { classifyAuditRule, sortAuditRules } from '@/ui/components/auditPanelUtils';

function rule(ruleId: string, pass: boolean, severity?: 'error' | 'warn'): AuditRuleResult {
  return {
    ruleId: ruleId,
    pass: pass,
    diagnostic: ruleId + ' diagnostic',
    severity: severity,
  };
}

describe('auditPanelUtils', () => {
  it('classifies failed, warn, and passed buckets', () => {
    expect(classifyAuditRule(rule('a', false))).toBe('failed');
    expect(classifyAuditRule(rule('b', false, 'warn'))).toBe('warn');
    expect(classifyAuditRule(rule('c', true))).toBe('passed');
  });

  it('sorts failed first, then warn, then passed', () => {
    const input = [
      rule('passed-1', true),
      rule('warn-1', false, 'warn'),
      rule('failed-1', false),
      rule('passed-2', true),
      rule('failed-2', false),
    ];
    const sorted = sortAuditRules(input);
    expect(
      sorted.map(function (r) {
        return r.ruleId;
      }),
    ).toEqual(['failed-1', 'failed-2', 'warn-1', 'passed-1', 'passed-2']);
  });
});
