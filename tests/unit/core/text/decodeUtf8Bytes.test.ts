import { describe, expect, it } from 'vitest';

import { decodeUtf8Bytes } from '@/core/text/decodeUtf8Bytes';

describe('decodeUtf8Bytes', () => {
  it('decodes middle dot and arrow without TextDecoder', () => {
    const text = 'Connected · scope=repo → Commit → Push';
    const bytes = new Uint8Array([...Buffer.from(text, 'utf8')]);

    const originalDecoder = globalThis.TextDecoder;
    // @ts-expect-error simulate Figma main QuickJS
    delete globalThis.TextDecoder;

    try {
      expect(decodeUtf8Bytes(bytes)).toBe(text);
    } finally {
      globalThis.TextDecoder = originalDecoder;
    }
  });

  it('decodes em dash and ellipsis', () => {
    const text = 'Not detected — using defaults · Detecting…';
    const bytes = new Uint8Array([...Buffer.from(text, 'utf8')]);

    const originalDecoder = globalThis.TextDecoder;
    // @ts-expect-error simulate Figma main QuickJS
    delete globalThis.TextDecoder;

    try {
      expect(decodeUtf8Bytes(bytes)).toBe(text);
    } finally {
      globalThis.TextDecoder = originalDecoder;
    }
  });
});
