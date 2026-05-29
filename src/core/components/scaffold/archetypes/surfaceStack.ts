import { assertNoOnePxMaster, resizeThenApplySizing } from '@/core/canvas/helpers/autoLayout';

import { ensureScaffoldFonts } from '../context';
import type { ScaffoldBuildContext, VariantBuildResult } from '../types';
import {
  applyHexFill,
  createDashedContentSlot,
  createFocusRing,
  createSampleText,
  createStateLayer,
} from './shared';

const BORDER_SUBTLE: RGB = { r: 0.898, g: 0.906, b: 0.922 };

function readNumber(
  record: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  if (record === undefined) {
    return fallback;
  }
  const value = record[key];
  if (typeof value === 'number') {
    return value;
  }
  return fallback;
}

function readString(
  record: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
): string {
  if (record === undefined) {
    return fallback;
  }
  const value = record[key];
  if (typeof value === 'string') {
    return value;
  }
  return fallback;
}

function readBoolean(
  record: Record<string, unknown> | undefined,
  key: string,
  fallback: boolean,
): boolean {
  if (record === undefined) {
    return fallback;
  }
  const value = record[key];
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function readNestedBoolean(
  record: Record<string, unknown> | undefined,
  nestedKey: string,
  field: string,
  fallback: boolean,
): boolean {
  if (record === undefined) {
    return fallback;
  }
  const nested = record[nestedKey];
  if (nested === undefined || typeof nested !== 'object' || nested === null) {
    return fallback;
  }
  return readBoolean(nested as Record<string, unknown>, field, fallback);
}

function notImplemented(name: string): Promise<VariantBuildResult> {
  return Promise.reject(new Error(name + ': not implemented until Phase 2'));
}

export async function buildSurfaceStackVariant(
  ctx: ScaffoldBuildContext,
): Promise<VariantBuildResult> {
  await ensureScaffoldFonts(ctx);

  const surface = ctx.spec.surface;
  const width = readNumber(surface, 'width', 420);
  const padH = ctx.spacing.padH > 0 ? ctx.spacing.padH : 24;
  const padY = ctx.spacing.padV > 0 ? ctx.spacing.padV : 24;
  const gap = ctx.spacing.gap > 0 ? ctx.spacing.gap : 24;
  const innerGap = 6;

  const titleText = readString(surface, 'titleText', ctx.spec.name);
  const descriptionTextRaw = surface !== undefined ? surface.descriptionText : undefined;
  let descText: string | null = null;
  if (typeof descriptionTextRaw === 'string' && descriptionTextRaw.length > 0) {
    descText = descriptionTextRaw;
  }

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'VERTICAL';
  component.clipsContent = false;
  resizeThenApplySizing(component as unknown as FrameNode, width, 1, {
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'FIXED',
  });
  component.primaryAxisAlignItems = 'MIN';
  component.counterAxisAlignItems = 'MIN';
  component.paddingLeft = 0;
  component.paddingRight = 0;
  component.paddingTop = padY;
  component.paddingBottom = padY;
  component.itemSpacing = gap;
  component.cornerRadius = 12;
  applyHexFill(component, ctx.fills.surface);
  component.strokes = [
    {
      type: 'SOLID',
      color: { r: BORDER_SUBTLE.r, g: BORDER_SUBTLE.g, b: BORDER_SUBTLE.b },
      opacity: 1,
    },
  ];
  component.strokeWeight = 1;

  const header = figma.createFrame();
  header.name = 'CardHeader';
  header.layoutMode = 'HORIZONTAL';
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'AUTO';
  header.layoutAlign = 'STRETCH';
  header.counterAxisAlignItems = 'MIN';
  header.paddingLeft = padH;
  header.paddingRight = padH;
  header.itemSpacing = 16;
  header.fills = [];

  const titleStack = figma.createFrame();
  titleStack.name = 'CardHeader/title-stack';
  titleStack.layoutMode = 'VERTICAL';
  titleStack.primaryAxisSizingMode = 'AUTO';
  titleStack.counterAxisSizingMode = 'AUTO';
  titleStack.itemSpacing = innerGap;
  titleStack.fills = [];

  const titleNode = createSampleText(titleText, ctx, 18, 'Medium');
  titleNode.name = 'CardTitle';
  titleStack.appendChild(titleNode);

  if (descText !== null) {
    const descNode = createSampleText(descText, ctx, 14, 'Regular', {
      r: 0.42,
      g: 0.447,
      b: 0.502,
    });
    descNode.name = 'CardDescription';
    titleStack.appendChild(descNode);
  }

  header.appendChild(titleStack);

  const actionEnabled = readNestedBoolean(surface, 'actionSlot', 'enabled', false);
  if (actionEnabled) {
    const actionSpec =
      surface !== undefined && typeof surface.actionSlot === 'object' && surface.actionSlot !== null
        ? (surface.actionSlot as Record<string, unknown>)
        : undefined;
    const actionLabel = readString(actionSpec, 'slotLabel', 'Action');
    const actionW = readNumber(actionSpec, 'width', 80);
    const actionH = readNumber(actionSpec, 'height', 32);
    const actionSlot = createDashedContentSlot('CardAction', ctx, {
      label: actionLabel,
      w: actionW,
      h: actionH,
      radius: 6,
    });
    header.appendChild(actionSlot);
  }

  component.appendChild(header);

  const contentEnabled = readNestedBoolean(surface, 'contentSlot', 'enabled', true);
  if (contentEnabled) {
    const contentSpec =
      surface !== undefined &&
      typeof surface.contentSlot === 'object' &&
      surface.contentSlot !== null
        ? (surface.contentSlot as Record<string, unknown>)
        : undefined;
    const contentLabel = readString(contentSpec, 'slotLabel', 'Content');
    const contentMinHeight = readNumber(contentSpec, 'minHeight', 96);

    const contentFrame = figma.createFrame();
    contentFrame.name = 'CardContent';
    contentFrame.layoutMode = 'VERTICAL';
    contentFrame.primaryAxisSizingMode = 'AUTO';
    contentFrame.counterAxisSizingMode = 'FIXED';
    contentFrame.layoutAlign = 'STRETCH';
    contentFrame.paddingLeft = padH;
    contentFrame.paddingRight = padH;
    contentFrame.itemSpacing = 8;
    contentFrame.fills = [];

    const contentSlotNode = createDashedContentSlot('content-slot', ctx, {
      label: contentLabel,
      w: width - padH * 2,
      h: contentMinHeight,
      stretch: true,
      radius: 8,
    });
    contentFrame.appendChild(contentSlotNode);
    component.appendChild(contentFrame);
  }

  const footerEnabled = readNestedBoolean(surface, 'footerSlot', 'enabled', false);
  if (footerEnabled) {
    const footerSpec =
      surface !== undefined && typeof surface.footerSlot === 'object' && surface.footerSlot !== null
        ? (surface.footerSlot as Record<string, unknown>)
        : undefined;
    const footerAlign = readString(footerSpec, 'align', 'start');
    const footerMinHeight = readNumber(footerSpec, 'minHeight', 44);
    const footerLabel = readString(footerSpec, 'slotLabel', 'Footer');

    const footerFrame = figma.createFrame();
    footerFrame.name = 'CardFooter';
    footerFrame.layoutMode = 'HORIZONTAL';
    footerFrame.primaryAxisSizingMode = 'FIXED';
    footerFrame.counterAxisSizingMode = 'AUTO';
    footerFrame.layoutAlign = 'STRETCH';
    if (footerAlign === 'end') {
      footerFrame.primaryAxisAlignItems = 'MAX';
    } else if (footerAlign === 'between') {
      footerFrame.primaryAxisAlignItems = 'SPACE_BETWEEN';
    } else {
      footerFrame.primaryAxisAlignItems = 'MIN';
    }
    footerFrame.counterAxisAlignItems = 'CENTER';
    footerFrame.paddingLeft = padH;
    footerFrame.paddingRight = padH;
    footerFrame.itemSpacing = 8;
    footerFrame.fills = [];

    const footerSlug = footerLabel.toLowerCase().split(' ').join('-');
    const footerSlotNode = createDashedContentSlot('footer-slot/' + footerSlug, ctx, {
      label: footerLabel,
      w: 140,
      h: footerMinHeight,
      radius: 6,
    });
    footerFrame.appendChild(footerSlotNode);
    component.appendChild(footerFrame);
  }

  const stateRoleRaw = surface !== undefined ? surface.stateRole : undefined;
  const stateRole =
    typeof stateRoleRaw === 'string' && stateRoleRaw.length > 0 ? stateRoleRaw : null;
  if (stateRole !== null) {
    createStateLayer('hover', component);
    createStateLayer('pressed', component);
    createStateLayer('focus', component);
    createFocusRing(component);
  }

  if (component.height <= 2 && component.children.length > 0) {
    component.resize(Math.max(component.width, width), 120);
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'FIXED';
  }

  const violation = assertNoOnePxMaster(component as unknown as FrameNode);
  if (violation !== null) {
    component.resize(component.width, 120);
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'FIXED';
  }

  return { component };
}

export function buildRowItemVariant(_ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  return notImplemented('buildRowItemVariant');
}

export function buildTinyVariant(_ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  return notImplemented('buildTinyVariant');
}

export function buildContainerVariant(_ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  return notImplemented('buildContainerVariant');
}

export function buildComposedVariant(_ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  return notImplemented('buildComposedVariant');
}
