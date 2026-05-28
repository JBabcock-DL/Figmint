import { TABLE_WIDTH } from '@/core/canvas/constants';
import {
  createBodyCell,
  createBodyRow,
  reassertBodyCell,
  reassertBodyRow,
} from '@/core/canvas/helpers/tableCells';
import { configureTableText } from '@/core/canvas/helpers/textCell';
import { bindPaintToVar } from '@/core/canvas/helpers/bindings';
import { hexToRgb } from '@/core/canvas/lib/colorFormats';
import { loadFontsForCanvas } from '@/core/canvas/lib/fonts';
import { reassertHug } from '@/core/canvas/helpers/autoLayout';

export interface DocStyleIds {
  Section: string | null;
  TokenName: string | null;
  Code: string | null;
  Caption: string | null;
}

const DEFAULT_CONTENT_RGB: RGB = { r: 0.09, g: 0.09, b: 0.11 };
const DEFAULT_MUTED_RGB: RGB = { r: 0.44, g: 0.44, b: 0.48 };

export async function resolveDocStyles(): Promise<DocStyleIds> {
  const textStyles = await figma.getLocalTextStylesAsync();
  let sectionId: string | null = null;
  let tokenNameId: string | null = null;
  let codeId: string | null = null;
  let captionId: string | null = null;

  for (let i = 0; i < textStyles.length; i++) {
    const style = textStyles[i];
    if (sectionId === null && /^_?doc.*section/i.test(style.name)) {
      sectionId = style.id;
    }
    if (tokenNameId === null && /^_?doc.*(token|heading)/i.test(style.name)) {
      tokenNameId = style.id;
    }
    if (codeId === null && /^_?doc.*(code|mono)/i.test(style.name)) {
      codeId = style.id;
    }
    if (captionId === null && /^_?doc.*(caption|label|body)/i.test(style.name)) {
      captionId = style.id;
    }
  }

  const exactSection = textStyles.find(function (s) {
    return s.name === '_Doc/Section';
  });
  const exactTokenName = textStyles.find(function (s) {
    return s.name === '_Doc/TokenName';
  });
  const exactCode = textStyles.find(function (s) {
    return s.name === '_Doc/Code';
  });
  const exactCaption = textStyles.find(function (s) {
    return s.name === '_Doc/Caption';
  });

  return {
    Section: exactSection !== undefined ? exactSection.id : sectionId,
    TokenName: exactTokenName !== undefined ? exactTokenName.id : tokenNameId,
    Code: exactCode !== undefined ? exactCode.id : codeId,
    Caption: exactCaption !== undefined ? exactCaption.id : captionId,
  };
}

export async function makeTableText(
  characters: string,
  colWidth: number,
  styleId: string | null,
  fillVariable?: Variable | null,
): Promise<TextNode> {
  await loadFontsForCanvas();

  const text = figma.createText();
  text.characters = String(characters);
  if (styleId !== null && styleId !== '') {
    try {
      text.textStyleId = styleId;
    } catch {
      /* style may be missing on scratch files */
    }
  }
  configureTableText(text, colWidth);
  if (fillVariable !== null && fillVariable !== undefined) {
    bindPaintToVar(text, fillVariable);
  }
  return text;
}

export async function makeSectionText(
  characters: string,
  fillVariable?: Variable | null,
): Promise<TextNode> {
  const text = figma.createText();
  text.characters = String(characters);
  text.name = 'title';
  text.resize(TABLE_WIDTH, 1);
  text.textAutoResize = 'HEIGHT';
  if (fillVariable !== null && fillVariable !== undefined) {
    bindPaintToVar(text, fillVariable);
  } else {
    text.fills = [{ type: 'SOLID', color: DEFAULT_CONTENT_RGB }];
  }
  return text;
}

