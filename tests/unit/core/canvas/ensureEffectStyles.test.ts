import { describe, expect, it } from 'vitest';

import { ensureEffectStyles } from '@/core/canvas/ensureEffectStyles';

describe('ensureEffectStyles', () => {
  it('reports missing tiers when catalog is empty', async () => {
    const result = await ensureEffectStyles({
      listStyles: function () {
        return Promise.resolve([]);
      },
    });
    expect(result.published).toEqual([]);
    expect(result.missing).toEqual([
      'Effect/shadow-sm',
      'Effect/shadow-md',
      'Effect/shadow-lg',
      'Effect/shadow-xl',
      'Effect/shadow-2xl',
    ]);
  });

  it('accepts fuzzy style name matches', async () => {
    const result = await ensureEffectStyles({
      listStyles: function () {
        return Promise.resolve([
          { id: '1', name: 'Effect/shadow-sm' },
          { id: '2', name: 'Effect/shadow-md' },
          { id: '3', name: 'Effect/shadow-lg' },
          { id: '4', name: 'Effect/shadow-xl' },
          { id: '5', name: 'Effect/shadow-2xl' },
        ]);
      },
    });
    expect(result.missing).toEqual([]);
    expect(result.published.length).toBe(5);
  });
});
