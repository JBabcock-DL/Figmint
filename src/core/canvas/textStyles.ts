import { runAudit } from '@/core/audit/runAudit';
import { pluginLog } from '@/core/pluginLog';
import { CanvasBuildError } from '@/core/canvas/errors';
import { verifySlotTextStyles } from '@/core/canvas/publishTypographyStyles';
import {
  countTypographyCategoryRows,
  countTypographySlotRows,
  projectTypographyRows,
  type TextStyleIndexEntry,
  type TypographyTableRow,
} from '@/core/canvas/projectRows/typographyRows';
import {
  createBodyCell,
  makeTableText,
  rehugCell,
  resolveDocStyles,
} from '@/core/canvas/lib/cells';
import { loadFontsForCanvas } from '@/core/canvas/lib/fonts';
import {
  buildPageContent,
  findStyleGuidePage,
  restorePageContentAutoLayout,
  suspendPageContentAutoLayout,
} from '@/core/canvas/lib/pages';
import { buildTable, type TableRowDeps } from '@/core/canvas/lib/table';
import { bindPaintToVar } from '@/core/canvas/helpers/bindings';
import { configureTableText } from '@/core/canvas/helpers/textCell';
import { ensureLocalVariableMap, resolveChromeVariables } from '@/core/canvas/lib/variables';
import type { CanvasBuildContext, CanvasBuildResult } from '@/core/canvas/types';

const CHROME_PATHS = [
  'color/border/subtle',
  'color/background/default',
  'color/background/variant',
  'color/background/content',
  'color/background/content-muted',
  'color/primary/default',
];

function typoCellSlug(colId: string): string {
  return (
    colId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cell'
  );
}

async function indexLocalTextStyles(): Promise<TextStyleIndexEntry[]> {
  const styles = await figma.getLocalTextStylesAsync();
  const entries: TextStyleIndexEntry[] = [];
  for (let i = 0; i < styles.length; i++) {
    const style = styles[i] as TextStyle & {
      fontWeight?: number;
      codeSyntax?: TextStyleIndexEntry['codeSyntax'];
    };
    const lh = style.lineHeight;
    let lineHeightUnit = 'AUTO';
    let lineHeightValue = 0;
    if (typeof lh === 'object' && lh !== null && 'unit' in lh) {
      lineHeightUnit = lh.unit;
      if ('value' in lh && typeof lh.value === 'number') {
        lineHeightValue = lh.value;
      }
    }
    const fontWeight =
      typeof style.fontWeight === 'number'
        ? style.fontWeight
        : style.fontName.style.indexOf('Medium') >= 0
          ? 500
          : 400;
    entries.push({
      id: style.id,
      name: style.name,
      fontSize: style.fontSize,
      fontWeight: fontWeight,
      fontFamily: style.fontName.family,
      lineHeightUnit: lineHeightUnit,
      lineHeightValue: lineHeightValue,
      codeSyntax: style.codeSyntax,
    });
  }
  return entries;
}

