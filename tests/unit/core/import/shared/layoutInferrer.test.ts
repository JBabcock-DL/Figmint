import { describe, expect, it } from 'vitest';

import { inferLayoutFromSource } from '@/core/import';

describe('layoutInferrer stub', () => {
  it('returns default horizontal hug layout', () => {
    const layout = inferLayoutFromSource({ sourceText: 'export function X() {}' });
    expect(layout.direction).toBe('horizontal');
    expect(layout.gap).toBe('8');
    expect(layout.sizing.horizontal).toBe('hug');
    expect(layout.sizing.vertical).toBe('hug');
  });
});
