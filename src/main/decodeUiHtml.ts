import { decodeUtf8Bytes } from '@/core/text/decodeUtf8Bytes';

/**
 * Decode base64 UI HTML injected at build time (`__HTML_B64__`).
 * ES2017-safe — no optional chaining.
 *
 * We base64-encode `dist/ui.html` before embedding in `code.js` because Figma's
 * QuickJS main-thread parser rejects the substring `import(` anywhere in the
 * plugin main file (including inside a showUI HTML string that bundles TypeScript).
 */
export function decodeBase64Utf8(base64: string): string {
  if (base64.length === 0) {
    return '';
  }

  var binary = atob(base64);
  var length = binary.length;
  var bytes = new Uint8Array(length);
  for (var i = 0; i < length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return decodeUtf8Bytes(bytes);
}
