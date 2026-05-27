import type { ColorValue } from '@detroitlabs/figmint-contracts';

export interface RgbUnit {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/** Port of legacy runner `colorToHex` — #RRGGBB from 0..1 RGBA. */
export function colorToHex(color: ColorValue | RgbUnit | null | undefined): string {
  if (color === null || color === undefined) {
    return '#000000';
  }
  if (typeof color !== 'object' || typeof color.r !== 'number') {
    return '#000000';
  }
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return (
    '#' +
    [r, g, b]
      .map(function (x) {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

/**
 * CSS HSL string; appends "/ alpha%" for RGBA tokens (state overlays, scrims).
 * Returns null when alpha is fully opaque (legacy omits HSL stack for opaque tokens).
 */
export function colorToHsl(color: ColorValue | RgbUnit | null | undefined): string | null {
  if (color === null || color === undefined) {
    return null;
  }
  if (typeof color !== 'object' || typeof color.r !== 'number') {
    return null;
  }
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a !== undefined && color.a < 0.9999 ? color.a : 1;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }
  const hD = Math.round(h * 360);
  const sP = Math.round(s * 100);
  const lP = Math.round(l * 100);
  if (a < 0.9999) {
    return (
      'hsl(' +
      String(hD) +
      ' ' +
      String(sP) +
      '% ' +
      String(lP) +
      '% / ' +
      String(Math.round(a * 100)) +
      '%)'
    );
  }
  return 'hsl(' + String(hD) + ' ' + String(sP) + '% ' + String(lP) + '%)';
}

/** 0..1 RGBA for fallback fills when variable bind is unavailable. */
export function hexToRgb(hex: string | null | undefined): RGB {
  if (hex === null || hex === undefined || hex === '') {
    return { r: 0.9, g: 0.9, b: 0.9 };
  }
  const clean = String(hex).replace('#', '');
  const int = parseInt(clean, 16);
  if (Number.isNaN(int)) {
    return { r: 0.9, g: 0.9, b: 0.9 };
  }
  return {
    r: ((int >> 16) & 255) / 255,
    g: ((int >> 8) & 255) / 255,
    b: (int & 255) / 255,
  };
}

export function isColorValue(value: unknown): value is ColorValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.r === 'number' && typeof record.g === 'number' && typeof record.b === 'number'
  );
}
