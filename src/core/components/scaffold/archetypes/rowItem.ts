import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';

import { ensureScaffoldFonts } from '../context';
import type { ScaffoldBuildContext, VariantBuildResult } from '../types';
import { applyHexFill, createDashedIconSlot, createFocusRing, createStateLayer } from './shared';

const HEX_ROW_STROKE: RGB = { r: 0.898, g: 0.906, b: 0.922 };
const HEX_CONTENT: RGB = { r: 0.129, g: 0.129, b: 0.129 };
const HEX_CONTENT_MUTED: RGB = { r: 0.42, g: 0.447, b: 0.502 };

function readRowBool(row: Record<string, unknown>, key: string): boolean | undefined {
  const value = row[key];
  if (typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

function readRowString(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key];
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function readRowNumber(row: Record<string, unknown>, key: string): number | undefined {
  const value = row[key];
  if (typeof value === 'number') {
    return value;
  }
  return undefined;
}

function resolveShowLeading(row: Record<string, unknown>): boolean {
  const leadingIcon = readRowBool(row, 'leadingIcon');
  if (leadingIcon === false) {
    return false;
  }
  const leading = readRowBool(row, 'leading');
  if (leading === false) {
    return false;
  }
  return true;
}

function resolveShowTrailing(row: Record<string, unknown>): boolean {
  const trailingIcon = readRowBool(row, 'trailingIcon');
  if (trailingIcon === false) {
    return false;
  }
  const trailing = readRowBool(row, 'trailing');
  if (trailing === false) {
    return false;
  }
  return true;
}

function createSampleText(
  ctx: ScaffoldBuildContext,
  text: string,
  fontSize: number,
  color: RGB,
  name: string,
): TextNode {
  const node = figma.createText();
  node.name = name;
  node.fontName = { family: ctx.fonts.labelFamily, style: ctx.fonts.labelStyle };
  node.characters = text;
  node.fontSize = fontSize;
  node.textAutoResize = 'HEIGHT';
  applyHexFill(node, color);
  return node;
}

function applyCornerRadius(node: FrameNode | ComponentNode, radius: number): void {
  node.topLeftRadius = radius;
  node.topRightRadius = radius;
  node.bottomLeftRadius = radius;
  node.bottomRightRadius = radius;
}

export async function buildRowItemVariant(ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  await ensureScaffoldFonts(ctx);

  const row =
    ctx.spec.row !== undefined && ctx.spec.row !== null
      ? (ctx.spec.row as Record<string, unknown>)
      : {};

  const titleText = readRowString(row, 'titleText');
  const title = titleText !== undefined ? titleText : ctx.spec.name;
  const descText = readRowString(row, 'descriptionText');
  const showLeading = resolveShowLeading(row);
  const showTrailing = resolveShowTrailing(row);
  const showShortcut = readRowBool(row, 'shortcut') === true;
  const shortcutTextRaw = readRowString(row, 'shortcutText');
  const shortcutText = shortcutTextRaw !== undefined ? shortcutTextRaw : '⌘K';
  const rowWidth = readRowNumber(row, 'width');
  const width = rowWidth !== undefined ? rowWidth : 280;
  const trailingIsChevron = readRowBool(row, 'trailingIsChevron') === true;
  const stateRole = readRowString(row, 'stateRole');
  const strokeVarEnabled = readRowBool(row, 'stroke') === true;

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'HORIZONTAL';
  component.clipsContent = false;
  component.resize(width, 1);
  component.primaryAxisSizingMode = 'FIXED';
  component.counterAxisSizingMode = 'AUTO';
  component.layoutSizingHorizontal = 'FIXED';
  component.layoutSizingVertical = 'HUG';
  component.primaryAxisAlignItems = 'MIN';
  component.counterAxisAlignItems = 'CENTER';
  component.paddingLeft = ctx.spacing.padH !== 16 ? ctx.spacing.padH : 12;
  component.paddingRight = ctx.spacing.padH !== 16 ? ctx.spacing.padH : 12;
  component.paddingTop = 6;
  component.paddingBottom = 6;
  component.itemSpacing = ctx.spacing.gap !== 8 ? ctx.spacing.gap : 8;
  applyCornerRadius(component, 4);
  applyHexFill(component, ctx.fills.surface);

  if (strokeVarEnabled) {
    component.strokes = [
      {
        type: 'SOLID',
        color: { r: HEX_ROW_STROKE.r, g: HEX_ROW_STROKE.g, b: HEX_ROW_STROKE.b },
        opacity: 1,
      },
    ];
    component.strokeWeight = 1;
  }

  if (showLeading) {
    component.appendChild(createDashedIconSlot('icon-slot/leading', 16));
  }

  const textStack = figma.createFrame();
  textStack.name = 'row/text-stack';
  textStack.layoutMode = 'VERTICAL';
  textStack.primaryAxisSizingMode = 'AUTO';
  textStack.counterAxisSizingMode = 'AUTO';
  textStack.layoutGrow = 1;
  textStack.itemSpacing = 2;
  textStack.fills = [];
  textStack.appendChild(createSampleText(ctx, title, 14, HEX_CONTENT, 'row/title'));

  if (descText !== undefined && descText !== '') {
    textStack.appendChild(
      createSampleText(ctx, descText, 12, HEX_CONTENT_MUTED, 'row/description'),
    );
  }

  component.appendChild(textStack);

  if (showShortcut) {
    component.appendChild(
      createSampleText(ctx, shortcutText, 12, HEX_CONTENT_MUTED, 'row/shortcut'),
    );
  }

  if (showTrailing) {
    const trailingName = trailingIsChevron ? 'icon-slot/chevron' : 'icon-slot/trailing';
    component.appendChild(createDashedIconSlot(trailingName, 16));
  }

  if (stateRole !== undefined && stateRole !== '') {
    createStateLayer('hover', component);
    createStateLayer('pressed', component);
    createStateLayer('focus', component);
    createFocusRing(component);
  }

  if (component.height <= 2 && component.children.length > 0) {
    component.resize(width, 48);
    component.primaryAxisSizingMode = 'FIXED';
    component.counterAxisSizingMode = 'AUTO';
  }

  const violation = assertNoOnePxMaster(component as unknown as FrameNode);
  if (violation !== null) {
    component.resize(width, 48);
    component.primaryAxisSizingMode = 'FIXED';
    component.counterAxisSizingMode = 'AUTO';
  }

  return { component };
}
