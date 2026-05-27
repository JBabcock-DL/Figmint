import { beforeEach, describe, expect, it } from 'vitest';

import { TABLE_HEADER_HEIGHT, TABLE_ROW_MIN_HEIGHT, TABLE_WIDTH } from '@/core/canvas/constants';
import {
  assertHeaderCellGeometry,
  createBodyCell,
  createBodyRow,
  createHeaderCell,
  reassertBodyCell,
} from '@/core/canvas';
import { asFrameNode, installMockFigmaCanvas, MockFrame } from './__mocks__/figmaFrames';

describe('tableCells', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
  });

  it('createHeaderCell uses FIXED/FIXED and TABLE_HEADER_HEIGHT 56', () => {
    const cell = createHeaderCell(320, 'TOKEN', 'TOKEN');
    const mock = cell as unknown as MockFrame;
    expect(mock.layoutMode).toBe('HORIZONTAL');
    expect(mock.primaryAxisSizingMode).toBe('FIXED');
    expect(mock.counterAxisSizingMode).toBe('FIXED');
    expect(mock.height).toBe(TABLE_HEADER_HEIGHT);
    expect(mock.width).toBe(320);
    expect(mock.name).toBe('header/cell/TOKEN');
    expect(() => {
      assertHeaderCellGeometry(cell);
    }).not.toThrow();
  });

  it('createBodyCell VERTICAL uses AUTO primary and FIXED counter', () => {
    const cell = createBodyCell(140, 'VERTICAL', 'LIGHT');
    const mock = cell as unknown as MockFrame;
    expect(mock.layoutMode).toBe('VERTICAL');
    expect(mock.primaryAxisSizingMode).toBe('AUTO');
    expect(mock.counterAxisSizingMode).toBe('FIXED');
    expect(mock.width).toBe(140);
  });

  it('createBodyCell HORIZONTAL inverts axes (FIXED primary, AUTO counter)', () => {
    const cell = createBodyCell(140, 'HORIZONTAL', 'DARK');
    const mock = cell as unknown as MockFrame;
    expect(mock.layoutMode).toBe('HORIZONTAL');
    expect(mock.primaryAxisSizingMode).toBe('FIXED');
    expect(mock.counterAxisSizingMode).toBe('AUTO');
  });

  it('reassertBodyCell restores Hug after appendChild reset', () => {
    const cell = createBodyCell(200, 'VERTICAL', 'TOKEN');
    const mock = cell as unknown as MockFrame;
    const child = asFrameNode(new MockFrame());
    cell.appendChild(child);
    expect(mock.counterAxisSizingMode).toBe('FIXED');
    reassertBodyCell(cell);
    expect(mock.primaryAxisSizingMode).toBe('AUTO');
    expect(mock.counterAxisSizingMode).toBe('FIXED');
    expect(mock.layoutSizingVertical).toBe('HUG');
  });

  it('createBodyRow sets minHeight 64 and TABLE_WIDTH', () => {
    const row = createBodyRow('color/primary/500', null);
    const mock = row as unknown as MockFrame;
    expect(mock.layoutMode).toBe('HORIZONTAL');
    expect(mock.minHeight).toBe(TABLE_ROW_MIN_HEIGHT);
    expect(mock.width).toBe(TABLE_WIDTH);
    expect(mock.name).toBe('row/color/primary/500');
    expect(mock.strokes).toEqual([]);
  });
});