async function buildTypographyRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as TypographyTableRow;
  if (data.type === 'category') {
    return;
  }

  const docStyles = deps.docStyles;
  const variables = deps.variables;
  const contentVar = deps.contentVar;
  const v = data.variant;

  let fillVar = variables['color/background/content'];
  if (v === 'link') {
    fillVar =
      variables['color/primary/default'] !== undefined
        ? variables['color/primary/default']
        : fillVar;
  }
  if (v === 'strikethrough') {
    fillVar =
      variables['color/background/content-muted'] !== undefined
        ? variables['color/background/content-muted']
        : fillVar;
  }

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cell = createBodyCell(col.width, 'VERTICAL', typoCellSlug(col.id));
    const colId = col.id;

    if (colId === 'SLOT') {
      const t = await makeTableText(data.tokenPath, col.width, docStyles.TokenName, contentVar);
      cell.appendChild(t);
    } else if (colId === 'SPECIMEN') {
      const t = figma.createText();
      t.name = 'text/specimen';
      t.characters = data.specimenChars !== '' ? data.specimenChars : data.tokenPath;
      configureTableText(t, col.width);
      if (data.styleId !== '') {
        try {
          t.textStyleId = data.styleId;
        } catch {
          /* style may be missing on scratch files */
        }
      }
      if (fillVar !== null && fillVar !== undefined) {
        bindPaintToVar(t, fillVar);
      }
      cell.appendChild(t);
    } else if (colId === 'SIZE_LINE') {
      cell.itemSpacing = 2;
      const l1 = await makeTableText(
        data.sizeLine1 !== '' ? data.sizeLine1 : '—',
        col.width,
        docStyles.Code,
        contentVar,
      );
      const l2 = await makeTableText(
        data.sizeLine2 !== '' ? data.sizeLine2 : '—',
        col.width,
        docStyles.Code,
        contentVar,
      );
      cell.appendChild(l1);
      cell.appendChild(l2);
    } else if (colId === 'WEIGHT_FAMILY') {
      cell.itemSpacing = 2;
      const l1 = await makeTableText(
        data.weightLine1 !== '' ? data.weightLine1 : '—',
        col.width,
        docStyles.Code,
        contentVar,
      );
      const l2 = await makeTableText(
        data.weightLine2 !== '' ? data.weightLine2 : '—',
        col.width,
        docStyles.Code,
        contentVar,
      );
      cell.appendChild(l1);
      cell.appendChild(l2);
    } else if (colId === 'WEB') {
      const t = await makeTableText(
        data.codeSyntax.WEB !== '' ? data.codeSyntax.WEB : '—',
        col.width,
        docStyles.Code,
        contentVar,
      );
      cell.appendChild(t);
    } else if (colId === 'ANDROID') {
      const t = await makeTableText(
        data.codeSyntax.ANDROID !== '' ? data.codeSyntax.ANDROID : '—',
        col.width,
        docStyles.Code,
        contentVar,
      );
      cell.appendChild(t);
    } else if (colId === 'iOS') {
      const t = await makeTableText(
        data.codeSyntax.iOS !== '' ? data.codeSyntax.iOS : '—',
        col.width,
        docStyles.Code,
        contentVar,
      );
      cell.appendChild(t);
    }

    rehugCell(cell);
    row.appendChild(cell);
    cell.fills = [];
  }
}

export async function buildTextStylesPage(ctx: CanvasBuildContext): Promise<CanvasBuildResult> {
  const started = Date.now();
  const warnings: string[] = [];

  const slotCheck = await verifySlotTextStyles();
  if (slotCheck.count < 27) {
    throw new CanvasBuildError(
      'Typography slot text styles missing (' +
        String(slotCheck.count) +
        '/27). Run publishTypographyStyles before buildTextStylesPage. Missing: ' +
        slotCheck.missing.join(', '),
      slotCheck.missing,
    );
  }

  const page = findStyleGuidePage('text-styles', ctx.pageId);
  await figma.setCurrentPageAsync(page);

  await loadFontsForCanvas();
  const variableMap = await ensureLocalVariableMap();
  const chromeVars = await resolveChromeVariables(CHROME_PATHS, variableMap);
  const docStyles = await resolveDocStyles();

  const textStyleIndex = await indexLocalTextStyles();
  const rows = projectTypographyRows(textStyleIndex);
  const slotCount = countTypographySlotRows(rows);
  const categoryCount = countTypographyCategoryRows(rows);

  const content = buildPageContent(page);
  suspendPageContentAutoLayout(content);

  await buildTable(
    {
      slug: 'typography/styles',
      tableKey: 'typography/styles',
      title: 'Typography',
      caption:
        'Specimen renders at mode 100 — full 8-mode scale (85 → 200) ships via the Typography collection. Body variants extend each size with emphasis / italic / link / strikethrough per §7b.',
      rows: rows,
      buildRow: buildTypographyRow,
    },
    content,
    chromeVars,
    docStyles,
    variableMap,
  );

  restorePageContentAutoLayout(content);

  const durationMs = Date.now() - started;
  const audit = await runAudit('canvas', {
    builder: 'text-styles',
    page: page,
    stats: {
      slotRows: slotCount,
      categoryRows: categoryCount,
    },
  });

  pluginLog('[canvas] buildTextStylesPage done', String(durationMs) + 'ms', {
    slotRows: slotCount,
    categoryRows: categoryCount,
    auditPassed: audit.passed,
  });

  return {
    ok: audit.passed,
    builder: 'text-styles',
    durationMs: durationMs,
    pageId: page.id,
    pageName: page.name,
    tableCount: 1,
    swatchCount: slotCount,
    warnings: warnings,
    audit: audit,
  };
}
