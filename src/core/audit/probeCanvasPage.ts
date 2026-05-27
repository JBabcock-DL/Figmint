import { PAGE_CONTENT_WIDTH, TABLE_WIDTH } from '@/core/canvas/constants';
import { assertNoOnePxMaster, type OnePxMasterViolation } from '@/core/canvas/helpers/autoLayout';
import { getColumnSpec, validateColumnWidths } from '@/core/canvas/helpers/columnSpec';

export interface CanvasPageProbe {
  typographySlotRowCount: number;
  typographyColumnSum: number;
  platformMappingRowCount: number;
  platformMappingSubtreeHasEffects: boolean;
  pageContentWidth: number | null;
  headerCellIssues: number;
  tableTextIssues: number;
  onePxMasterViolations: OnePxMasterViolation[];
}

function walkNodes(node: BaseNode, fn: (node: BaseNode) => void): void {
  fn(node);
  if ('children' in node) {
    const children = (node as ChildrenMixin).children;
    for (let i = 0; i < children.length; i++) {
      walkNodes(children[i], fn);
    }
  }
}

function countTypographySlotRows(page: PageNode): number {
  const table = page.findOne(function (n) {
    return n.name === 'doc/table/typography/styles' && n.type === 'FRAME';
  }) as FrameNode | null;
  if (table === null) {
    return 0;
  }
  const body = table.findOne(function (n) {
    return n.name === 'doc/table/typography/styles/body';
  }) as FrameNode | null;
  if (body === null) {
    return 0;
  }
  let count = 0;
  for (let i = 0; i < body.children.length; i++) {
    const child = body.children[i];
    if (child.type === 'FRAME' && child.name.startsWith('row/')) {
      count += 1;
    }
  }
  return count;
}

function countPlatformMappingRows(page: PageNode): number {
  const table = page.findOne(function (n) {
    return n.name === 'doc/table/token-overview/platform-mapping';
  });
  if (table === null || table.type !== 'FRAME') {
    return 0;
  }
  const tableFrame = table as FrameNode;
  const rowPrefix = 'doc/table/token-overview/platform-mapping/row/';
  return tableFrame.findAll(function (n: SceneNode) {
    return n.type === 'FRAME' && n.name.startsWith(rowPrefix) && n.name.indexOf('/cell/') < 0;
  }).length;
}

function platformMappingHasEffects(page: PageNode): boolean {
  const table = page.findOne(function (n) {
    return n.name === 'doc/table/token-overview/platform-mapping';
  });
  if (table === null) {
    return false;
  }
  let hasEffects = false;
  walkNodes(table, function (n) {
    if (
      n.type === 'FRAME' ||
      n.type === 'COMPONENT' ||
      n.type === 'INSTANCE' ||
      n.type === 'GROUP'
    ) {
      const blend = n as BlendMixin;
      if (blend.effectStyleId && blend.effectStyleId !== '') {
        hasEffects = true;
      }
      if (Array.isArray(blend.effects) && blend.effects.length > 0) {
        hasEffects = true;
      }
    }
  });
  return hasEffects;
}

function scanHeaderCellIssues(page: PageNode): number {
  let issues = 0;
  walkNodes(page, function (n) {
    if (n.type !== 'FRAME') {
      return;
    }
    const frame = n as FrameNode;
    if (!frame.name.startsWith('header/cell/')) {
      return;
    }
    if (frame.layoutMode !== 'HORIZONTAL') {
      issues += 1;
      return;
    }
    if (frame.primaryAxisSizingMode !== 'FIXED' || frame.counterAxisSizingMode !== 'FIXED') {
      issues += 1;
      return;
    }
    if (frame.height < 8) {
      issues += 1;
    }
  });
  return issues;
}

function scanTableTextIssues(page: PageNode): number {
  let issues = 0;
  walkNodes(page, function (n) {
    if (n.type !== 'TEXT') {
      return;
    }
    const text = n as TextNode;
    if (text.textAutoResize !== 'HEIGHT' && text.textAutoResize !== 'WIDTH_AND_HEIGHT') {
      issues += 1;
    }
  });
  return issues;
}

function scanOnePxMasters(page: PageNode): OnePxMasterViolation[] {
  const violations: OnePxMasterViolation[] = [];
  walkNodes(page, function (n) {
    if (n.type !== 'FRAME') {
      return;
    }
    const violation = assertNoOnePxMaster(n as FrameNode);
    if (violation !== null) {
      violations.push(violation);
    }
  });
  return violations;
}

/** Walk a live page and collect canvas audit probe values. */
export function probeCanvasPage(page: PageNode): CanvasPageProbe {
  const pageContent = page.findOne(function (n) {
    return n.name === '_PageContent';
  }) as FrameNode | null;

  let typographyColumnSum = 0;
  try {
    const columns = getColumnSpec('typography/styles');
    let sum = 0;
    for (let i = 0; i < columns.length; i++) {
      sum += columns[i].width;
    }
    validateColumnWidths(columns);
    typographyColumnSum = sum;
  } catch {
    /* keep 0 */
  }

  return {
    typographySlotRowCount: countTypographySlotRows(page),
    typographyColumnSum: typographyColumnSum,
    platformMappingRowCount: countPlatformMappingRows(page),
    platformMappingSubtreeHasEffects: platformMappingHasEffects(page),
    pageContentWidth: pageContent !== null ? pageContent.width : null,
    headerCellIssues: scanHeaderCellIssues(page),
    tableTextIssues: scanTableTextIssues(page),
    onePxMasterViolations: scanOnePxMasters(page),
  };
}

export function mergeProbeWithStats(
  probe: CanvasPageProbe,
  stats?: Record<string, number>,
): CanvasPageProbe {
  if (stats === undefined) {
    return probe;
  }
  const merged = Object.assign({}, probe);
  if (typeof stats.slotRows === 'number' && stats.slotRows > merged.typographySlotRowCount) {
    merged.typographySlotRowCount = stats.slotRows;
  }
  if (
    typeof stats.platformMappingRows === 'number' &&
    stats.platformMappingRows > merged.platformMappingRowCount
  ) {
    merged.platformMappingRowCount = stats.platformMappingRows;
  }
  return merged;
}

export { PAGE_CONTENT_WIDTH, TABLE_WIDTH };
