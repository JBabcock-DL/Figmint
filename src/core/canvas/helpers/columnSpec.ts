import columnWidthsData from '../data/column-widths.json';
import { TABLE_WIDTH } from '../constants';
import type { ColumnDef, ColumnTableKey } from '../types';

interface ColumnWidthsFile {
  sumTarget: number;
  tables: Record<ColumnTableKey, { columns: ColumnDef[] }>;
}

const columnWidths = columnWidthsData as ColumnWidthsFile;

const TABLE_KEYS = Object.keys(columnWidths.tables) as ColumnTableKey[];

/** All 13 table profile keys from `column-widths.json`. */
export const COLUMN_TABLE_KEYS: ColumnTableKey[] = TABLE_KEYS;

/**
 * Returns typed column definitions for a style-guide table profile.
 */
export function getColumnSpec(tableKey: ColumnTableKey): ColumnDef[] {
  const entry = columnWidths.tables[tableKey];
  return entry.columns.map(function (col) {
    return { id: col.id, width: col.width };
  });
}

/**
 * Throws when column widths do not sum to the table width target (1640).
 */
export function validateColumnWidths(columns: ColumnDef[], sumTarget?: number): void {
  const target = sumTarget !== undefined ? sumTarget : TABLE_WIDTH;
  let sum = 0;
  for (const col of columns) {
    sum += col.width;
  }
  if (sum !== target) {
    throw new Error(`Column widths sum to ${String(sum)}, expected ${String(target)}`);
  }
}

/**
 * Convenience lookup for a single column width by id.
 */
export function getColumnWidth(tableKey: ColumnTableKey, columnId: string): number {
  const columns = getColumnSpec(tableKey);
  for (const col of columns) {
    if (col.id === columnId) {
      return col.width;
    }
  }
  throw new Error(`columnSpec: column "${columnId}" not found in table "${tableKey}"`);
}
