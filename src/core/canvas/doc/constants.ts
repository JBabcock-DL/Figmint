/** Doc-pipeline layout constants — `04-doc-pipeline-contract.md` + `cc-doc-constants.js`. */
export const DOC_FRAME_WIDTH = 1640;

/** Matrix size-label gutter (px). */
export const GUTTER_W_SIZE = 60;

/** Matrix variant-label gutter (px). */
export const GUTTER_W_VARIANT = 160;

/** Dashed matrix / set-group corner radius (px). */
export const MATRIX_CORNER_RADIUS = 16;

/** Dashed stroke pattern for matrix and component-set outlines. */
export const DASH_PATTERN = [6, 4] as const;

/** Vertical spacing between doc sections under `doc/component/${docKey}`. */
export const SECTION_ITEM_SPACING = 48;

/** Per-cell instance opacity for matrix state columns — §13.1.a verbatim. */
export const STATE_OPACITY = { hover: 0.92, pressed: 0.85, disabled: 0.5 } as const;
