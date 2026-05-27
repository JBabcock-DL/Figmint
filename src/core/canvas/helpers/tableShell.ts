import { TABLE_HEADER_HEIGHT, TABLE_WIDTH } from '../constants';
import type { ColumnDef } from '../types';
import { createHeaderCell } from './tableCells';

/**
 * `doc/table-group/{slug}` — VERTICAL shell for title + table (no title nodes here).
 */
export function createTableGroup(slug: string): FrameNode {
  const group = figma.createFrame();
  group.name = `doc/table-group/${slug}`;
  group.layoutMode = 'VERTICAL';
  group.primaryAxisSizingMode = 'AUTO';
  group.counterAxisSizingMode = 'FIXED';
  group.clipsContent = false;
  group.itemSpacing = 12;
  return group;
}

/**
 * §13 step 1 — `doc/table/{slug}` root; `resizeWithoutConstraints(1640, 1)` per convention.
 */
export function createTableRoot(slug: string): FrameNode {
  const table = figma.createFrame();
  table.name = `doc/table/${slug}`;
  table.layoutMode = 'VERTICAL';
  table.primaryAxisSizingMode = 'AUTO';
  table.counterAxisSizingMode = 'FIXED';
  table.cornerRadius = 16;
  table.clipsContent = true;
  table.resizeWithoutConstraints(TABLE_WIDTH, 1);
  return table;
}

/**
 * §13 step 2 — `header` row + header cells (FIXED/FIXED species).
 */
export function createHeaderRow(
  table: FrameNode,
  columns: ColumnDef[],
  mutedTextVar?: Variable | null,
  codeStyleId?: string | null,
): FrameNode {
  const header = figma.createFrame();
  header.name = 'header';
  header.layoutMode = 'HORIZONTAL';
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'FIXED';
  header.resize(TABLE_WIDTH, TABLE_HEADER_HEIGHT);
  for (const col of columns) {
    const cell = createHeaderCell(col.width, col.id, col.id, mutedTextVar, codeStyleId);
    header.appendChild(cell);
  }
  table.appendChild(header);
  return header;
}

/**
 * §13 step 3 — empty `body` frame; no resize; fills cleared.
 */
export function createEmptyBody(table: FrameNode): FrameNode {
  const body = figma.createFrame();
  body.name = 'body';
  body.layoutMode = 'VERTICAL';
  body.primaryAxisSizingMode = 'AUTO';
  body.counterAxisSizingMode = 'FIXED';
  body.fills = [];
  table.appendChild(body);
  return body;
}
