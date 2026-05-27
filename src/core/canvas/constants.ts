/**
 * Locked style-guide geometry (convention prose wins over legacy `_lib.js` drift).
 *
 * | Property              | `_lib.js` | Conventions (08, 10, 14) | Figmint |
 * | --------------------- | --------- | ------------------------ | ------- |
 * | Header band height    | 48px      | 56px                     | 56      |
 * | Body row minHeight    | 56        | 64                       | 64      |
 * | Row vertical padding  | 24        | 16                       | 16      |
 * | Cell horizontal pad   | 16        | 20                       | 20      |
 */
export const TABLE_WIDTH = 1640;

/** `03-through-07-geometry-and-doc-styles.md` page content column */
export const PAGE_CONTENT_WIDTH = 1800;

/** `08-hierarchy` / `14-audit` header band — not `_lib.js` 48 */
export const TABLE_HEADER_HEIGHT = 56;

/** `00-gotchas` §0.1 body row minimum — not `_lib.js` 56 */
export const TABLE_ROW_MIN_HEIGHT = 64;

/** `00-gotchas` §0.2 cell padding horizontal — not `_lib.js` 16 */
export const CELL_PADDING_HORIZONTAL = 20;

/** `00-gotchas` §0.2 cell padding vertical */
export const CELL_PADDING_VERTICAL = 4;

/** `00-gotchas` §0.1 row padding vertical — not `_lib.js` 24 */
export const ROW_PADDING_VERTICAL = 16;

/** paddingLeft 20 + paddingRight 20 for §0.2 text resize width */
export const TEXT_INSET_HORIZONTAL = 40;
