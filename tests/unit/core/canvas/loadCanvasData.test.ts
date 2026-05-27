import { describe, expect, it } from 'vitest';

import {
  listExpectedSlotStyleNames,
  loadPlatformMappingRows,
  loadTypographySlots,
} from '@/core/canvas/data/loadCanvasData';

describe('loadCanvasData', () => {
  it('loads 15 base typography slots', () => {
    const data = loadTypographySlots();
    expect(data.baseSlots.length).toBe(15);
    expect(data.baseMode).toBe('100');
  });

  it('derives 27 expected slot style names', () => {
    const names = listExpectedSlotStyleNames();
    expect(names.length).toBe(27);
    expect(names).toContain('Display/LG');
    expect(names).toContain('Body/MD/link');
  });

  it('loads at least 22 platform-mapping rows', () => {
    const data = loadPlatformMappingRows();
    expect(data.rows.length).toBeGreaterThanOrEqual(22);
    expect(data.rows[0].collection).toBe('Theme');
  });
});
