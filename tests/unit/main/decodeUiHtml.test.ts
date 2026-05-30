import { describe, expect, it } from 'vitest';

import { decodeBase64Utf8 } from '@/main/decodeUiHtml';

describe('decodeBase64Utf8', () => {
  it('returns empty string for empty input', () => {
    expect(decodeBase64Utf8('')).toBe('');
  });

  it('round-trips utf-8 html', () => {
    const html = '<!doctype html><html><body><div id="root">FigHub</div></body></html>';
    const encoded = Buffer.from(html, 'utf8').toString('base64');
    expect(decodeBase64Utf8(encoded)).toBe(html);
  });

  it('preserves unicode UI copy without TextDecoder', () => {
    const html =
      '<script>var s="Connected · scope=repo → Commit";</script>';
    const encoded = Buffer.from(html, 'utf8').toString('base64');
    const originalDecoder = globalThis.TextDecoder;
    // @ts-expect-error simulate Figma main QuickJS
    delete globalThis.TextDecoder;
    try {
      expect(decodeBase64Utf8(encoded)).toBe(html);
    } finally {
      globalThis.TextDecoder = originalDecoder;
    }
  });
});
