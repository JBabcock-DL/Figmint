import { TABLE_WIDTH } from '@/core/canvas/constants';
import { bindPaintToVar, bindStrokeToVar } from '@/core/canvas/helpers/bindings';
import { shouldApplyTableShadow } from '@/core/canvas/helpers/buildOrder';
import { reassertHug } from '@/core/canvas/helpers/autoLayout';
import {
  createEmptyBody,
  createHeaderRow,
  createTableGroup,
  createTableRoot,
} from '@/core/canvas/helpers/tableShell';
import { createBodyCell, createBodyRow, reassertBodyRow } from '@/core/canvas/helpers/tableCells';
import type { ColumnTableKey } from '@/core/canvas/types';
import {
  makeCaptionText,
  makeSectionText,
  makeTableText,
  type DocStyleIds,
} from '@/core/canvas/lib/cells';
import { getColumnSpec } from '@/core/canvas/helpers/columnSpec';

const CATEGORY_ROW_HEIGHT = 40;

export interface TableRowDeps {
  variables: Record<string, Variable | null>;
  docStyles: DocStyleIds;
  contentVar: Variable | null;
  mutedVar: Variable | null;
  borderVar: Variable | null;
  variableMap: Record<string, Variable>;
  [key: string]: unknown;
}

export type RowBuilderFn = (
  row: FrameNode,
  rowData: unknown,
  columns: { id: string; width: number }[],
  deps: TableRowDeps,
) => Promise<void>;

export interface TableManifest {
  slug: string;
  tableKey: ColumnTableKey;
  title?: string;
  caption?: string;
  rows: unknown[];
  buildRow: RowBuilderFn;
  rowDeps?: Record<string, unknown>;
}

export interface BuildTableChrome {
  borderVar: Variable | null;
  bgDefault: Variable | null;
  bgVariant: Variable | null;
  contentVar: Variable | null;
  mutedVar: Variable | null;
}

function isCategoryRow(rowData: unknown): rowData is { type: 'category'; label: string } {
  if (typeof rowData !== 'object' || rowData === null) {
    return false;
  }
  const record = rowData as Record<string, unknown>;
  return record.type === 'category' && typeof record.label === 'string';
}

function rowTokenPath(rowData: unknown): string {
  if (typeof rowData === 'object' && rowData !== null) {
    const record = rowData as Record<string, unknown>;
    if (typeof record.tokenPath === 'string') {
      return record.tokenPath;
    }
  }
  return 'unknown';
}

export function resolveTableChrome(variables: Record<string, Variable | null>): BuildTableChrome {
  return {
    borderVar:
      variables['doc/table/border'] !== undefined ? variables['doc/table/border'] : null,
    bgDefault:
      variables['doc/table/surface'] !== undefined ? variables['doc/table/surface'] : null,
    bgVariant:
      variables['doc/table/header-surface'] !== undefined
        ? variables['doc/table/header-surface']
        : null,
    contentVar:
      variables['doc/text/primary'] !== undefined ? variables['doc/text/primary'] : null,
    mutedVar: variables['doc/text/muted'] !== undefined ? variables['doc/text/muted'] : null,
  };
}

async function appendCategoryRow(
  body: FrameNode,
  label: string,
  docStyles: DocStyleIds,
  bgVariant: Variable | null,
  mutedVar: Variable | null,
): Promise<void> {
  const catRow = figma.createFrame();
  catRow.name = 'cat-' + label.toLowerCase().replace(/\s+/g, '-');
  catRow.layoutMode = 'HORIZONTAL';
  catRow.primaryAxisSizingMode = 'FIXED';
  catRow.counterAxisSizingMode = 'FIXED';
  catRow.resize(TABLE_WIDTH, CATEGORY_ROW_HEIGHT);
  if (bgVariant !== null) {
    bindPaintToVar(catRow, bgVariant);
  } else {
    catRow.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.97 } }];
  }

  const catCell = createBodyCell(TABLE_WIDTH, 'HORIZONTAL', 'category');
  catCell.fills = [];
  const catText = await makeTableText(label, TABLE_WIDTH, docStyles.Caption, mutedVar);
  catCell.appendChild(catText);
  reassertHug(catCell);
  catRow.appendChild(catCell);
  body.appendChild(catRow);
}

/**
 * C1 detached-build: group → table → header/body off-page → single append to parent.
 * Column widths from WO-014 `getColumnSpec`.
 */