export async function makeCaptionText(
  characters: string,
  fillVariable?: Variable | null,
): Promise<TextNode> {
  const text = figma.createText();
  text.characters = String(characters);
  text.name = 'caption';
  text.resize(TABLE_WIDTH, 1);
  text.textAutoResize = 'HEIGHT';
  if (fillVariable !== null && fillVariable !== undefined) {
    bindPaintToVar(text, fillVariable);
  } else {
    text.fills = [{ type: 'SOLID', color: DEFAULT_MUTED_RGB }];
  }
  return text;
}

export interface ThemeModeColumnOptions {
  colWidth: number;
  modeSlug: 'light' | 'dark';
  themeVariable: Variable | null;
  resolvedHex: string;
  resolvedHsl?: string | null;
  docStyles: DocStyleIds;
  contentVar: Variable | null;
  mutedVar: Variable | null;
  themeCollectionId: string;
  modeId: string;
}

/** Light/Dark preview column — bound swatch + hex (+ optional HSL stack for alpha tokens). */
export async function makeThemeModeColumn(opts: ThemeModeColumnOptions): Promise<FrameNode> {
  const cell = createBodyCell(opts.colWidth, 'HORIZONTAL', opts.modeSlug);
  cell.itemSpacing = 6;
  cell.counterAxisAlignItems = 'CENTER';
  cell.paddingLeft = 4;
  cell.paddingRight = 4;

  const preview = figma.createFrame();
  preview.name = 'doc/theme-preview/' + opts.modeSlug;
  preview.layoutMode = 'HORIZONTAL';
  preview.primaryAxisSizingMode = 'FIXED';
  preview.counterAxisSizingMode = 'FIXED';
  preview.resize(32, 32);
  preview.primaryAxisAlignItems = 'CENTER';
  preview.counterAxisAlignItems = 'CENTER';
  preview.fills = [];

  const rect = figma.createRectangle();
  rect.resize(24, 24);
  rect.cornerRadius = 4;
  rect.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }];
  rect.strokeWeight = 1;
  if (opts.themeVariable !== null) {
    bindPaintToVar(rect, opts.themeVariable);
  } else {
    rect.fills = [{ type: 'SOLID', color: hexToRgb(opts.resolvedHex) }];
  }
  preview.appendChild(rect);

  if (opts.themeCollectionId !== '' && opts.modeId !== '') {
    try {
      preview.setExplicitVariableModeForCollection(opts.themeCollectionId, opts.modeId);
    } catch {
      /* mode override may fail on foreign files */
    }
  }

  const textWidth = Math.max(40, opts.colWidth - 36);
  const hexText = await makeTableText(
    opts.resolvedHex || '—',
    textWidth,
    opts.docStyles.Code,
    opts.contentVar,
  );

  if (opts.resolvedHsl !== null && opts.resolvedHsl !== undefined && opts.resolvedHsl !== '') {
    const textStack = figma.createFrame();
    textStack.layoutMode = 'VERTICAL';
    textStack.primaryAxisSizingMode = 'AUTO';
    textStack.counterAxisSizingMode = 'FIXED';
    textStack.resize(textWidth, 1);
    textStack.layoutSizingVertical = 'HUG';
    textStack.itemSpacing = 2;
    textStack.fills = [];
    hexText.layoutAlign = 'STRETCH';
    textStack.appendChild(hexText);
    const hslText = await makeTableText(
      opts.resolvedHsl,
      textWidth,
      opts.docStyles.Caption,
      opts.mutedVar,
    );
    hslText.layoutAlign = 'STRETCH';
    textStack.appendChild(hslText);
    textStack.layoutSizingVertical = 'HUG';
    cell.appendChild(preview);
    cell.appendChild(textStack);
  } else {
    cell.appendChild(preview);
    cell.appendChild(hexText);
  }
  reassertBodyCell(cell);
  return cell;
}

export function rehugCell(cell: FrameNode): void {
  reassertBodyCell(cell);
}

export function rehugRow(row: FrameNode): void {
  reassertBodyRow(row);
}

export { createBodyCell, createBodyRow, reassertBodyCell, reassertBodyRow, reassertHug };
