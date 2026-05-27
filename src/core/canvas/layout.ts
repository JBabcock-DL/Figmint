import { runAudit } from '@/core/audit/runAudit';
import { pluginLog } from '@/core/pluginLog';
import { bindPaintToVar, bindStrokeToVar } from '@/core/canvas/helpers/bindings';
import { getColumnSpec } from '@/core/canvas/helpers/columnSpec';
import { resizeRect } from '@/core/canvas/helpers/autoLayout';
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
import { resolveTableChromeVariables } from '@/core/canvas/lib/docChromeVariables';
import { ensureLocalVariableMap } from '@/core/canvas/lib/variables';
import {
  countLayoutRows,
  resolveLayoutRows,
  type LayoutRow,
} from '@/core/canvas/resolveLayoutRows';
import { isRadiusGroupKey, orderLayoutGroupKeys } from '@/core/canvas/resolveShared';
import type { CanvasBuildContext, CanvasBuildResult } from '@/core/canvas/types';

export const LAYOUT_GROUP_META: Record<
  string,
  { title: string; caption: string; tableKey: 'layout/spacing' | 'layout/radius' }
> = {
  space: {
    title: 'Spacing',
    caption: 'Semantic spacing aliases mapped to Primitive space steps.',
    tableKey: 'layout/spacing',
  },
  spacing: {
    title: 'Spacing',
    caption: 'Semantic spacing aliases mapped to Primitive space steps.',
    tableKey: 'layout/spacing',
  },
  padding: {
    title: 'Padding',
    caption: 'Component padding scale.',
    tableKey: 'layout/spacing',
  },
  border: {
    title: 'Border Width',
    caption: 'Border width tokens.',
    tableKey: 'layout/spacing',
  },
  gap: {
    title: 'Gap',
    caption: 'Flex / grid gap scale.',
    tableKey: 'layout/spacing',
  },
  radius: {
    title: 'Radius',
    caption: 'Semantic radius aliases mapped to Primitive corner steps.',
    tableKey: 'layout/radius',
  },
  corner: {
    title: 'Corner Radius',
    caption: 'Semantic radius aliases mapped to Primitive corner steps.',
    tableKey: 'layout/radius',
  },
};

async function buildLayoutSpacingRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as LayoutRow;
  const variables = deps.variables;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;
  const mutedVar = deps.mutedVar;

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cell = createBodyCell(col.width, 'VERTICAL', col.id);
    switch (col.id) {
      case 'TOKEN': {
        const t = await makeTableText(data.tokenPath, col.width, docStyles.TokenName, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'VALUE': {
        const t = await makeTableText(data.displayValue, col.width, docStyles.Code, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'ALIAS →': {
        const t = await makeTableText(data.aliasPath || '—', col.width, docStyles.Code, mutedVar);
        cell.appendChild(t);
        break;
      }
      case 'PREVIEW': {
        cell.layoutMode = 'HORIZONTAL';
        cell.primaryAxisSizingMode = 'FIXED';
        cell.counterAxisSizingMode = 'AUTO';
        cell.counterAxisAlignItems = 'CENTER';
        const bar = figma.createRectangle();
        bar.name = 'preview-bar';
        const barWidth = Math.min(data.resolvedPx || 4, col.width - 40);
        resizeRect(bar, Math.max(barWidth, 2), 16);
        bar.cornerRadius = 4;
        const fillVar = variables['color/primary/200'];
        if (fillVar !== null && fillVar !== undefined) {
          bindPaintToVar(bar, fillVar);
        } else {
          bar.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.88, b: 1 } }];
        }
        cell.appendChild(bar);
        break;
      }
      case 'WEB':
      case 'ANDROID':
      case 'iOS': {
        const syntax =
          col.id === 'WEB'
            ? data.codeSyntax.WEB
            : col.id === 'ANDROID'
              ? data.codeSyntax.ANDROID
              : data.codeSyntax.iOS;
        const t = await makeTableText(syntax || '—', col.width, docStyles.Code, contentVar);
        cell.appendChild(t);
        break;
      }
      default:
        break;
    }
    rehugCell(cell);
    row.appendChild(cell);
    cell.fills = [];
  }
}

