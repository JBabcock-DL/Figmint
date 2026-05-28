import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { listExpectedSlotStyleNames } from '@/core/canvas/data/loadCanvasData';
import { pluginLog } from '@/core/pluginLog';
import {
  applyTypographyVariableBindings,
  buildTypographyBindingContext,
  DOC_STYLE_TOKEN_PREFIX,
  resolveSlotBindingTarget,
} from '@/core/canvas/typographyStyleBinding';

export interface PublishTypographyResult {
  docStyles: number;
  slotStyles: number;
  missing: string[];
  boundStyles: number;
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

async function ensureTextStyle(name: string, existing: TextStyle[]): Promise<TextStyle> {
  const found = findTextStyleByName(existing, name);
  if (found !== null) {
    return found;
  }
  const style = figma.createTextStyle();
  style.name = name;
  return style;
}

/**
 * Publish `_Doc/*` + 27 slot text styles bound to Typography mode-100 variables.
 * Called by bootstrap orchestrator (WO-015) before canvas draw — not inline in builders.
 */
export async function publishTypographyStyles(_tokens: TokensV1): Promise<PublishTypographyResult> {
  void _tokens;

  const bindingCtx = await buildTypographyBindingContext();
  const existing = await figma.getLocalTextStylesAsync();
  let docStyles = 0;
  let slotStyles = 0;
  let boundStyles = 0;
  const missing: string[] = [];

  for (let di = 0; di < DOC_STYLE_NAMES.length; di++) {
    const name = DOC_STYLE_NAMES[di];
    const before = findTextStyleByName(existing, name);
    const style = await ensureTextStyle(name, existing);
    if (before === null) {
      docStyles += 1;
    }
    if (bindingCtx !== null) {
      const prefix = DOC_STYLE_TOKEN_PREFIX[name];
      if (prefix !== undefined) {
        await applyTypographyVariableBindings(
          style,
          { tokenPrefix: prefix, weightPath: prefix + '/font-weight', variant: null },
          bindingCtx,
        );
        boundStyles += 1;
      }
    }
  }

  const expectedSlots = listExpectedSlotStyleNames();
  for (let si = 0; si < expectedSlots.length; si++) {
    const slotName = expectedSlots[si];
    const before = findTextStyleByName(existing, slotName);
    const style = await ensureTextStyle(slotName, existing);
    if (before === null) {
      slotStyles += 1;
    }
    if (bindingCtx !== null) {
      const target = resolveSlotBindingTarget(slotName);
      await applyTypographyVariableBindings(style, target, bindingCtx);
      boundStyles += 1;
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

  pluginLog('[publishTypographyStyles] done', {
    docStyles: docStyles,
    slotStyles: slotStyles,
    boundStyles: boundStyles,
    missing: missing.length,
  });

  return {
    docStyles: docStyles,
    slotStyles: slotStyles,
    missing: missing,
    boundStyles: boundStyles,
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
