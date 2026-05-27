import { describe, expect, it } from 'vitest';

import { colorToHex, colorToHsl, hexToRgb, isColorValue } from '@/core/canvas/lib/colorFormats';

describe('colorFormats', () => {
  it('colorToHex converts #RRGGBB from 0..1 RGBA', () => {
    expect(colorToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe('#ff0000');
    expect(colorToHex({ r: 0, g: 1, b: 0, a: 1 })).toBe('#00ff00');
    expect(colorToHex({ r: 0.96, g: 0.96, b: 0.96, a: 1 })).toBe('#f5f5f5');
  });

  it('colorToHex returns #000000 for invalid input', () => {
    expect(colorToHex(null)).toBe('#000000');
    expect(colorToHex(undefined)).toBe('#000000');
  });

  it('colorToHsl emits alpha suffix for translucent colors', () => {
    const hsl = colorToHsl({ r: 0.2, g: 0.4, b: 0.8, a: 0.08 });
    expect(hsl).toMatch(/\/ 8%\)/);
  });

  it('colorToHsl returns opaque hsl without alpha segment', () => {
    const hsl = colorToHsl({ r: 0.2, g: 0.4, b: 0.8, a: 1 });
    expect(hsl).toMatch(/^hsl\(\d+ \d+% \d+%\)$/);
  });

  it('hexToRgb parses hex to 0..1 RGB', () => {
    const rgb = hexToRgb('#ff0000');
    expect(rgb.r).toBeCloseTo(1);
    expect(rgb.g).toBeCloseTo(0);
    expect(rgb.b).toBeCloseTo(0);
  });

  it('hexToRgb falls back for invalid hex', () => {
    const rgb = hexToRgb('not-a-color');
    expect(rgb.r).toBeCloseTo(0.9);
  });

  it('isColorValue discriminates color objects', () => {
    expect(isColorValue({ r: 1, g: 0, b: 0 })).toBe(true);
    expect(isColorValue('#fff')).toBe(false);
  });
});
