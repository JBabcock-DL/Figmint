import type { ComponentSpecV1, RegistryV1 } from '@detroitlabs/fighub-contracts';

import type { ScaffoldBuildContext, ScaffoldOptions, VariantCombo } from './types';

function hexToRgb(hex: string): RGB {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

export const HEX_FALLBACK_PALETTE: {
  primary: RGB;
  onPrimary: RGB;
  surface: RGB;
  outline: RGB;
} = {
  primary: hexToRgb('#6750A4'),
  onPrimary: hexToRgb('#FFFFFF'),
  surface: hexToRgb('#FFFBFE'),
  outline: hexToRgb('#79747E'),
};

export function createScaffoldContext(
  spec: ComponentSpecV1,
  combo: VariantCombo,
  variantName: string,
  options?: ScaffoldOptions,
): ScaffoldBuildContext {
  const displayTitle =
    options !== undefined && options.displayTitle !== undefined ? options.displayTitle : spec.name;
  const ctx: ScaffoldBuildContext = {
    spec,
    displayTitle,
    combo,
    variantName,
    fills: {
      primary: HEX_FALLBACK_PALETTE.primary,
      onPrimary: HEX_FALLBACK_PALETTE.onPrimary,
      surface: HEX_FALLBACK_PALETTE.surface,
      outline: HEX_FALLBACK_PALETTE.outline,
    },
    spacing: { padH: 16, padV: 8, gap: 8, iconSize: 18 },
    fonts: { labelFamily: 'Inter', labelStyle: 'Medium' },
    styleByVariantKey: {},
  };
  ctx.styleByVariantKey = { default: { fill: ctx.fills.primary, text: ctx.fills.onPrimary } };
  return ctx;
}

export async function ensureScaffoldFonts(ctx: ScaffoldBuildContext): Promise<void> {
  await figma.loadFontAsync({ family: ctx.fonts.labelFamily, style: ctx.fonts.labelStyle });
}

export function resolveRegistryNodeId(
  registry: RegistryV1 | undefined,
  registryRef: string,
): string | null {
  if (registry === undefined) {
    return null;
  }
  const entry = registry.components[registryRef];
  if (entry === undefined) {
    return null;
  }
  return entry.nodeId;
}
