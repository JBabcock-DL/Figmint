import { loadTypographySlots, type TypographyBodyVariant } from '@/core/canvas/data/loadCanvasData';
import type { VariablePathMap } from '@/core/canvas/lib/variables';
import { resolvePath } from '@/core/canvas/lib/variables';
import { pluginLog } from '@/core/pluginLog';

export const DOC_STYLE_TOKEN_PREFIX: Record<string, string> = {
  '_Doc/Section': 'Headline/LG',
  '_Doc/TokenName': 'Label/LG',
  '_Doc/Code': 'Label/SM',
  '_Doc/Caption': 'Body/SM',
};

export interface SlotBindingTarget {
  tokenPrefix: string;
  weightPath: string;
  variant: BodyVariantKind | null;
}

export type BodyVariantKind = 'regular' | 'emphasis' | 'italic' | 'link' | 'strikethrough';

const BODY_VARIANTS = new Set<string>(['regular', 'emphasis', 'italic', 'link', 'strikethrough']);

/** Map a published text-style name to Typography variable paths (mode 100). */
export function resolveSlotBindingTarget(styleName: string): SlotBindingTarget {
  const parts = styleName.split('/');
  if (parts[0] === 'Body' && parts.length >= 3) {
    const variantRaw = parts[2].toLowerCase();
    if (BODY_VARIANTS.has(variantRaw)) {
      const variant = variantRaw as BodyVariantKind;
      const prefix = parts[0] + '/' + parts[1];
      const weightPath = variant === 'emphasis' ? 'font/weight/medium' : prefix + '/font-weight';
      return { tokenPrefix: prefix, weightPath: weightPath, variant: variant };
    }
  }
  return {
    tokenPrefix: styleName,
    weightPath: styleName + '/font-weight',
    variant: null,
  };
}

export interface TypographyBindingContext {
  variableMap: VariablePathMap;
  variableById: Record<string, Variable>;
  collectionsById: Record<string, VariableCollection>;
  typographyModeId: string;
}

function isVariableAlias(value: unknown): value is VariableAlias {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as VariableAlias).type === 'VARIABLE_ALIAS'
  );
}

function modeIdForCollection(collection: VariableCollection, typographyModeId: string): string {
  if (collection.name === 'Typography') {
    for (let i = 0; i < collection.modes.length; i++) {
      if (collection.modes[i].name === '100') {
        return collection.modes[i].modeId;
      }
    }
    return typographyModeId;
  }
  for (let i = 0; i < collection.modes.length; i++) {
    if (collection.modes[i].name === 'Default') {
      return collection.modes[i].modeId;
    }
  }
  if (collection.modes.length > 0) {
    return collection.modes[0].modeId;
  }
  return typographyModeId;
}

export function resolveVariableValueAtTypography100(
  variable: Variable,
  ctx: TypographyBindingContext,
  depth?: number,
): unknown {
  const maxDepth = depth !== undefined ? depth : 0;
  if (maxDepth > 24) {
    return null;
  }
  const collection = ctx.collectionsById[variable.variableCollectionId];
  if (collection === undefined) {
    return null;
  }
  const modeId = modeIdForCollection(collection, ctx.typographyModeId);
  const raw = variable.valuesByMode[modeId];
  if (isVariableAlias(raw)) {
    const target = ctx.variableById[raw.id];
    if (target === undefined) {
      return null;
    }
    return resolveVariableValueAtTypography100(target, ctx, maxDepth + 1);
  }
  return raw;
}

function findBodyVariantRule(variant: BodyVariantKind): TypographyBodyVariant | null {
  const data = loadTypographySlots();
  for (let i = 0; i < data.bodyVariants.variants.length; i++) {
    if (data.bodyVariants.variants[i].variant === variant) {
      return data.bodyVariants.variants[i];
    }
  }
  return null;
}

function fontStyleForWeight(weight: number, variant: BodyVariantKind | null): string {
  if (variant === 'emphasis') {
    return 'Medium';
  }
  if (variant === 'italic') {
    return 'Italic';
  }
  if (weight >= 600) {
    return 'Bold';
  }
  if (weight >= 500) {
    return 'Medium';
  }
  return 'Regular';
}

function tryBind(
  style: TextStyle,
  field: VariableBindableTextField,
  variable: Variable | null,
): boolean {
  if (variable === null) {
    return false;
  }
  try {
    style.setBoundVariable(field, variable);
    return true;
  } catch (error) {
    pluginLog('[publishTypographyStyles] bind failed', field, variable.name, error);
    return false;
  }
}

