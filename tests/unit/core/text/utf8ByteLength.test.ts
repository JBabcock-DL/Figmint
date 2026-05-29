import { describe, expect, it, vi } from 'vitest';

import { utf8ByteLength } from '@/core/text/utf8ByteLength';

describe('utf8ByteLength', () => {
  it('matches TextEncoder when available', () => {
    expect(utf8ByteLength('hello')).toBe(5);
    expect(utf8ByteLength('café')).toBe(5);
  });

  it('works when TextEncoder is missing', () => {
    const original = globalThis.TextEncoder;
    vi.stubGlobal('TextEncoder', undefined);
    try {
      expect(utf8ByteLength('hello')).toBe(5);
      expect(utf8ByteLength('café')).toBe(5);
    } finally {
      vi.stubGlobal('TextEncoder', original);
    }
  });
});
