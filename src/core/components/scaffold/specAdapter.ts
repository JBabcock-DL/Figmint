import type { ComponentSpecLayoutArchetype, ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { fnv1a32Hex } from './variantMatrix';
import type { ScaffoldBuildContext, ScaffoldOptions, VariantCombo } from './types';
import { createScaffoldContext } from './context';

const DEFAULT_SPACING = { padH: 16, padV: 8, gap: 8, iconSize: 18 };

function hexToRgb(hex: string): RGB {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

function hashHexToRgb(seed: string): RGB {
  const hex = (parseInt(fnv1a32Hex(seed), 16) & 0xffffff).toString(16).padStart(6, '0');
  return hexToRgb(hex);
}

function parseNumericToken(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const trimmed = value.trim();
  if (trimmed.endsWith('px')) {
    const parsed = parseInt(trimmed.slice(0, -2), 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function findVariantAxisKey(spec: ComponentSpecV1): string | null {
  const keys = Object.keys(spec.variantMatrix).sort();
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === 'variant') {
      return 'variant';
    }
  }
  for (let i = 0; i < keys.length; i++) {
    const values = spec.variantMatrix[keys[i]];
    if (values.length > 0 && typeof values[0] === 'string') {
      return keys[i];
    }
  }
  return keys.length > 0 ? keys[0] : null;
}

export function inferArchetype(spec: ComponentSpecV1): ComponentSpecLayoutArchetype {
  if (spec.archetype !== undefined) {
    return spec.archetype;
  }
  if (spec.composes !== undefined && spec.composes.length > 0) {
    return 'chip';
  }
  if (spec.control !== undefined) {
    return 'control';
  }
  if (spec.field !== undefined) {
    return 'field';
  }
  if (spec.container !== undefined) {
    return 'container';
  }
  if (spec.tiny !== undefined) {
    return 'tiny';
  }
  if (spec.row !== undefined) {
    return 'row-item';
  }
  if (spec.surface !== undefined) {
    return 'surface-stack';
  }
  return 'chip';
}

export function resolveArchetypeRoute(
  spec: ComponentSpecV1,
): 'composed' | ComponentSpecLayoutArchetype {
  if (spec.composes !== undefined && spec.composes.length > 0) {
    return 'composed';
  }
  if (spec.archetype !== undefined) {
    return spec.archetype;
  }
  return inferArchetype(spec);
}

export function buildStyleByVariantKey(
  spec: ComponentSpecV1,
  ctx: ScaffoldBuildContext,
): Record<string, { fill: RGB; text: RGB }> {
  const styleMap: Record<string, { fill: RGB; text: RGB }> = {};
  const axisKey = findVariantAxisKey(spec);
  if (axisKey === null) {
    styleMap.default = { fill: ctx.fills.primary, text: ctx.fills.onPrimary };
    return styleMap;
  }
  const values = spec.variantMatrix[axisKey];
  for (let i = 0; i < values.length; i++) {
    const raw = values[i];
    const key = typeof raw === 'boolean' ? (raw ? 'true' : 'false') : String(raw);
    styleMap[key] = {
      fill: hashHexToRgb(spec.name + ':' + axisKey + ':' + key),
      text: ctx.fills.onPrimary,
    };
  }
  return styleMap;
}

export function projectBuildContext(
  spec: ComponentSpecV1,
  combo: VariantCombo,
  variantName: string,
  options?: ScaffoldOptions,
): ScaffoldBuildContext {
  const displayTitle =
    options !== undefined && options.displayTitle !== undefined
      ? options.displayTitle
      : spec.name;
  const ctx = createScaffoldContext(spec, combo, variantName, options);
  ctx.displayTitle = displayTitle;
  ctx.spacing.gap = parseNumericToken(spec.layout.gap, DEFAULT_SPACING.gap);
  ctx.spacing.padH = parseNumericToken(spec.layout.padding, DEFAULT_SPACING.padH);
  ctx.spacing.padV = parseNumericToken(spec.layout.padding, DEFAULT_SPACING.padV);
  if (spec.iconSlots !== undefined && spec.iconSlots.size !== undefined) {
    ctx.spacing.iconSize = spec.iconSlots.size;
  }
  ctx.styleByVariantKey = buildStyleByVariantKey(spec, ctx);
  if (options !== undefined && options.registry !== undefined) {
    ctx.registry = options.registry;
  }
  return ctx;
}
