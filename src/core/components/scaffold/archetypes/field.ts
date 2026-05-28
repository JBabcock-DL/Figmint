import { assertNoOnePxMaster, resizeThenApplySizing } from '@/core/canvas/helpers/autoLayout';

import { ensureScaffoldFonts } from '../context';
import type { ScaffoldBuildContext, VariantBuildResult } from '../types';
import {
  applyHexFill,
  createDashedIconSlot,
  createFocusRing,
  createSampleText,
  createStateLayer,
} from './shared';

const BORDER_DEFAULT: RGB = { r: 0.898, g: 0.906, b: 0.922 };
const MUTED_TEXT: RGB = { r: 0.42, g: 0.447, b: 0.502 };

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

function resolveSizeKey(ctx: ScaffoldBuildContext): string | null {
  if (ctx.combo.size !== undefined) {
    const raw = ctx.combo.size;
    return typeof raw === 'boolean' ? (raw ? 'true' : 'false') : String(raw);
  }
  return null;
}

function resolveLabelText(field: Record<string, unknown> | undefined): string {
  if (field === undefined) {
    return 'Label';
  }
  const label = field.label;
  if (typeof label === 'string') {
    return label;
  }
  return readString(field, 'labelText', 'Label');
}

function resolveFieldType(field: Record<string, unknown> | undefined): string {
  return readString(field, 'fieldType', 'input');
}

