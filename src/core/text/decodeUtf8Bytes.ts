/**
 * Decode UTF-8 bytes without TextDecoder (unavailable in Figma plugin main QuickJS).
 * Inverse of the encodeURIComponent/unescape trick used in utf8ByteLength.ts.
 */
export function decodeUtf8Bytes(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }

  var binary = '';
  for (var i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  try {
    return decodeURIComponent(escape(binary));
  } catch {
    return binary;
  }
}
