import { describe, expect, it } from 'vitest';

import { attachConfidence } from '@/core/import/templates/react/attachConfidence';

describe('attachConfidence', () => {
  it('sets bindings low when unresolved tokens present', () => {
    const confidence = attachConfidence(['bg-muted/40'], 'high');
    expect(confidence.bindings).toBe('low');
    expect(confidence.unresolved).toEqual(['bg-muted/40']);
    expect(confidence.layout).toBe('high');
  });

  it('sets bindings high when all tokens resolved', () => {
    const confidence = attachConfidence([], 'high');
    expect(confidence.bindings).toBe('high');
    expect(confidence.unresolved).toBeUndefined();
  });
});
