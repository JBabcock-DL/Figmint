import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';

import { ensureScaffoldFonts } from '../context';
import type { ScaffoldBuildContext, VariantBuildResult } from '../types';
import { applyHexFill, createDashedIconSlot } from './shared';

function resolveVariantStyleKey(ctx: ScaffoldBuildContext): string {
  if (ctx.combo.variant !== undefined) {
    const raw = ctx.combo.variant;
    return typeof raw === 'boolean' ? (raw ? 'true' : 'false') : String(raw);
  }
  const keys = Object.keys(ctx.combo).sort();
  if (keys.length === 0) {
    return 'default';
  }
  const raw = ctx.combo[keys[0]];
  return typeof raw === 'boolean' ? (raw ? 'true' : 'false') : String(raw);
}

function resolveVariantStyle(ctx: ScaffoldBuildContext): { fill: RGB; text: RGB } {
  const key = resolveVariantStyleKey(ctx);
  const style = ctx.styleByVariantKey[key];
  if (style !== undefined) {
    return style;
  }
  const fallback = ctx.styleByVariantKey.default;
  if (fallback !== undefined) {
    return fallback;
  }
  return { fill: ctx.fills.primary, text: ctx.fills.onPrimary };
}

export async function buildChipVariant(ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  await ensureScaffoldFonts(ctx);

  const style = resolveVariantStyle(ctx);
  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisSizingMode = 'AUTO';
  component.counterAxisSizingMode = 'AUTO';
  component.layoutSizingHorizontal = 'HUG';
  component.layoutSizingVertical = 'HUG';
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';
  component.clipsContent = false;
  component.paddingLeft = ctx.spacing.padH;
  component.paddingRight = ctx.spacing.padH;
  component.paddingTop = ctx.spacing.padV;
  component.paddingBottom = ctx.spacing.padV;
  component.itemSpacing = ctx.spacing.gap;
  component.cornerRadius = 6;
  applyHexFill(component, style.fill);

  const iconSlots = ctx.spec.iconSlots;
  const leading = iconSlots !== undefined && iconSlots.leading === true;
  const trailing = iconSlots !== undefined && iconSlots.trailing === true;

  if (leading) {
    component.appendChild(createDashedIconSlot('icon-slot/leading', ctx.spacing.iconSize));
  }

  const label = figma.createText();
  label.name = 'text/label';
  label.fontName = { family: ctx.fonts.labelFamily, style: ctx.fonts.labelStyle };
  label.characters = ctx.spec.name;
  label.fontSize = 14;
  label.textAutoResize = 'HEIGHT';
  applyHexFill(label, style.text);
  component.appendChild(label);

  if (trailing) {
    component.appendChild(createDashedIconSlot('icon-slot/trailing', ctx.spacing.iconSize));
  }

  const stateHover = figma.createFrame();
  stateHover.name = 'state-layer/hover';
  stateHover.resize(1, 1);
  stateHover.visible = false;
  component.appendChild(stateHover);

  const focusRing = figma.createFrame();
  focusRing.name = 'focus-ring';
  focusRing.resize(1, 1);
  focusRing.visible = false;
  focusRing.strokes = [];
  component.appendChild(focusRing);

  if (component.height <= 2 && component.children.length > 0) {
    component.resize(Math.max(component.width, 48), 32);
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'AUTO';
  }

  const violation = assertNoOnePxMaster(component as unknown as FrameNode);
  if (violation !== null) {
    component.resize(component.width, 32);
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'AUTO';
  }

  return { component };
}
