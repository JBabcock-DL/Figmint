import { describe, expect, it } from 'vitest';

import { runAudit } from '@/core/audit/runAudit';
import { runCanvasRules } from '@/core/audit/rules/canvasRules';
import type { CanvasPageProbe } from '@/core/audit/probeCanvasPage';
import { PAGE_CONTENT_WIDTH, TABLE_WIDTH } from '@/core/canvas/constants';

function passProbe(overrides?: Partial<CanvasPageProbe>): CanvasPageProbe {
  return {
    typographySlotRowCount: 27,
    typographyColumnSum: TABLE_WIDTH,
    platformMappingRowCount: 22,
    platformMappingSubtreeHasEffects: false,
    pageContentWidth: PAGE_CONTENT_WIDTH,
    headerCellIssues: 0,
    tableTextIssues: 0,
    onePxMasterViolations: [],
    ...overrides,
  };
}

describe('runAudit canvas scope', () => {
  it('passes typography builder probe', async () => {
    const audit = await runAudit('canvas', {
      builder: 'text-styles',
      probeOverride: passProbe(),
    });

    expect(audit.passed).toBe(true);
    expect(audit.meta.scope).toBe('canvas');
    expect(
      audit.results.some(function (r) {
        return r.ruleId === 'canvas-typography-row-count' && r.pass;
      }),
    ).toBe(true);
  });

  it('fails when platform-mapping subtree has effects', async () => {
    const audit = await runAudit('canvas', {
      builder: 'token-overview',
      probeOverride: passProbe({ platformMappingSubtreeHasEffects: true }),
    });

    expect(audit.passed).toBe(false);
    const rule = audit.results.find(function (r) {
      return r.ruleId === 'canvas-token-overview-shadow-hygiene';
    });
    expect(rule?.pass).toBe(false);
  });

  it('flags bad header cells via canvas-bad-header-cells', () => {
    const results = runCanvasRules({ builder: 'text-styles' }, passProbe({ headerCellIssues: 2 }));
    const rule = results.find(function (r) {
      return r.ruleId === 'canvas-bad-header-cells';
    });
    expect(rule?.pass).toBe(false);
  });
});
