import type { AuditRuleResult } from '@detroitlabs/figmint-contracts';

import type { CanvasPageProbe } from '../probeCanvasPage';
import { PAGE_CONTENT_WIDTH, TABLE_WIDTH } from '../probeCanvasPage';
import type { CanvasAuditInput } from '../types';

function result(ruleId: string, pass: boolean, diagnostic: string): AuditRuleResult {
  return {
    ruleId: ruleId,
    pass: pass,
    diagnostic: diagnostic,
    severity: 'error',
  };
}

export function checkCanvasTypographyRowCount(
  input: CanvasAuditInput,
  probe: CanvasPageProbe,
): AuditRuleResult {
  if (input.builder !== 'text-styles') {
    return result('canvas-typography-row-count', true, 'N/A for builder ' + input.builder);
  }
  const count = probe.typographySlotRowCount;
  const pass = count >= 27;
  return result(
    'canvas-typography-row-count',
    pass,
    pass
      ? String(count) + ' typography slot rows present'
      : 'Expected ≥27 slot rows, found ' + String(count),
  );
}

export function checkCanvasTypographyColumnSum(probe: CanvasPageProbe): AuditRuleResult {
  const pass = probe.typographyColumnSum === TABLE_WIDTH;
  return result(
    'canvas-typography-column-sum',
    pass,
    pass
      ? 'Typography table columns sum to ' + String(TABLE_WIDTH)
      : 'Typography columns sum to ' +
          String(probe.typographyColumnSum) +
          ', expected ' +
          String(TABLE_WIDTH),
  );
}

export function checkCanvasTokenOverviewPlatformRows(
  input: CanvasAuditInput,
  probe: CanvasPageProbe,
): AuditRuleResult {
  if (input.builder !== 'token-overview') {
    return result('canvas-token-overview-platform-rows', true, 'N/A for builder ' + input.builder);
  }
  const count = probe.platformMappingRowCount;
  const pass = count >= 22;
  return result(
    'canvas-token-overview-platform-rows',
    pass,
    pass
      ? String(count) + ' platform-mapping rows present'
      : 'Expected ≥22 platform-mapping rows, found ' + String(count),
  );
}

export function checkCanvasTokenOverviewShadowHygiene(
  input: CanvasAuditInput,
  probe: CanvasPageProbe,
): AuditRuleResult {
  if (input.builder !== 'token-overview') {
    return result('canvas-token-overview-shadow-hygiene', true, 'N/A for builder ' + input.builder);
  }
  const pass = !probe.platformMappingSubtreeHasEffects;
  return result(
    'canvas-token-overview-shadow-hygiene',
    pass,
    pass
      ? 'Platform-mapping subtree has no effects'
      : 'Platform-mapping subtree still has effects or effectStyleId',
  );
}

export function checkCanvasBadHeaderCells(probe: CanvasPageProbe): AuditRuleResult {
  const pass = probe.headerCellIssues === 0;
  return result(
    'canvas-bad-header-cells',
    pass,
    pass
      ? 'All header cells pass geometry probe'
      : String(probe.headerCellIssues) + ' header cell geometry issue(s)',
  );
}

export function checkCanvasBadTableText(probe: CanvasPageProbe): AuditRuleResult {
  const pass = probe.tableTextIssues === 0;
  return result(
    'canvas-bad-table-text',
    pass,
    pass
      ? 'All table text nodes use HEIGHT auto-resize'
      : String(probe.tableTextIssues) + ' text node(s) missing HEIGHT auto-resize',
  );
}

export function checkCanvasNoOnePxMasters(probe: CanvasPageProbe): AuditRuleResult {
  const pass = probe.onePxMasterViolations.length === 0;
  return result(
    'canvas-no-one-px-masters',
    pass,
    pass
      ? 'No 1px master slivers detected'
      : String(probe.onePxMasterViolations.length) + ' one-px master violation(s)',
  );
}

export function checkCanvasPageContentWidth(probe: CanvasPageProbe): AuditRuleResult {
  if (probe.pageContentWidth === null) {
    return result('canvas-page-content-width', false, '_PageContent not found');
  }
  const pass = Math.abs(probe.pageContentWidth - PAGE_CONTENT_WIDTH) <= 1;
  return result(
    'canvas-page-content-width',
    pass,
    pass
      ? '_PageContent width ' + String(probe.pageContentWidth)
      : '_PageContent width ' +
          String(probe.pageContentWidth) +
          ', expected ' +
          String(PAGE_CONTENT_WIDTH),
  );
}

export function runCanvasRules(input: CanvasAuditInput, probe: CanvasPageProbe): AuditRuleResult[] {
  return [
    checkCanvasTypographyRowCount(input, probe),
    checkCanvasTypographyColumnSum(probe),
    checkCanvasTokenOverviewPlatformRows(input, probe),
    checkCanvasTokenOverviewShadowHygiene(input, probe),
    checkCanvasBadHeaderCells(probe),
    checkCanvasBadTableText(probe),
    checkCanvasNoOnePxMasters(probe),
    checkCanvasPageContentWidth(probe),
  ];
}
