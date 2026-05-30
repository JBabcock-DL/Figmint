import { describe, expect, it } from 'vitest';

import { selectionSummary } from '@/core/handoff/selectionSummary';

describe('selectionSummary', () => {
  it('returns count and up to five names', function () {
    const summary = selectionSummary([
      { name: 'A' },
      { name: 'B' },
      { name: 'C' },
      { name: 'D' },
      { name: 'E' },
      { name: 'F' },
      { name: 'G' },
    ]);

    expect(summary.count).toBe(7);
    expect(summary.names).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('returns all names when selection is smaller than five', function () {
    const summary = selectionSummary([{ name: 'Checkout' }]);
    expect(summary).toEqual({ count: 1, names: ['Checkout'] });
  });
});