export async function buildFieldVariant(ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  await ensureScaffoldFonts(ctx);

  const field = ctx.spec.field;
  const fieldType = resolveFieldType(field);
  const showLabel = readBoolean(field, 'showLabel', true);
  const labelText = resolveLabelText(field);
  const placeholderDefault = fieldType === 'select' ? 'Select an option…' : 'Placeholder';
  const placeholderText = readString(field, 'placeholderText', placeholderDefault);
  const showHelper = readBoolean(field, 'showHelper', false);
  const helperText = readString(field, 'helperText', 'Helper text');
  const leadingIcon = readBoolean(field, 'leadingIcon', false);
  const trailingIcon = readBoolean(field, 'trailingIcon', false) || fieldType === 'select';
  const width = readNumber(field, 'width', 320);
  const sizeKey = resolveSizeKey(ctx);
  const fieldHeight = sizeKey === 'sm' ? 32 : sizeKey === 'lg' ? 44 : 36;
  const fontSize = sizeKey === 'sm' ? 12 : sizeKey === 'lg' ? 16 : 14;

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
  component.itemSpacing = 6;
  component.fills = [];
  component.strokes = [];

  let labelNode: TextNode | null = null;
  if (showLabel) {
    labelNode = createSampleText(labelText, ctx, 14, 'Medium');
    labelNode.name = 'Label';
    component.appendChild(labelNode);
  }

  const fieldChrome = figma.createFrame();
  fieldChrome.name = 'field';
  fieldChrome.layoutAlign = 'STRETCH';
  fieldChrome.itemSpacing = 8;
  fieldChrome.paddingLeft = ctx.spacing.padH > 0 ? ctx.spacing.padH : 12;
  fieldChrome.paddingRight = ctx.spacing.padH > 0 ? ctx.spacing.padH : 12;
  fieldChrome.cornerRadius = 6;
  applyHexFill(fieldChrome, ctx.fills.surface);
  fieldChrome.strokes = [
    {
      type: 'SOLID',
      color: { r: BORDER_DEFAULT.r, g: BORDER_DEFAULT.g, b: BORDER_DEFAULT.b },
      opacity: 1,
    },
  ];
  fieldChrome.strokeWeight = 1;

  if (fieldType === 'textarea') {
    fieldChrome.layoutMode = 'VERTICAL';
    const textareaMinHeight = readNumber(field, 'textareaMinHeight', 96);
    fieldChrome.resize(width, textareaMinHeight);
    fieldChrome.primaryAxisSizingMode = 'FIXED';
    fieldChrome.counterAxisSizingMode = 'FIXED';
    fieldChrome.primaryAxisAlignItems = 'MIN';
    fieldChrome.counterAxisAlignItems = 'MIN';
    fieldChrome.paddingTop = 8;
    fieldChrome.paddingBottom = 8;
  } else {
    fieldChrome.layoutMode = 'HORIZONTAL';
    fieldChrome.resize(width, fieldHeight);
    fieldChrome.primaryAxisSizingMode = 'FIXED';
    fieldChrome.counterAxisSizingMode = 'FIXED';
    if (fieldType === 'select') {
      fieldChrome.primaryAxisAlignItems = 'SPACE_BETWEEN';
    } else {
      fieldChrome.primaryAxisAlignItems = 'MIN';
    }
    fieldChrome.counterAxisAlignItems = 'CENTER';
    fieldChrome.paddingTop = 4;
    fieldChrome.paddingBottom = 4;
  }

  if (leadingIcon) {
    const leadingSlotNode = createDashedIconSlot('icon-slot/leading', 20);
    fieldChrome.appendChild(leadingSlotNode);
  }

  let placeholder: TextNode | null = null;
  if (fieldType === 'otp') {
    const boxCount = readNumber(field, 'otpLength', 6);
    fieldChrome.fills = [];
    fieldChrome.strokes = [];
    fieldChrome.itemSpacing = 8;
    const boxW = Math.min(44, Math.floor((width - 12 * (boxCount - 1)) / boxCount));
    for (let i = 0; i < boxCount; i++) {
      const box = figma.createFrame();
      box.name = 'otp-slot/' + String(i);
      box.layoutMode = 'HORIZONTAL';
      box.resize(boxW, fieldHeight);
      box.primaryAxisSizingMode = 'FIXED';
      box.counterAxisSizingMode = 'FIXED';
      box.primaryAxisAlignItems = 'CENTER';
      box.counterAxisAlignItems = 'CENTER';
      applyHexFill(box, ctx.fills.surface);
      box.strokes = [
        {
          type: 'SOLID',
          color: { r: BORDER_DEFAULT.r, g: BORDER_DEFAULT.g, b: BORDER_DEFAULT.b },
          opacity: 1,
        },
      ];
      box.strokeWeight = 1;
      box.cornerRadius = 6;
      fieldChrome.appendChild(box);
    }
  } else {
    placeholder = createSampleText(placeholderText, ctx, fontSize, 'Regular', MUTED_TEXT);
    placeholder.name = fieldType === 'select' ? 'value' : 'placeholder';
    fieldChrome.appendChild(placeholder);
  }

  if (trailingIcon) {
    const trailingName = fieldType === 'select' ? 'icon-slot/chevron' : 'icon-slot/trailing';
    const trailingSize = fieldType === 'select' ? 16 : 16;
    const trailingSlotNode = createDashedIconSlot(trailingName, trailingSize);
    fieldChrome.appendChild(trailingSlotNode);
  }

  component.appendChild(fieldChrome);

  let helperNode: TextNode | null = null;
  if (showHelper) {
    helperNode = createSampleText(helperText, ctx, 12, 'Regular', MUTED_TEXT);
    helperNode.name = 'helper';
    component.appendChild(helperNode);
  }

  const stateRoleRaw = field !== undefined ? field.stateRole : undefined;
  const stateRole = typeof stateRoleRaw === 'string' && stateRoleRaw.length > 0 ? stateRoleRaw : null;
  if (stateRole !== null) {
    createStateLayer('hover', component);
    createStateLayer('pressed', component);
    createStateLayer('focus', component);
    createFocusRing(component);
  }

  if (component.height <= 2 && component.children.length > 0) {
    component.resize(Math.max(component.width, width), fieldHeight + 24);
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'FIXED';
  }

  const violation = assertNoOnePxMaster(component as unknown as FrameNode);
  if (violation !== null) {
    component.resize(component.width, fieldHeight + 24);
    component.primaryAxisSizingMode = 'AUTO';
    component.counterAxisSizingMode = 'FIXED';
  }

  return { component };
}
