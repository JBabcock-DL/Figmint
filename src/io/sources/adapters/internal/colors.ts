import type { ColorValue } from '@detroitlabs/fighub-contracts';

const HEX_COLOR = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR =
  /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)(?:\s*,\s*([\d.]+%?))?\s*\)$/;

function parseColorComponent(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    return Math.min(1, Math.max(0, Number.parseFloat(trimmed) / 100));
  }
  const numeric = Number.parseFloat(trimmed);
  return numeric > 1 ? numeric / 255 : numeric;
}

export function parseHexColor(input: string): ColorValue | null {
  const match = HEX_COLOR.exec(input.trim());
  if (!match) {
    return null;
  }
  const hex = match[1];
  if (hex.length === 3 || hex.length === 4) {
    const r = Number.parseInt(hex[0] + hex[0], 16) / 255;
    const g = Number.parseInt(hex[1] + hex[1], 16) / 255;
    const b = Number.parseInt(hex[2] + hex[2], 16) / 255;
    const a = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1;
    return { r, g, b, a };
  }
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function parseRgbColor(input: string): ColorValue | null {
  const match = RGB_COLOR.exec(input.trim());
  if (!match) {
    return null;
  }
  return {
    r: parseColorComponent(match[1]),
    g: parseColorComponent(match[2]),
    b: parseColorComponent(match[3]),
    a: match[4] ? parseColorComponent(match[4]) : 1,
  };
}

export function parseColorLiteral(input: string): ColorValue | null {
  return parseHexColor(input) ?? parseRgbColor(input);
}

export function isColorValue(value: unknown): value is ColorValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.r === 'number' &&
    typeof obj.g === 'number' &&
    typeof obj.b === 'number' &&
    typeof obj.a === 'number'
  );
}

export function parseDimension(value: string): number | null {
  const trimmed = value.trim();
  const pxMatch = /^(-?[\d.]+)px$/.exec(trimmed);
  if (pxMatch) {
    return Number.parseFloat(pxMatch[1]);
  }
  const remMatch = /^(-?[\d.]+)rem$/.exec(trimmed);
  if (remMatch) {
    return Number.parseFloat(remMatch[1]) * 16;
  }
  const numeric = Number.parseFloat(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}
