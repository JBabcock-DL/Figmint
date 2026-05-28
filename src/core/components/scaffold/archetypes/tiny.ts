import { assertNoOnePxMaster } from '@/core/canvas/helpers/autoLayout';

import { ensureScaffoldFonts } from '../context';
import type { ScaffoldBuildContext, VariantBuildResult } from '../types';
import { applyHexFill } from './shared';

const HEX_BORDER: RGB = { r: 0.898, g: 0.906, b: 0.922 };
const HEX_VARIANT: RGB = { r: 0.957, g: 0.957, b: 0.961 };
const HEX_SPINNER_STROKE: RGB = { r: 0.831, g: 0.831, b: 0.847 };
const HEX_PRIMARY: RGB = { r: 0.102, g: 0.102, b: 0.102 };
const HEX_CONTENT_MUTED: RGB = { r: 0.42, g: 0.447, b: 0.502 };

type TinyShape =
  | 'separator'
  | 'skeleton'
  | 'spinner'
  | 'progress'
  | 'avatar'
  | 'aspect-ratio'
  | 'scroll-area';

function readTinyString(tiny: Record<string, unknown>, key: string): string | undefined {
  const value = tiny[key];
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function readTinyNumber(tiny: Record<string, unknown>, key: string): number | undefined {
  const value = tiny[key];
  if (typeof value === 'number') {
    return value;
  }
  return undefined;
}

function applyCornerRadius(node: FrameNode | ComponentNode, radius: number): void {
  node.topLeftRadius = radius;
  node.topRightRadius = radius;
  node.bottomLeftRadius = radius;
  node.bottomRightRadius = radius;
}

function resolveShape(tiny: Record<string, unknown>): TinyShape {
  const shape = readTinyString(tiny, 'shape');
  if (shape === 'separator') {
    return 'separator';
  }
  if (shape === 'skeleton') {
    return 'skeleton';
  }
  if (shape === 'spinner') {
    return 'spinner';
  }
  if (shape === 'progress') {
    return 'progress';
  }
  if (shape === 'avatar') {
    return 'avatar';
  }
  if (shape === 'aspect-ratio') {
    return 'aspect-ratio';
  }
  if (shape === 'scroll-area') {
    return 'scroll-area';
  }
  return 'skeleton';
}

function buildSeparator(
  ctx: ScaffoldBuildContext,
  tiny: Record<string, unknown>,
): ComponentNode {
  const orientation = readTinyString(tiny, 'orientation');
  const isVertical = orientation === 'vertical';
  const widthRaw = readTinyNumber(tiny, 'width');
  const heightRaw = readTinyNumber(tiny, 'height');
  const width = widthRaw !== undefined ? widthRaw : isVertical ? 1 : 240;
  const height = heightRaw !== undefined ? heightRaw : isVertical ? 120 : 1;

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'NONE';
  component.resize(width, height);
  applyHexFill(component, HEX_BORDER);
  return component;
}

function buildSkeleton(
  ctx: ScaffoldBuildContext,
  tiny: Record<string, unknown>,
): ComponentNode {
  const widthRaw = readTinyNumber(tiny, 'width');
  const heightRaw = readTinyNumber(tiny, 'height');
  const width = widthRaw !== undefined ? widthRaw : 200;
  const height = heightRaw !== undefined ? heightRaw : 16;

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'NONE';
  component.resize(width, height);
  applyHexFill(component, HEX_VARIANT);
  applyCornerRadius(component, 6);
  return component;
}

function buildSpinner(
  ctx: ScaffoldBuildContext,
  tiny: Record<string, unknown>,
): ComponentNode {
  const sizeRaw = readTinyNumber(tiny, 'size');
  const size = sizeRaw !== undefined ? sizeRaw : 24;

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'NONE';
  component.resize(size, size);
  component.fills = [];
  component.strokes = [
    {
      type: 'SOLID',
      color: { r: HEX_SPINNER_STROKE.r, g: HEX_SPINNER_STROKE.g, b: HEX_SPINNER_STROKE.b },
      opacity: 1,
    },
  ];
  component.strokeWeight = 2;
  component.cornerRadius = size / 2;
  return component;
}

function buildProgress(
  ctx: ScaffoldBuildContext,
  tiny: Record<string, unknown>,
): ComponentNode {
  const widthRaw = readTinyNumber(tiny, 'width');
  const heightRaw = readTinyNumber(tiny, 'height');
  const filledRaw = readTinyNumber(tiny, 'filled');
  const width = widthRaw !== undefined ? widthRaw : 280;
  const height = heightRaw !== undefined ? heightRaw : 8;
  const filled = filledRaw !== undefined ? Math.max(0, Math.min(1, filledRaw)) : 0.4;

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisSizingMode = 'FIXED';
  component.counterAxisSizingMode = 'FIXED';
  component.resize(width, height);
  component.primaryAxisAlignItems = 'MIN';
  component.counterAxisAlignItems = 'CENTER';
  applyHexFill(component, HEX_VARIANT);
  applyCornerRadius(component, height / 2);

  const bar = figma.createFrame();
  bar.name = 'progress/bar';
  bar.resize(Math.max(1, Math.floor(width * filled)), height);
  bar.layoutPositioning = 'AUTO';
  applyHexFill(bar, HEX_PRIMARY);
  applyCornerRadius(bar, height / 2);
  component.appendChild(bar);
  return component;
}

async function buildAvatar(
  ctx: ScaffoldBuildContext,
  tiny: Record<string, unknown>,
): Promise<ComponentNode> {
  await ensureScaffoldFonts(ctx);

  const sizeRaw = readTinyNumber(tiny, 'size');
  const size = sizeRaw !== undefined ? sizeRaw : 40;
  const initialsRaw = readTinyString(tiny, 'initials');
  const initials = initialsRaw !== undefined ? initialsRaw : 'AB';

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisSizingMode = 'FIXED';
  component.counterAxisSizingMode = 'FIXED';
  component.resize(size, size);
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';
  component.clipsContent = true;
  applyHexFill(component, HEX_BORDER);
  applyCornerRadius(component, size / 2);

  const label = figma.createText();
  label.name = 'avatar/initials';
  label.fontName = { family: ctx.fonts.labelFamily, style: ctx.fonts.labelStyle };
  label.characters = initials;
  label.fontSize = Math.round(size * 0.4);
  label.textAutoResize = 'HEIGHT';
  applyHexFill(label, HEX_CONTENT_MUTED);
  component.appendChild(label);
  return component;
}

async function buildCaptionFrame(
  ctx: ScaffoldBuildContext,
  tiny: Record<string, unknown>,
  shape: 'aspect-ratio' | 'scroll-area',
): Promise<ComponentNode> {
  await ensureScaffoldFonts(ctx);

  const widthRaw = readTinyNumber(tiny, 'width');
  const heightRaw = readTinyNumber(tiny, 'height');
  const width = widthRaw !== undefined ? widthRaw : 320;
  const defaultHeight = shape === 'aspect-ratio' ? 180 : 200;
  const height = heightRaw !== undefined ? heightRaw : defaultHeight;
  const caption = shape === 'aspect-ratio' ? 'Aspect ratio' : 'Scroll area';

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'HORIZONTAL';
  component.primaryAxisSizingMode = 'FIXED';
  component.counterAxisSizingMode = 'FIXED';
  component.resize(width, height);
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';
  component.fills = [];
  component.strokes = [
    {
      type: 'SOLID',
      color: { r: HEX_BORDER.r, g: HEX_BORDER.g, b: HEX_BORDER.b },
      opacity: 1,
    },
  ];
  component.strokeWeight = 1;
  component.dashPattern = [6, 4];
  applyCornerRadius(component, 6);

  const label = figma.createText();
  label.name = 'text/label';
  label.fontName = { family: ctx.fonts.labelFamily, style: ctx.fonts.labelStyle };
  label.characters = caption;
  label.fontSize = 12;
  label.textAutoResize = 'HEIGHT';
  applyHexFill(label, HEX_CONTENT_MUTED);
  component.appendChild(label);
  return component;
}

export async function buildTinyVariant(ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  const tiny =
    ctx.spec.tiny !== undefined && ctx.spec.tiny !== null
      ? (ctx.spec.tiny as Record<string, unknown>)
      : {};
  const shape = resolveShape(tiny);

  let component: ComponentNode;
  if (shape === 'separator') {
    component = buildSeparator(ctx, tiny);
  } else if (shape === 'skeleton') {
    component = buildSkeleton(ctx, tiny);
  } else if (shape === 'spinner') {
    component = buildSpinner(ctx, tiny);
  } else if (shape === 'progress') {
    component = buildProgress(ctx, tiny);
  } else if (shape === 'avatar') {
    component = await buildAvatar(ctx, tiny);
  } else if (shape === 'aspect-ratio') {
    component = await buildCaptionFrame(ctx, tiny, 'aspect-ratio');
  } else if (shape === 'scroll-area') {
    component = await buildCaptionFrame(ctx, tiny, 'scroll-area');
  } else {
    throw new Error(
      "buildTinyVariant: unknown spec.tiny.shape '" +
        String(readTinyString(tiny, 'shape')) +
        "' for '" +
        ctx.variantName +
        "'. Expected one of: separator, skeleton, spinner, progress, avatar, aspect-ratio, scroll-area.",
    );
  }

  const violation = assertNoOnePxMaster(component as unknown as FrameNode);
  if (violation !== null && component.children.length > 0) {
    component.resize(component.width, Math.max(component.height, 8));
  }

  return { component };
}