async function loadFontForStyle(family: string, styleName: string): Promise<void> {
  try {
    await figma.loadFontAsync({ family: family, style: styleName });
  } catch {
    try {
      await figma.loadFontAsync({ family: family, style: 'Regular' });
    } catch {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    }
  }
}

export async function buildTypographyBindingContext(): Promise<TypographyBindingContext | null> {
  const allVars = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  let typographyModeId: string | null = null;
  const collectionsById: Record<string, VariableCollection> = {};
  for (let ci = 0; ci < collections.length; ci++) {
    const collection = collections[ci];
    collectionsById[collection.id] = collection;
    if (collection.name === 'Typography') {
      for (let mi = 0; mi < collection.modes.length; mi++) {
        if (collection.modes[mi].name === '100') {
          typographyModeId = collection.modes[mi].modeId;
          break;
        }
      }
    }
  }

  if (typographyModeId === null) {
    pluginLog('[publishTypographyStyles] Typography mode 100 not found — skipping variable binds');
    return null;
  }

  const variableMap: VariablePathMap = {};
  const variableById: Record<string, Variable> = {};
  for (let vi = 0; vi < allVars.length; vi++) {
    const variable = allVars[vi];
    variableMap[variable.name] = variable;
    variableById[variable.id] = variable;
  }

  return {
    variableMap: variableMap,
    variableById: variableById,
    collectionsById: collectionsById,
    typographyModeId: typographyModeId,
  };
}

export async function applyTypographyVariableBindings(
  style: TextStyle,
  target: SlotBindingTarget,
  ctx: TypographyBindingContext,
): Promise<void> {
  const prefix = target.tokenPrefix;
  const familyVar = resolvePath(ctx.variableMap, prefix + '/font-family');
  const sizeVar = resolvePath(ctx.variableMap, prefix + '/font-size');
  const lineVar = resolvePath(ctx.variableMap, prefix + '/line-height');
  const weightVar = resolvePath(ctx.variableMap, target.weightPath);

  tryBind(style, 'fontFamily', familyVar);
  tryBind(style, 'fontSize', sizeVar);
  tryBind(style, 'fontWeight', weightVar);
  tryBind(style, 'lineHeight', lineVar);

  const resolvedFamily =
    familyVar !== null ? resolveVariableValueAtTypography100(familyVar, ctx) : null;
  const resolvedSize = sizeVar !== null ? resolveVariableValueAtTypography100(sizeVar, ctx) : null;
  const resolvedWeight =
    weightVar !== null ? resolveVariableValueAtTypography100(weightVar, ctx) : null;
  const resolvedLine = lineVar !== null ? resolveVariableValueAtTypography100(lineVar, ctx) : null;

  const family =
    typeof resolvedFamily === 'string' && resolvedFamily !== '' ? resolvedFamily : 'Inter';
  const weight =
    typeof resolvedWeight === 'number' ? resolvedWeight : target.variant === 'emphasis' ? 500 : 400;
  const fontStyle = fontStyleForWeight(weight, target.variant);

  await loadFontForStyle(family, fontStyle);
  style.fontName = { family: family, style: fontStyle };

  if (typeof resolvedSize === 'number') {
    style.fontSize = resolvedSize;
  }
  if (typeof resolvedLine === 'number') {
    style.lineHeight = { unit: 'PIXELS', value: resolvedLine };
  } else if (typeof resolvedSize === 'number') {
    style.lineHeight = { unit: 'AUTO' };
  }

  style.textDecoration = 'NONE';
  if (target.variant !== null) {
    const rule = findBodyVariantRule(target.variant);
    if (rule !== null) {
      if (rule.textDecoration === 'UNDERLINE') {
        style.textDecoration = 'UNDERLINE';
      } else if (rule.textDecoration === 'STRIKETHROUGH') {
        style.textDecoration = 'STRIKETHROUGH';
      }
      if (rule.fontNameStyle === 'Italic') {
        await loadFontForStyle(family, 'Italic');
        style.fontName = { family: family, style: 'Italic' };
      } else if (rule.fontNameStyle === 'Medium') {
        await loadFontForStyle(family, 'Medium');
        style.fontName = { family: family, style: 'Medium' };
      }
    }
  }
}