export async function buildTable(
  manifest: TableManifest,
  parent: FrameNode,
  variables: Record<string, Variable | null>,
  docStyles: DocStyleIds,
  variableMap: Record<string, Variable>,
): Promise<FrameNode> {
  const columns = getColumnSpec(manifest.tableKey);
  const chrome = resolveTableChrome(variables);

  const group = createTableGroup(manifest.slug);
  group.layoutSizingVertical = 'HUG';
  group.resizeWithoutConstraints(TABLE_WIDTH, 1);
  group.itemSpacing = 12;
  group.fills = [];
  group.clipsContent = false;

  if (manifest.title !== undefined && manifest.title !== '') {
    const titleText = await makeSectionText(manifest.title, chrome.contentVar);
    titleText.name = 'doc/table-group/' + manifest.slug + '/title';
    group.appendChild(titleText);
  }
  if (manifest.caption !== undefined && manifest.caption !== '') {
    const capText = await makeCaptionText(manifest.caption, chrome.mutedVar);
    capText.name = 'doc/table-group/' + manifest.slug + '/caption';
    group.appendChild(capText);
  }

  const table = createTableRoot(manifest.slug);
  if (chrome.borderVar !== null) {
    table.strokes = [{ type: 'SOLID', color: { r: 0.898, g: 0.898, b: 0.918 } }];
    table.strokeWeight = 1;
    bindStrokeToVar(table, chrome.borderVar);
  }
  if (chrome.bgDefault !== null) {
    bindPaintToVar(table, chrome.bgDefault);
  } else {
    table.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  }

  const header = createHeaderRow(table, columns, chrome.mutedVar, docStyles.Code);
  header.name = 'doc/table/' + manifest.slug + '/header';
  if (chrome.bgVariant !== null) {
    bindPaintToVar(header, chrome.bgVariant);
  } else {
    header.fills = [{ type: 'SOLID', color: { r: 0.965, g: 0.965, b: 0.969 } }];
  }
  if (chrome.borderVar !== null) {
    header.strokes = [{ type: 'SOLID', color: { r: 0.898, g: 0.898, b: 0.918 } }];
    header.strokeBottomWeight = 1;
    bindStrokeToVar(header, chrome.borderVar);
  }

  const body = createEmptyBody(table);
  body.name = 'doc/table/' + manifest.slug + '/body';
  body.layoutAlign = 'STRETCH';

  const rowDeps: TableRowDeps = {
    variables: variables,
    docStyles: docStyles,
    contentVar: chrome.contentVar,
    mutedVar: chrome.mutedVar,
    borderVar: chrome.borderVar,
    variableMap: variableMap,
  };
  if (manifest.rowDeps !== undefined) {
    const extraKeys = Object.keys(manifest.rowDeps);
    for (let ek = 0; ek < extraKeys.length; ek++) {
      rowDeps[extraKeys[ek]] = manifest.rowDeps[extraKeys[ek]];
    }
  }

  for (let i = 0; i < manifest.rows.length; i++) {
    const rowData = manifest.rows[i];
    const isLast = i === manifest.rows.length - 1;

    if (isCategoryRow(rowData)) {
      await appendCategoryRow(body, rowData.label, docStyles, chrome.bgVariant, chrome.mutedVar);
      continue;
    }

    const row = createBodyRow(rowTokenPath(rowData), isLast ? null : chrome.borderVar);
    await manifest.buildRow(row, rowData, columns, rowDeps);
    reassertBodyRow(row);
    body.appendChild(row);
  }

  group.appendChild(table);

  if (shouldApplyTableShadow(manifest.slug)) {
    const effectStyles = await figma.getLocalEffectStylesAsync();
    let shadowStyle: EffectStyle | undefined;
    for (let ei = 0; ei < effectStyles.length; ei++) {
      if (effectStyles[ei].name === 'Effect/shadow-sm') {
        shadowStyle = effectStyles[ei];
        break;
      }
    }
    if (shadowStyle === undefined) {
      for (let ei = 0; ei < effectStyles.length; ei++) {
        if (/shadow.*sm/i.test(effectStyles[ei].name)) {
          shadowStyle = effectStyles[ei];
          break;
        }
      }
    }
    if (shadowStyle !== undefined) {
      table.effectStyleId = shadowStyle.id;
    }
  }

  parent.appendChild(group);
  group.primaryAxisSizingMode = 'AUTO';
  group.layoutSizingVertical = 'HUG';
  return group;
}
