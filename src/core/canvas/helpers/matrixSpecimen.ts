import { createHugFrame } from './autoLayout';

const MATRIX_STATE_CELL_MIN_HEIGHT = 72;

/**
 * §10 state cell — HORIZONTAL, primary FIXED, counter AUTO + minHeight 72.
 */
export function createMatrixStateCell(colWidth: number, minHeight?: number): FrameNode {
  const cell = createHugFrame({
    layoutMode: 'HORIZONTAL',
    width: colWidth,
    height: 1,
  });
  cell.primaryAxisSizingMode = 'FIXED';
  cell.counterAxisSizingMode = 'AUTO';
  const min = minHeight !== undefined ? minHeight : MATRIX_STATE_CELL_MIN_HEIGHT;
  cell.minHeight = min;
  return cell;
}

/**
 * §10.2 Do/Don't usage row — HORIZONTAL with counter AUTO.
 */
export function createHorizontalUsageRow(width: number): FrameNode {
  return createHugFrame({
    layoutMode: 'HORIZONTAL',
    width: width,
    height: 1,
  });
}

/**
 * §10 row-label — stretch label frame to track row height when specimens grow.
 */
export function stretchLabelInMatrixRow(labelFrame: FrameNode): void {
  labelFrame.layoutAlign = 'STRETCH';
}
