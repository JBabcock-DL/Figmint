import {
  CELL_PADDING_HORIZONTAL,
  CELL_PADDING_VERTICAL,
  ROW_PADDING_VERTICAL,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_MIN_HEIGHT,
  TABLE_WIDTH,
} from '../constants';
import type { BodyCellLayoutMode } from '../types';
import { createHugFrame, reassertHug } from './autoLayout';
import { bindStrokeToVar } from './bindings';
import { configureTableText } from './textCell';

/**
 * §0.5 — HORIZONTAL + FIXED/FIXED + resize before text append.
 */
export function createHeaderCell(
  colWidth: number,
  labelText: string,
  columnId?: string,
): FrameNode {
  const cell = figma.createFrame();
  const cellId =
    columnId !== undefined && columnId !== ''
      ? columnId
      : labelText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  cell.name = `header/cell/${cellId}`;
  cell.layoutMode = 'HORIZONTAL';
  cell.primaryAxisSizingMode = 'FIXED';
  cell.counterAxisSizingMode = 'FIXED';
  cell.resize(colWidth, TABLE_HEADER_HEIGHT);
  cell.paddingLeft = CELL_PADDING_HORIZONTAL;
  cell.paddingRight = CELL_PADDING_HORIZONTAL;
  cell.counterAxisAlignItems = 'CENTER';
  cell.fills = [];

  const text = figma.createText();
  text.characters = labelText;
  configureTableText(text, colWidth);
  cell.appendChild(text);
  return cell;
}

/**
 * §0.1 / §0.1.H — VERTICAL vs HORIZONTAL axis assignment before resize.
 */
export function createBodyCell(
  colWidth: number,
  layoutMode: BodyCellLayoutMode,
  columnId?: string,
): FrameNode {
  const cell = createHugFrame({
    layoutMode: layoutMode,
    width: colWidth,
    height: 1,
    name: columnId !== undefined && columnId !== '' ? `cell/${columnId}` : 'cell',
  });
  cell.paddingLeft = CELL_PADDING_HORIZONTAL;
  cell.paddingRight = CELL_PADDING_HORIZONTAL;
  cell.paddingTop = CELL_PADDING_VERTICAL;
  cell.paddingBottom = CELL_PADDING_VERTICAL;
  cell.itemSpacing = 2;
  cell.primaryAxisAlignItems = 'CENTER';
  cell.counterAxisAlignItems = 'MIN';
  cell.fills = [];
  return cell;
}

/**
 * §0.1 — HORIZONTAL row: counter AUTO, primary FIXED 1640, minHeight 64, padding V=16.
 */
export function createBodyRow(tokenPath: string, borderVariable?: Variable | null): FrameNode {
  const row = createHugFrame({
    name: `row/${tokenPath}`,
    layoutMode: 'HORIZONTAL',
    width: TABLE_WIDTH,
    height: 1,
  });
  row.minHeight = TABLE_ROW_MIN_HEIGHT;
  row.paddingTop = ROW_PADDING_VERTICAL;
  row.paddingBottom = ROW_PADDING_VERTICAL;
  row.counterAxisAlignItems = 'CENTER';
  row.fills = [];

  if (borderVariable !== null) {
    row.strokes = [{ type: 'SOLID', color: { r: 0.898, g: 0.898, b: 0.918 } }];
    row.strokeBottomWeight = 1;
    row.strokeTopWeight = 0;
    row.strokeLeftWeight = 0;
    row.strokeRightWeight = 0;
    if (borderVariable !== undefined) {
      bindStrokeToVar(row, borderVariable);
    }
  }
  return row;
}

/** Re-assert Hug on a body cell after appendChild. */
export function reassertBodyCell(cell: FrameNode): void {
  reassertHug(cell);
}

/** Re-assert Hug on a body row after appendChild. */
export function reassertBodyRow(row: FrameNode): void {
  reassertHug(row, 'vertical');
}
