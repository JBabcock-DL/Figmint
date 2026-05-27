import { beforeEach, describe, expect, it } from 'vitest';

import {
  createHorizontalUsageRow,
  createMatrixStateCell,
  stretchLabelInMatrixRow,
} from '@/core/canvas/helpers/matrixSpecimen';

import { installMockFigmaCanvas, MockFrame } from './__mocks__/figmaFrames';

describe('matrixSpecimen', () => {
  beforeEach(() => {
    installMockFigmaCanvas();
  });

  it('createMatrixStateCell uses counter AUTO and minHeight 72', () => {
    const cell = createMatrixStateCell(200);
    const mock = cell as unknown as MockFrame;
    expect(mock.layoutMode).toBe('HORIZONTAL');
    expect(mock.primaryAxisSizingMode).toBe('FIXED');
    expect(mock.counterAxisSizingMode).toBe('AUTO');
    expect(mock.minHeight).toBe(72);
  });

  it('createHorizontalUsageRow uses counter AUTO', () => {
    const row = createHorizontalUsageRow(800);
    const mock = row as unknown as MockFrame;
    expect(mock.layoutMode).toBe('HORIZONTAL');
    expect(mock.counterAxisSizingMode).toBe('AUTO');
    expect(mock.width).toBe(800);
  });

  it('stretchLabelInMatrixRow sets layoutAlign STRETCH', () => {
    const label = createMatrixStateCell(120);
    stretchLabelInMatrixRow(label);
    expect((label as unknown as MockFrame).layoutAlign).toBe('STRETCH');
  });
});
