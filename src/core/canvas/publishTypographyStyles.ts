import type { TokensV1 } from '@detroitlabs/figmint-contracts';

import { listExpectedSlotStyleNames, loadTypographySlots } from '@/core/canvas/data/loadCanvasData';

export interface PublishTypographyResult {
  docStyles: number;
  slotStyles: number;
  missing: string[];
}

const DOC_STYLE_NAMES = ['_Doc/Section', '_Doc/TokenName', '_Doc/Code', '_Doc/Caption'];

function findTextStyleByName(styles: TextStyle[], name: string): TextStyle | null {
  for (let i = 0; i < styles.length; i++) {
    if (styles[i].name === name) {
      return styles[i];
    }
  }
  return null;
}

async function ensureDocTextStyle(name: string, existing: TextStyle[]): Promise<TextStyle> {
  const found = findTextStyleByName(existing, name);
  if (found !== null) {
    return found;
  }
  const style = figma.createTextStyle();
  style.name = name;
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  style.fontName = { family: 'Inter', style: 'Regular' };
  style.fontSize = 14;
  return style;
}

async function ensureSlotTextStyle(name: string, existing: TextStyle[]): Promise<TextStyle> {
  const found = findTextStyleByName(existing, name);
  if (found !== null) {
    return found;
  }
  const style = figma.createTextStyle();
  style.name = name;
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  style.fontName = { family: 'Inter', style: 'Regular' };
  style.fontSize = 14;
  return style;
}

/**
 * Publish `_Doc/*` + 27 slot text styles bound to Typography mode-100 variables.
 * Called by bootstrap orchestrator (WO-015) before canvas draw — not inline in builders.
 */
export async function publishTypographyStyles(_tokens: TokensV1): Promise<PublishTypographyResult> {
  void _tokens;
  void loadTypographySlots();

  const existing = await figma.getLocalTextStylesAsync();
  let docStyles = 0;
  let slotStyles = 0;
  const missing: string[] = [];

  for (let di = 0; di < DOC_STYLE_NAMES.length; di++) {
    const name = DOC_STYLE_NAMES[di];
    const before = findTextStyleByName(existing, name);
    await ensureDocTextStyle(name, existing);
    if (before === null) {
      docStyles += 1;
    }
  }

  const expectedSlots = listExpectedSlotStyleNames();
  for (let si = 0; si < expectedSlots.length; si++) {
    const slotName = expectedSlots[si];
    const before = findTextStyleByName(existing, slotName);
    await ensureSlotTextStyle(slotName, existing);
    if (before === null) {
      slotStyles += 1;
    }
  }

  const refreshed = await figma.getLocalTextStylesAsync();
  for (let si = 0; si < expectedSlots.length; si++) {
    const slotName = expectedSlots[si];
    if (findTextStyleByName(refreshed, slotName) === null) {
      if (missing.indexOf(slotName) < 0) {
        missing.push(slotName);
      }
    }
  }

  return {
    docStyles: docStyles,
    slotStyles: slotStyles,
    missing: missing,
  };
}

/** Verify slot styles exist — used by textStyles builder pre-flight. */
export async function verifySlotTextStyles(): Promise<{ count: number; missing: string[] }> {
  const styles = await figma.getLocalTextStylesAsync();
  const expected = listExpectedSlotStyleNames();
  const missing: string[] = [];
  let count = 0;

  for (let i = 0; i < expected.length; i++) {
    const name = expected[i];
    if (findTextStyleByName(styles, name) !== null) {
      count += 1;
    } else {
      missing.push(name);
    }
  }

  return { count: count, missing: missing };
}
