import { assertValidAxisAlign, resizeThenApplySizing } from '@/core/canvas/helpers/autoLayout';

import type { ScaffoldBuildContext, VariantBuildResult } from '../types';
import { applyHexFill, createDashedIconSlot, createFocusRing } from './shared';

const CHECKED_FILL_HEX: RGB = { r: 0.102, g: 0.102, b: 0.102 };
const STROKE_HEX: RGB = { r: 0.831, g: 0.831, b: 0.847 };
const INDICATOR_HEX: RGB = { r: 1, g: 1, b: 1 };
const TRACK_ON_HEX: RGB = { r: 0.102, g: 0.102, b: 0.102 };
const TRACK_OFF_HEX: RGB = { r: 0.898, g: 0.906, b: 0.922 };

function readControlShape(ctx: ScaffoldBuildContext): 'checkbox' | 'radio' | 'switch' {
  const control = ctx.spec.control;
  if (control !== undefined && control.shape === 'radio') {
    return 'radio';
  }
  if (control !== undefined && control.shape === 'switch') {
    return 'switch';
  }
  return 'checkbox';
}

function readControlSize(ctx: ScaffoldBuildContext): number {
  const control = ctx.spec.control as Record<string, unknown> | undefined;
  if (control !== undefined && typeof control.size === 'number') {
    return control.size;
  }
  return 16;
}

function readControlNumber(
  control: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  if (control === undefined) {
    return fallback;
  }
  const value = control[key];
  if (typeof value === 'number') {
    return value;
  }
  return fallback;
}

function isCheckedVariant(variantName: string): boolean {
  // checked=true|pressed=true|on — preserve verbatim from cc-arch-control.js
  return /checked=true|pressed=true|on/.test(variantName);
}

async function buildSwitchVariant(
  ctx: ScaffoldBuildContext,
  checked: boolean,
): Promise<ComponentNode> {
  const control = ctx.spec.control as Record<string, unknown> | undefined;
  const h = readControlNumber(control, 'height', 20);
  const w = readControlNumber(control, 'width', 36);
  const thumbSize = h - 4;

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'HORIZONTAL';
  component.clipsContent = false;
  component.primaryAxisAlignItems = checked ? 'MAX' : 'MIN';
  component.counterAxisAlignItems = 'CENTER';
  component.paddingLeft = 2;
  component.paddingRight = 2;
  component.cornerRadius = h / 2;
  applyHexFill(component, checked ? TRACK_ON_HEX : TRACK_OFF_HEX);
  resizeThenApplySizing(component as unknown as FrameNode, w, h, {
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'FIXED',
  });
  assertValidAxisAlign(component);

  const thumb = figma.createFrame();
  thumb.name = 'switch/thumb';
  thumb.layoutMode = 'NONE';
  thumb.resize(thumbSize, thumbSize);
  thumb.cornerRadius = thumbSize / 2;
  applyHexFill(thumb, INDICATOR_HEX);
  component.appendChild(thumb);

  createFocusRing(component);

  return component;
}

async function buildCheckboxRadioVariant(
  ctx: ScaffoldBuildContext,
  shape: 'checkbox' | 'radio',
  checked: boolean,
): Promise<ComponentNode> {
  const sz = readControlSize(ctx);
  const cornerFallback = shape === 'radio' ? sz / 2 : 2;

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'HORIZONTAL';
  component.clipsContent = false;
  component.primaryAxisAlignItems = 'CENTER';
  component.counterAxisAlignItems = 'CENTER';
  component.cornerRadius = cornerFallback;
  if (checked) {
    applyHexFill(component, CHECKED_FILL_HEX);
  } else {
    component.fills = [];
  }
  component.strokes = [
    {
      type: 'SOLID',
      color: { r: STROKE_HEX.r, g: STROKE_HEX.g, b: STROKE_HEX.b },
      opacity: 1,
    },
  ];
  component.strokeWeight = 1;
  resizeThenApplySizing(component as unknown as FrameNode, sz, sz, {
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'FIXED',
  });
  assertValidAxisAlign(component);

  if (checked) {
    if (shape === 'radio') {
      const dot = figma.createFrame();
      dot.name = 'radio/dot';
      const dotSz = Math.round(sz * 0.5);
      dot.layoutMode = 'NONE';
      dot.resize(dotSz, dotSz);
      dot.cornerRadius = dotSz / 2;
      applyHexFill(dot, INDICATOR_HEX);
      component.appendChild(dot);
    } else {
      const iconSz = Math.round(sz * 0.75);
      const check = createDashedIconSlot('checkbox/check-icon', iconSz);
      check.name = 'checkbox/check-icon';
      check.strokes = [
        {
          type: 'SOLID',
          color: { r: INDICATOR_HEX.r, g: INDICATOR_HEX.g, b: INDICATOR_HEX.b },
          opacity: 1,
        },
      ];
      component.appendChild(check);
    }
  }

  createFocusRing(component);

  return component;
}

export async function buildControlVariant(ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  const shape = readControlShape(ctx);
  const checked = isCheckedVariant(ctx.variantName);
  let component: ComponentNode;
  if (shape === 'switch') {
    component = await buildSwitchVariant(ctx, checked);
  } else {
    component = await buildCheckboxRadioVariant(ctx, shape, checked);
  }
  return { component };
}
