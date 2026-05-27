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
 * Hook for WO-012 doc style assignment — no-op until typography builders wire styles.
 */
export function applyDocStyle(_text: TextNode, _styleName: string): void {
  return;
}
