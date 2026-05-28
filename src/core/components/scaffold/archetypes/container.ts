import { assertValidAxisAlign, reassertHug, resizeThenApplySizing } from '@/core/canvas/helpers/autoLayout';

import { ensureScaffoldFonts } from '../context';
import type { ScaffoldBuildContext, VariantBuildResult } from '../types';
import { applyHexFill, createDashedIconSlot } from './shared';

const OUTLINE_HEX: RGB = { r: 0.898, g: 0.906, b: 0.922 };
const MUTED_BG_HEX: RGB = { r: 0.957, g: 0.957, b: 0.961 };
const CONTENT_HEX: RGB = { r: 0.039, g: 0.039, b: 0.039 };
const MUTED_TEXT_HEX: RGB = { r: 0.42, g: 0.447, b: 0.502 };
const SURFACE_HEX: RGB = { r: 1, g: 1, b: 1 };

function readContainerKind(ctx: ScaffoldBuildContext): 'accordion' | 'tabs' {
  const container = ctx.spec.container;
  if (container !== undefined && container.kind === 'tabs') {
    return 'tabs';
  }
  return 'accordion';
}

function readContainerWidth(ctx: ScaffoldBuildContext): number {
  const container = ctx.spec.container;
  if (container !== undefined && typeof container.width === 'number') {
    return container.width;
  }
  return 360;
}

function readContainerString(container: Record<string, unknown> | undefined, key: string, fallback: string): string {
  if (container === undefined) {
    return fallback;
  }
  const value = container[key];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return fallback;
}

function readContainerNumber(container: Record<string, unknown> | undefined, key: string, fallback: number): number {
  if (container === undefined) {
    return fallback;
  }
  const value = container[key];
  if (typeof value === 'number') {
    return value;
  }
  return fallback;
}

function readContainerTabs(container: Record<string, unknown> | undefined): string[] {
  if (container === undefined) {
    return ['Account', 'Password', 'Notifications'];
  }
  const tabs = container.tabs;
  if (Array.isArray(tabs) && tabs.length > 0) {
    const result: string[] = [];
    for (let i = 0; i < tabs.length; i++) {
      if (typeof tabs[i] === 'string') {
        result.push(tabs[i] as string);
      }
    }
    if (result.length > 0) {
      return result;
    }
  }
  return ['Account', 'Password', 'Notifications'];
}

function isExpandedVariant(variantName: string): boolean {
  return /open=true|expanded=true|active=true|state=open/.test(variantName);
}

async function createSampleText(
  ctx: ScaffoldBuildContext,
  chars: string,
  color: RGB,
  fontSize: number,
  weight: string,
): Promise<TextNode> {
  await figma.loadFontAsync({ family: ctx.fonts.labelFamily, style: weight });
  const text = figma.createText();
  text.fontName = { family: ctx.fonts.labelFamily, style: weight };
  text.characters = chars;
  text.fontSize = fontSize;
  text.textAutoResize = 'HEIGHT';
  applyHexFill(text, color);
  return text;
}

function createDashedSlot(
  name: string,
  label: string,
  w: number,
  h: number,
  stretch: boolean,
): FrameNode {
  const slot = figma.createFrame();
  slot.name = name;
  slot.layoutMode = 'HORIZONTAL';
  slot.primaryAxisSizingMode = 'FIXED';
  slot.counterAxisSizingMode = 'FIXED';
  slot.resize(w, h);
  slot.primaryAxisAlignItems = 'CENTER';
  slot.counterAxisAlignItems = 'CENTER';
  slot.paddingLeft = 12;
  slot.paddingRight = 12;
  slot.paddingTop = 8;
  slot.paddingBottom = 8;
  slot.itemSpacing = 0;
  slot.fills = [];
  slot.strokes = [
    {
      type: 'SOLID',
      color: { r: OUTLINE_HEX.r, g: OUTLINE_HEX.g, b: OUTLINE_HEX.b },
      opacity: 1,
    },
  ];
  slot.strokeWeight = 1;
  slot.dashPattern = [6, 4];
  slot.cornerRadius = 8;
  slot.clipsContent = false;
  if (stretch) {
    slot.layoutAlign = 'STRETCH';
  }
  return slot;
}

async function appendDashedSlotCaption(
  ctx: ScaffoldBuildContext,
  slot: FrameNode,
  label: string,
): Promise<void> {
  const caption = await createSampleText(ctx, label, MUTED_TEXT_HEX, 12, 'Regular');
  slot.appendChild(caption);
}

