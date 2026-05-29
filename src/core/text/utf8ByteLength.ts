/**
 * UTF-8 byte length without relying on TextEncoder (unavailable in Figma plugin main).
 */
export function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return unescape(encodeURIComponent(value)).length;
}
