import { describe, expect, it } from 'vitest';

import {
  COLUMN_TABLE_KEYS,
  getColumnSpec,
  getColumnWidth,
  validateColumnWidths,
} from '@/core/canvas/helpers/columnSpec';
import { TABLE_WIDTH } from '@/core/canvas/constants';

describe('columnSpec', () => {
  it('exposes all 13 table profiles', () => {
    expect(COLUMN_TABLE_KEYS.length).toBe(13);
  });

  it('validates every profile sums to 1640', () => {
    for (const key of COLUMN_TABLE_KEYS) {
      const columns = getColumnSpec(key);
      expect(() => {
        validateColumnWidths(columns);
      }).not.toThrow();
      let sum = 0;
      for (const col of columns) {
        sum += col.width;
      }
      expect(sum).toBe(TABLE_WIDTH);
    }
  });

  it('throws when column widths do not sum to target', () => {
    expect(() => {
      validateColumnWidths([{ id: 'A', width: 100 }]);
    }).toThrow(/Column widths sum to 100, expected 1640/);
  });

  it('getColumnWidth returns width for known column id', () => {
    expect(getColumnWidth('primitives/color-ramp', 'TOKEN')).toBe(320);
  });
});
