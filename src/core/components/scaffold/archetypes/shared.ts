import { assertValidAxisAlign } from '@/core/canvas/helpers/autoLayout';

import type { ScaffoldBuildContext } from '../types';

const CONTENT_TEXT: RGB = { r: 0.039, g: 0.039, b: 0.039 };
const MUTED_TEXT: RGB = { r: 0.42, g: 0.447, b: 0.502 };
const BORDER_SUBTLE: RGB = { r: 0.898, g: 0.906, b: 0.922 };

export interface DashedContentSlotOptions {
  label?: string | null;
  w?: number;
  h?: number;
  radius?: number;
  stretch?: boolean;
  padX?: number;
  padY?: number;
}

export function applyHexFill(node: GeometryMixin, color: RGB): void {
  const paint: SolidPaint = {
    type: 'SOLID',
    color: { r: color.r, g: color.g, b: color.b },
    opacity: 1,
  };
  node.fills = [paint];
}

export function createDashedIconSlot(name: string, size: number): FrameNode {
  const slot = figma.createFrame();
  slot.name = name;
  slot.layoutMode = 'NONE';
  slot.resize(size, size);
  slot.fills = [];
  applyHexFill(slot, { r: 0.831, g: 0.831, b: 0.847 });
  slot.strokes = [
    {
      type: 'SOLID',
      color: { r: 0.831, g: 0.831, b: 0.847 },
      opacity: 1,
    },
  ];
  slot.strokeWeight = 1;
  slot.dashPattern = [4, 3];
  slot.cornerRadius = 4;
  slot.clipsContent = false;
  slot.layoutPositioning = 'AUTO';
  return slot;
}

export function createStateLayer(
  role: 'hover' | 'pressed' | 'focus',
  parent: FrameNode,
): FrameNode {
  assertValidAxisAlign(parent);
  const layer = figma.createFrame();
  layer.name = 'state-layer/' + role;
  layer.layoutMode = 'NONE';
  layer.layoutPositioning = 'ABSOLUTE';
  layer.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  layer.resize(100, 100);
  layer.x = 0;
  layer.y = 0;
  layer.opacity = 0;
  layer.fills = [];
  layer.clipsContent = false;
  parent.appendChild(layer);
  return layer;
}

export function createSampleText(
  chars: string,
  ctx: ScaffoldBuildContext,
  fontSize: number,
  weight?: string,
  color?: RGB,
): TextNode {
  const text = figma.createText();
  const style = weight !== undefined ? weight : ctx.fonts.labelStyle;
  text.fontName = { family: ctx.fonts.labelFamily, style };
  text.characters = chars;
  text.fontSize = fontSize;
  text.textAutoResize = 'HEIGHT';
  applyHexFill(text, color !== undefined ? color : CONTENT_TEXT);
  return text;
}

export function createDashedContentSlot(
  name: string,
  ctx: ScaffoldBuildContext,
  options?: DashedContentSlotOptions,
): FrameNode {
  const label = options !== undefined && options.label !== undefined ? options.label : null;
  const w = options !== undefined && options.w !== undefined ? options.w : 200;
  const h = options !== undefined && options.h !== undefined ? options.h : 96;
  const radius = options !== undefined && options.radius !== undefined ? options.radius : 8;
  const stretch = options !== undefined && options.stretch === true;
  const padX = options !== undefined && options.padX !== undefined ? options.padX : 12;
  const padY = options !== undefined && options.padY !== undefined ? options.padY : 8;

  const slot = figma.createFrame();
  slot.name = name;
  slot.layoutMode = 'HORIZONTAL';
  slot.primaryAxisSizingMode = 'FIXED';
  slot.counterAxisSizingMode = 'FIXED';
  slot.resize(w, h);
  slot.primaryAxisAlignItems = 'CENTER';
  slot.counterAxisAlignItems = 'CENTER';
  slot.paddingLeft = padX;
  slot.paddingRight = padX;
  slot.paddingTop = padY;
  slot.paddingBottom = padY;
  slot.itemSpacing = 0;
  slot.fills = [];
  slot.strokes = [
    {
      type: 'SOLID',
      color: { r: BORDER_SUBTLE.r, g: BORDER_SUBTLE.g, b: BORDER_SUBTLE.b },
      opacity: 1,
    },
  ];
  slot.strokeWeight = 1;
  slot.dashPattern = [6, 4];
  slot.cornerRadius = radius;
  slot.clipsContent = false;
  if (stretch) {
    slot.layoutAlign = 'STRETCH';
  }
  if (label !== null) {
    const caption = createSampleText(String(label), ctx, 12, 'Regular', MUTED_TEXT);
    slot.appendChild(caption);
  }
  return slot;
}

export function createFocusRing(parent: FrameNode): FrameNode {
  assertValidAxisAlign(parent);
  const ring = figma.createFrame();
  ring.name = 'focus-ring';
  ring.layoutMode = 'NONE';
  ring.layoutPositioning = 'ABSOLUTE';
  ring.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  ring.resize(100, 100);
  ring.x = 0;
  ring.y = 0;
  ring.opacity = 0;
  ring.fills = [];
  ring.clipsContent = false;
  ring.strokes = [
    {
      type: 'SOLID',
      color: { r: 0.231, g: 0.51, b: 0.965 },
      opacity: 1,
    },
  ];
  ring.strokeWeight = 2;
  ring.strokeAlign = 'OUTSIDE';
  parent.appendChild(ring);
  return ring;
}