async function buildLayoutRadiusRow(
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
): Promise<void> {
  const data = rowData as LayoutRow;
  const variables = deps.variables;
  const docStyles = deps.docStyles;
  const contentVar = deps.contentVar;
  const mutedVar = deps.mutedVar;

  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cell = createBodyCell(col.width, 'VERTICAL', col.id);
    switch (col.id) {
      case 'TOKEN': {
        const t = await makeTableText(data.tokenPath, col.width, docStyles.TokenName, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'VALUE': {
        const t = await makeTableText(data.displayValue, col.width, docStyles.Code, contentVar);
        cell.appendChild(t);
        break;
      }
      case 'ALIAS →': {
        const t = await makeTableText(data.aliasPath || '—', col.width, docStyles.Code, mutedVar);
        cell.appendChild(t);
        break;
      }
      case 'PREVIEW': {
        cell.layoutMode = 'HORIZONTAL';
        cell.primaryAxisSizingMode = 'FIXED';
        cell.counterAxisSizingMode = 'AUTO';
        cell.counterAxisAlignItems = 'CENTER';
        const sq = figma.createRectangle();
        sq.name = 'preview-square';
        resizeRect(sq, 64, 64);
        const raw = data.resolvedPx >= 9999 ? 32 : Math.min(data.resolvedPx || 0, 32);
        sq.cornerRadius = raw;
        sq.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }];
        sq.strokeWeight = 1;
        const borderVar = variables['doc/preview/swatch-stroke'];
        if (borderVar !== null && borderVar !== undefined) {
          bindStrokeToVar(sq, borderVar);
        }
        const fillVar = variables['color/neutral/100'];
        if (fillVar !== null && fillVar !== undefined) {
          bindPaintToVar(sq, fillVar);
        } else {
          sq.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.97 } }];
        }
        cell.appendChild(sq);
        break;
      }
      case 'WEB':
      case 'ANDROID':
      case 'iOS': {
        const syntax =
          col.id === 'WEB'
            ? data.codeSyntax.WEB
            : col.id === 'ANDROID'
              ? data.codeSyntax.ANDROID
              : data.codeSyntax.iOS;
        const t = await makeTableText(syntax || '—', col.width, docStyles.Code, contentVar);
        cell.appendChild(t);
        break;
      }
      default:
        break;
    }
    rehugCell(cell);
    row.appendChild(cell);
    cell.fills = [];
  }
}

/** Step 15c — ↳ Layout page (dynamic spacing + radius group tables). */
export async function buildLayoutPage(ctx: CanvasBuildContext): Promise<CanvasBuildResult> {
  const started = Date.now();
  const warnings: string[] = [];

  await loadFontsForCanvas();
  const variableMap = await ensureLocalVariableMap();
  const chromeVars = resolveTableChromeVariables(variableMap);
  const docStyles = await resolveDocStyles();

  const page = findStyleGuidePage('layout', ctx.pageId);
  await figma.setCurrentPageAsync(page);

  const liveSnapshot = Object.keys(variableMap).map(function (name) {
    const variable = variableMap[name];
    return {
      id: variable.id,
      name: variable.name,
      collectionId: variable.variableCollectionId,
      collectionName: '',
      resolvedType: variable.resolvedType,
      valuesByMode: variable.valuesByMode,
      codeSyntax: variable.codeSyntax as Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>,
    };
  });

  const groups = resolveLayoutRows(ctx.tokens, liveSnapshot);
  const groupKeys = orderLayoutGroupKeys(Object.keys(groups));

  const content = buildPageContent(page);
  suspendPageContentAutoLayout(content);

  let tableCount = 0;
  for (let gi = 0; gi < groupKeys.length; gi++) {
    const key = groupKeys[gi];
    const tableRows = groups[key];
    if (tableRows.length === 0) {
      continue;
    }
    const meta = LAYOUT_GROUP_META[key];
    const isRadius = isRadiusGroupKey(key);
    const tableKey =
      meta !== undefined ? meta.tableKey : isRadius ? 'layout/radius' : 'layout/spacing';
    const title =
      meta !== undefined
        ? meta.title
        : key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');
    const caption = meta !== undefined ? meta.caption : title + ' tokens.';

    await buildTable(
      {
        slug: 'layout/' + key,
        tableKey: tableKey,
        title: title,
        caption: caption,
        rows: tableRows,
        buildRow: isRadius ? buildLayoutRadiusRow : buildLayoutSpacingRow,
      },
      content,
      chromeVars,
      docStyles,
      variableMap,
    );
    tableCount += 1;
  }

  restorePageContentAutoLayout(content);

  const durationMs = Date.now() - started;
  const rowCount = countLayoutRows(groups);
  const audit = await runAudit('canvas', {
    builder: 'layout',
    page: page,
    stats: {
      tableGroups: tableCount,
      layoutRows: rowCount,
    },
  });

  pluginLog('[canvas] buildLayoutPage done', String(durationMs) + 'ms', {
    tableCount: tableCount,
    layoutRows: rowCount,
    auditPassed: audit.passed,
  });

  return {
    ok: audit.passed,
    builder: 'layout',
    durationMs: durationMs,
    pageId: page.id,
    pageName: page.name,
    tableCount: tableCount,
    swatchCount: rowCount,
    warnings: warnings,
    audit: audit,
    stats: { tableGroups: tableCount, layoutRows: rowCount },
  };
}

/** Column metadata smoke — used by Vitest. */
export function layoutSpacingColumnSpec() {
  return getColumnSpec('layout/spacing');
}