async function buildTabsContainer(ctx: ScaffoldBuildContext, width: number): Promise<ComponentNode> {
  const container = ctx.spec.container as Record<string, unknown> | undefined;
  const tabs = readContainerTabs(container);
  const activeIdx = readContainerNumber(container, 'activeIndex', 0);
  const panelMinHeight = readContainerNumber(container, 'panelMinHeight', 120);

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'VERTICAL';
  component.clipsContent = false;
  component.primaryAxisAlignItems = 'MIN';
  component.counterAxisAlignItems = 'MIN';
  component.itemSpacing = 12;
  component.fills = [];
  resizeThenApplySizing(component as unknown as FrameNode, width, 1, {
    primaryAxisSizingMode: 'HUG',
    counterAxisSizingMode: 'FIXED',
  });
  component.layoutSizingHorizontal = 'FIXED';
  component.layoutSizingVertical = 'HUG';

  const list = figma.createFrame();
  list.name = 'TabsList';
  list.layoutMode = 'HORIZONTAL';
  list.primaryAxisSizingMode = 'AUTO';
  list.counterAxisSizingMode = 'AUTO';
  list.primaryAxisAlignItems = 'MIN';
  list.counterAxisAlignItems = 'CENTER';
  list.paddingLeft = 4;
  list.paddingRight = 4;
  list.paddingTop = 4;
  list.paddingBottom = 4;
  list.itemSpacing = 4;
  list.cornerRadius = 6;
  applyHexFill(list, MUTED_BG_HEX);
  assertValidAxisAlign(list);

  for (let i = 0; i < tabs.length; i++) {
    const tabLabel = tabs[i];
    const trigger = figma.createFrame();
    trigger.name = 'TabsTrigger/' + tabLabel.toLowerCase();
    trigger.layoutMode = 'HORIZONTAL';
    trigger.primaryAxisSizingMode = 'AUTO';
    trigger.counterAxisSizingMode = 'AUTO';
    trigger.paddingLeft = 12;
    trigger.paddingRight = 12;
    trigger.paddingTop = 6;
    trigger.paddingBottom = 6;
    trigger.primaryAxisAlignItems = 'CENTER';
    trigger.counterAxisAlignItems = 'CENTER';
    trigger.cornerRadius = 6;
    if (i === activeIdx) {
      applyHexFill(trigger, SURFACE_HEX);
    } else {
      trigger.fills = [];
    }
    assertValidAxisAlign(trigger);
    const lbl = await createSampleText(
      ctx,
      tabLabel,
      i === activeIdx ? CONTENT_HEX : MUTED_TEXT_HEX,
      14,
      i === activeIdx ? 'Medium' : 'Regular',
    );
    trigger.appendChild(lbl);
    list.appendChild(trigger);
  }
  component.appendChild(list);

  const panel = createDashedSlot('TabsContent', tabs[activeIdx] + ' content', width, panelMinHeight, true);
  await appendDashedSlotCaption(ctx, panel, tabs[activeIdx] + ' content');
  component.appendChild(panel);

  return component;
}

async function buildAccordionContainer(ctx: ScaffoldBuildContext, width: number): Promise<ComponentNode> {
  const container = ctx.spec.container as Record<string, unknown> | undefined;
  const titleText = readContainerString(container, 'titleText', 'Is it accessible?');
  const panelText = readContainerString(container, 'panelText', 'Yes. It adheres to the WAI-ARIA design pattern.');
  const expanded = isExpandedVariant(ctx.variantName);

  const component = figma.createComponent();
  component.name = ctx.variantName;
  component.layoutMode = 'VERTICAL';
  component.clipsContent = false;
  component.primaryAxisAlignItems = 'MIN';
  component.counterAxisAlignItems = 'MIN';
  component.itemSpacing = 0;
  component.fills = [];
  component.strokes = [
    {
      type: 'SOLID',
      color: { r: OUTLINE_HEX.r, g: OUTLINE_HEX.g, b: OUTLINE_HEX.b },
      opacity: 1,
    },
  ];
  component.strokeWeight = 0;
  component.strokeTopWeight = 0;
  component.strokeRightWeight = 0;
  component.strokeLeftWeight = 0;
  component.strokeBottomWeight = 1;
  resizeThenApplySizing(component as unknown as FrameNode, width, 1, {
    primaryAxisSizingMode: 'HUG',
    counterAxisSizingMode: 'FIXED',
  });
  component.layoutSizingHorizontal = 'FIXED';
  component.layoutSizingVertical = 'HUG';

  const trigger = figma.createFrame();
  trigger.name = 'AccordionTrigger';
  trigger.layoutMode = 'HORIZONTAL';
  trigger.primaryAxisSizingMode = 'FIXED';
  trigger.counterAxisSizingMode = 'AUTO';
  trigger.layoutAlign = 'STRETCH';
  trigger.primaryAxisAlignItems = 'SPACE_BETWEEN';
  trigger.counterAxisAlignItems = 'CENTER';
  trigger.paddingLeft = 0;
  trigger.paddingRight = 0;
  trigger.paddingTop = 12;
  trigger.paddingBottom = 12;
  trigger.itemSpacing = 8;
  trigger.fills = [];
  assertValidAxisAlign(trigger);

  const title = await createSampleText(ctx, titleText, CONTENT_HEX, 14, 'Medium');
  title.name = 'AccordionTrigger/title';
  trigger.appendChild(title);

  const chevron = createDashedIconSlot('icon-slot/chevron', 16);
  trigger.appendChild(chevron);
  component.appendChild(trigger);

  if (expanded) {
    const panel = figma.createFrame();
    panel.name = 'AccordionContent';
    panel.layoutMode = 'VERTICAL';
    panel.primaryAxisSizingMode = 'AUTO';
    panel.counterAxisSizingMode = 'FIXED';
    panel.layoutAlign = 'STRETCH';
    panel.paddingTop = 0;
    panel.paddingBottom = 16;
    panel.paddingLeft = 0;
    panel.paddingRight = 0;
    panel.fills = [];
    assertValidAxisAlign(panel);
    const body = await createSampleText(ctx, panelText, MUTED_TEXT_HEX, 14, 'Regular');
    body.name = 'AccordionContent/body';
    panel.appendChild(body);
    component.appendChild(panel);
  }

  return component;
}

function finalizeContainerSizing(component: ComponentNode): void {
  const frame = component as unknown as FrameNode;
  if (frame.height <= 2 && frame.children.length > 0) {
    frame.resize(frame.width, 48);
    reassertHug(frame);
  }
}

export async function buildContainerVariant(ctx: ScaffoldBuildContext): Promise<VariantBuildResult> {
  await ensureScaffoldFonts(ctx);

  const kind = readContainerKind(ctx);
  const width = readContainerWidth(ctx);
  let component: ComponentNode;
  if (kind === 'tabs') {
    component = await buildTabsContainer(ctx, width);
  } else {
    component = await buildAccordionContainer(ctx, width);
  }

  finalizeContainerSizing(component);

  return { component };
}
