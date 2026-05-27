import { describe, expect, it } from 'vitest';

import { loadTypographySlots } from '@/core/canvas/data/loadCanvasData';
import {
  buildMockTypographyTextStyleIndex,
  countTypographyCategoryRows,
  countTypographySlotRows,
  projectTypographyRows,
} from '@/core/canvas/projectRows/typographyRows';

describe('typographyRows', () => {
  it('projects 27 slot rows and 5 category headers (32 total)', () => {
    const index = buildMockTypographyTextStyleIndex();
    const rows = projectTypographyRows(index);
    expect(countTypographySlotRows(rows)).toBe(27);
    expect(countTypographyCategoryRows(rows)).toBe(5);
    expect(rows.length).toBe(32);
  });

  it('orders categories Display → Label', () => {
    const rows = projectTypographyRows(buildMockTypographyTextStyleIndex());
    const labels = rows
      .filter(
        function (
          row,
        ): row is import('@/core/canvas/projectRows/typographyRows').TypographyCategoryRow {
          return row.type === 'category';
        },
      )
      .map(function (row) {
        return row.label;
      });
    expect(labels).toEqual(['Display', 'Headline', 'Title', 'Body', 'Label']);
  });

  it('maps body link variant fill semantics via row data', () => {
    const rows = projectTypographyRows(buildMockTypographyTextStyleIndex());
    const linkRow = rows.find(function (row) {
      return row.type === 'slot' && row.tokenPath === 'Body/MD/link';
    });
    expect(linkRow?.type).toBe('slot');
    if (linkRow?.type === 'slot') {
      expect(linkRow.variant).toBe('link');
      expect(linkRow.codeSyntax.WEB).toContain('body-md-link');
    }
    void loadTypographySlots();
  });
});
