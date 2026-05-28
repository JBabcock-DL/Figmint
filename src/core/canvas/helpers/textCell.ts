import { TEXT_INSET_HORIZONTAL } from '../constants';

export interface ConfigureTableTextOptions {
  /** §0.8 TOC band-strip exception — use WIDTH_AND_HEIGHT instead of HEIGHT-only */
  bandStrip?: boolean;
}

/**
 * §0.2 — after caller sets `characters`, resize to column text width then auto-resize height.
 */
export function configureTableText(
  text: TextNode,
  colWidth: number,
  opts?: ConfigureTableTextOptions,
): void {
  text.resize(colWidth - TEXT_INSET_HORIZONTAL, 1);
  const bandStrip = opts !== undefined && opts.bandStrip === true;
  if (bandStrip) {
    text.textAutoResize = 'WIDTH_AND_HEIGHT';
  } else {
    text.textAutoResize = 'HEIGHT';
  }
}

/**
 * §0 — table cell text hugs line height; fills horizontal inset only.
 * Call after `appendChild` into a header/body cell (not before).
 */
export function applyTableTextLayout(text: TextNode): void {
  text.layoutSizingHorizontal = 'FILL';
  text.layoutSizingVertical = 'HUG';
}
