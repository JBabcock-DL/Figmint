import { bindPaintToVar, bindStrokeToVar } from '@/core/canvas/helpers/bindings';
import { reassertHug } from '@/core/canvas/helpers/autoLayout';
import { applyTableTextLayout } from '@/core/canvas/helpers/textCell';
import { hexToRgb } from '@/core/canvas/lib/colorFormats';
import { resolveTableChromeVariables } from '@/core/canvas/lib/docChromeVariables';
import { loadFontsForCanvas } from '@/core/canvas/lib/fonts';
import { resolveTableChrome, type BuildTableChrome } from '@/core/canvas/lib/table';
import type { VariablePathMap } from '@/core/canvas/lib/variables';

export const DOC_CHROME_FALLBACKS = {
  surface: '#f7f7f8',
  headerSurface: '#edecee',
  border: '#edecee',
  primaryText: '#0d0c0e',
  mutedText: '#49454f',
} as const;

export async function resolveDocPipelineChrome(
  variableMap: VariablePathMap,
): Promise<BuildTableChrome> {
  return resolveTableChrome(resolveTableChromeVariables(variableMap));
}

export function bindDocFrameFill(
  node: GeometryMixin & MinimalFillsMixin,
  variable: Variable | null,
  fallback: keyof typeof DOC_CHROME_FALLBACKS = 'surface',
): void {
  if (variable !== null) {
    bindPaintToVar(node, variable);
    return;
  }
  node.fills = [{ type: 'SOLID', color: hexToRgb(DOC_CHROME_FALLBACKS[fallback]) }];
}

export function bindDocFrameStroke(
  node: GeometryMixin & MinimalStrokesMixin,
  variable: Variable | null,
): void {
  node.strokes = [{ type: 'SOLID', color: hexToRgb(DOC_CHROME_FALLBACKS.border) }];
  node.strokeWeight = 1;
  if (variable !== null) {
    bindStrokeToVar(node, variable);
  }
}

export function bindDocTextFill(
  text: TextNode,
  variable: Variable | null,
  fallback: 'primaryText' | 'mutedText' = 'primaryText',
): void {
  if (variable !== null) {
    bindPaintToVar(text, variable);
    return;
  }
  text.fills = [{ type: 'SOLID', color: hexToRgb(DOC_CHROME_FALLBACKS[fallback]) }];
}

async function loadFontForTextStyleId(styleId: string): Promise<void> {
  const styles = await figma.getLocalTextStylesAsync();
  for (let i = 0; i < styles.length; i++) {
    if (styles[i].id !== styleId) {
      continue;
    }
    const fontName = styles[i].fontName;
    if (fontName === undefined || fontName === null) {
      await loadFontsForCanvas();
      return;
    }
    try {
      await figma.loadFontAsync({ family: fontName.family, style: fontName.style });
    } catch {
      try {
        await figma.loadFontAsync({ family: fontName.family, style: 'Regular' });
      } catch {
        await loadFontsForCanvas();
      }
    }
    return;
  }
}

export async function applyDocTextStyle(text: TextNode, styleId: string | null): Promise<void> {
  if (styleId === null || styleId === '') {
    return;
  }
  await loadFontForTextStyleId(styleId);
  try {
    text.textStyleId = styleId;
  } catch {
    /* style may be missing on scratch files */
  }
}

export interface AppendDocAutoHeightTextOptions {
  characters: string;
  name?: string;
  styleId: string | null;
  width: number;
  fillVar: Variable | null;
  fillFallback?: 'primaryText' | 'mutedText';
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT';
  layoutSizingHorizontal?: 'FILL' | 'HUG';
}

export async function createDocAutoHeightText(
  opts: AppendDocAutoHeightTextOptions,
): Promise<TextNode> {
  await loadFontsForCanvas();

  const text = figma.createText();
  if (opts.name !== undefined) {
    text.name = opts.name;
  }
  text.characters = String(opts.characters);
  await applyDocTextStyle(text, opts.styleId);
  text.textAutoResize = 'HEIGHT';
  text.resize(opts.width, 1);
  if (opts.textAlign !== undefined) {
    text.textAlignHorizontal = opts.textAlign;
  }
  bindDocTextFill(text, opts.fillVar, opts.fillFallback ?? 'primaryText');
  return text;
}

export function applyDocAutoHeightLayout(
  text: TextNode,
  layoutSizingHorizontal: 'FILL' | 'HUG' = 'FILL',
): void {
  applyTableTextLayout(text);
  if (layoutSizingHorizontal === 'HUG') {
    text.layoutSizingHorizontal = 'HUG';
  }
}

/** Re-apply Hug after appendChild resets AUTO sizing (§0.1). */
export function reassertDocHugFrame(frame: FrameNode): void {
  reassertHug(frame);
}

/**
 * Create doc text with `_Doc/*` styles + Documentation collection fills.
 * Appends to parent first, then sets auto-layout sizing so height resolves.
 */
export async function appendDocAutoHeightText(
  parent: FrameNode,
  opts: AppendDocAutoHeightTextOptions,
): Promise<TextNode> {
  const text = await createDocAutoHeightText(opts);
  parent.appendChild(text);
  applyDocAutoHeightLayout(text, opts.layoutSizingHorizontal ?? 'FILL');
  return text;
}

export function applyDocStrokeSides(
  node: FrameNode | ComponentSetNode,
  borderVar: Variable | null,
  sides: { top?: number; right?: number; bottom?: number; left?: number },
): void {
  bindDocFrameStroke(node, borderVar);
  node.strokeTopWeight = sides.top ?? 0;
  node.strokeRightWeight = sides.right ?? 0;
  node.strokeBottomWeight = sides.bottom ?? 0;
  node.strokeLeftWeight = sides.left ?? 0;
}
