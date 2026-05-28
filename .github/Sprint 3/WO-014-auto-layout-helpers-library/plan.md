# Plan — WO-014: Auto-layout helpers library

## Approach

Create `src/core/canvas/` as the **typed, Vitest-covered foundation** for all Sprint 3 style-guide builders. Port invariant logic from DesignOps `canvas-templates/_lib.js` cell/shell helpers and convention shards — **not** variable-map resolution, page-specific row content, or bundled `.mcp.js` files. Implement **two explicit resize APIs** (never a single `resizeWithAutoLayout` that conflates patterns). Lock geometry to **convention prose** when `_lib.js` drifts (56px headers, 64px row minHeight, 20px cell padding H). Main-thread code stays ES2017-safe; use `pluginLog()` not `console.debug`.

**Drift guard (read before every step):** `Docs/lift-sources.md` §0 — do **not** treat `step-15*.mcp.js` as source; do **not** copy spike code from deleted `src/spike/`.

---

## Steps

### Foundation — constants, data, types

- [x] **Step 1** — Create directory scaffold:

  ```
  src/core/canvas/
    constants.ts
    types.ts
    data/column-widths.json
    helpers/
    index.ts
  tests/unit/core/canvas/
    __mocks__/figmaFrames.ts
  ```

  **Done when:** `npm run typecheck` passes with empty barrel exports.

- [x] **Step 2** — Implement `src/core/canvas/constants.ts` with **exact** locked values (convention prose wins over `_lib.js`):

  | Export                    | Value  | Citation                                              |
  | ------------------------- | ------ | ----------------------------------------------------- |
  | `TABLE_WIDTH`             | `1640` | `10-column-spec.md`                                   |
  | `PAGE_CONTENT_WIDTH`      | `1800` | `03-through-07-geometry-and-doc-styles.md`            |
  | `TABLE_HEADER_HEIGHT`     | `56`   | `08-hierarchy` / `14-audit.md` (NOT `_lib.js` 48)     |
  | `TABLE_ROW_MIN_HEIGHT`    | `64`   | §0.1 (NOT `_lib.js` 56)                               |
  | `CELL_PADDING_HORIZONTAL` | `20`   | §0.2 (NOT `_lib.js` 16)                               |
  | `CELL_PADDING_VERTICAL`   | `4`    | §0.2                                                  |
  | `ROW_PADDING_VERTICAL`    | `16`   | §0.1 (NOT `_lib.js` 24)                               |
  | `TEXT_INSET_HORIZONTAL`   | `40`   | paddingLeft 20 + paddingRight 20 for §0.2 text resize |

  **Done when:** constants exported; comment block cites drift table from research.

- [x] **Step 3** — Copy verbatim `DesignOps-plugin/skills/create-design-system/conventions/column-widths.json` → `src/core/canvas/data/column-widths.json`. Add `src/core/canvas/types.ts`:

  ```ts
  export type ColumnDef = { id: string; width: number };
  export type ColumnTableKey =
    | 'primitives/color-ramp'
    | 'primitives/space'
    | 'primitives/radius'
    | 'primitives/elevation'
    | 'primitives/typeface'
    | 'primitives/font-weight'
    | 'theme/semantic-group'
    | 'layout/spacing'
    | 'layout/radius'
    | 'typography/styles'
    | 'effects/shadows'
    | 'effects/color'
    | 'token-overview/platform-mapping';

  export type AxisSizing = {
    primaryAxisSizingMode: 'FIXED' | 'HUG' | 'AUTO';
    counterAxisSizingMode: 'FIXED' | 'HUG' | 'AUTO';
  };

  export type BodyCellLayoutMode = 'VERTICAL' | 'HORIZONTAL';
  ```

  **Done when:** all 13 keys typed; JSON parses at import time.

- [x] **Step 4** — Implement `src/core/canvas/helpers/columnSpec.ts`:
  - `getColumnSpec(tableKey: ColumnTableKey): ColumnDef[]`
  - `validateColumnWidths(columns: ColumnDef[]): void` — throws `Error('Column widths sum to ${sum}, expected 1640')` if sum ≠ `sumTarget`
  - `getColumnWidth(tableKey, columnId): number` — convenience for builders
  - Unit test iterates all 13 keys and asserts sum === 1640

  **Done when:** `tests/unit/core/canvas/columnSpec.test.ts` green for all profiles.

### Frame mock + autoLayout core

- [x] **Step 5** — Implement `tests/unit/core/canvas/__mocks__/figmaFrames.ts`:
  - `MockFrame` class implementing minimal `FrameNode` surface used by helpers: `resize`, `appendChild`, `primaryAxisSizingMode`, `counterAxisSizingMode`, `layoutMode`, `layoutSizingVertical`, `layoutSizingHorizontal`, `minHeight`, `children`, `width`, `height`
  - **`resize(w, h)` MUST reset both sizing modes to `'FIXED'`** (models Figma bug/behavior)
  - **`appendChild`** optionally sets `layoutSizingVertical = 'FIXED'` on child (configurable flag for tests)
  - Export `createMockFrame(overrides?)` factory

  **Done when:** mock used by at least one test demonstrating resize-reset behavior.

- [x] **Step 6** — Implement `src/core/canvas/helpers/autoLayout.ts`:

  | Function                                                         | Behavior                                                                                                            | Lift from                                   |
  | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
  | `resizeThenApplySizing(frame, w, h, sizing: AxisSizing)`         | `frame.resize(w,h)` then assign both sizing modes                                                                   | §0.10, `03-auto-layout-invariants.md` §10.1 |
  | `createHugFrame(opts)`                                           | Create/auto-config frame with Hug on height axis before resize                                                      | §0.1                                        |
  | `reassertHug(frame, axis: 'vertical' \| 'horizontal' \| 'both')` | Re-apply Hug after appendChild                                                                                      | `_lib.js` `rehugCell` / `rehugRow`          |
  | `assertValidAxisAlign(parent)`                                   | Throw if `primaryAxisAlignItems === 'STRETCH'` or counter STRETCH on parent                                         | §3.1.2                                      |
  | `assertNoOnePxMaster(frame)`                                     | If `width > 40 && height <= 2 && children.length > 0` → return violation object (do not throw — audit will consume) | FR-SCAF-7, `14-audit.md`                    |
  | `assertHeaderCellGeometry(cell)`                                 | HORIZONTAL, both FIXED, height >= 8                                                                                 | §0.5                                        |

  **Done when:** `autoLayout.test.ts` asserts (1) resize-then-sizing call order via spy, (2) reassertHug restores Hug after mock appendChild reset, (3) assertNoOnePxMaster flags 1px frame with tall child.

### Cell factories + text pipeline

- [x] **Step 7** — Implement `src/core/canvas/helpers/textCell.ts`:
  - `configureTableText(text: TextNode, colWidth: number, opts?: { bandStrip?: boolean })`
  - Default: after caller sets `characters`, call `text.resize(colWidth - TEXT_INSET_HORIZONTAL, 1)` then `text.textAutoResize = 'HEIGHT'`
  - `bandStrip: true` → `textAutoResize = 'WIDTH_AND_HEIGHT'` (§0.8 TOC exception only)
  - Optional `applyDocStyle(text, styleName)` hook signature for WO-012 (no-op stub OK)

  **Done when:** unit test verifies resize width = colWidth - 40.

- [x] **Step 8** — Implement `src/core/canvas/helpers/tableCells.ts`:

  | Function                                          | Spec                                                                                                                              |
  | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
  | `createHeaderCell(colWidth, labelText)`           | HORIZONTAL, FIXED/FIXED, `resize(colWidth, TABLE_HEADER_HEIGHT)` **before** text append, §0.5                                     |
  | `createBodyCell(colWidth, layoutMode)`            | VERTICAL: primary HUG height, counter FIXED width. HORIZONTAL (§0.1.H): primary FIXED width, counter HUG height — **invert axes** |
  | `createBodyRow(tokenPath, borderVariable?)`       | HORIZONTAL row, counter AUTO, primary FIXED `TABLE_WIDTH`, minHeight 64, padding V=16, Hug-before-resize                          |
  | `reassertBodyCell(cell)` / `reassertBodyRow(row)` | thin wrappers → `reassertHug`                                                                                                     |

  Node naming: cells under `body/cell/{columnId}/`, rows under `body/row/{tokenPath-with-slashes-as-name}/` per `08-hierarchy`.

  **Done when:** `tableCells.test.ts` covers VERTICAL vs HORIZONTAL axis assignment and header FIXED/FIXED.

- [x] **Step 9** — Implement `src/core/canvas/helpers/bindings.ts` (paint only — no variable map):
  - `bindPaintToVar(node: GeometryMixin, variable: Variable): void` — clone existing solid fill → `figma.variables.setBoundVariableForPaint` → reassign `fills` array (§0.7)
  - `bindStrokeToVar(node, variable)` — same for strokes
  - Accept pre-resolved `Variable` reference; **do not** import path resolution from variables layer

  **Done when:** unit test with mock Variable + mock node verifies `setBoundVariableForPaint` called before fills reassigned (spy on mock).

### Table shell + build order + matrix (Sprint 5 reuse)

- [x] **Step 10** — Implement `src/core/canvas/helpers/tableShell.ts` (shell only — **no data rows**):
  - `createTableGroup(slug: string): FrameNode` → `doc/table-group/{slug}`
  - `createTableRoot(slug: string): FrameNode` → `doc/table/{slug}` with `resizeWithoutConstraints(TABLE_WIDTH, 1)` per §13 step 1
  - `createHeaderRow(table: FrameNode, columns: ColumnDef[]): FrameNode` → `header/row` + header cells via `createHeaderCell`
  - `createEmptyBody(table: FrameNode): FrameNode` → `body` frame, `fills = []`, no resize on body

  **Done when:** integration-style unit test builds shell hierarchy names matching `08-hierarchy-and-09-autolayout.md`.

- [x] **Step 11** — Implement `src/core/canvas/helpers/buildOrder.ts`:
  - Export `TableBuildStep` enum: `CreateTableRoot`, `CreateHeader`, `CreateBody`, `AppendDataRows`, `ConfigureText`, `BindSwatches`, `StripLastRowStroke`, `ApplyTableEffect`
  - Export `TABLE_CHROME_BINDINGS: Record<string, { path: string; collection: string; mode?: string }>` from §12 (border subtle, background default, content, etc.)
  - Export `TableBuildContext` interface (table slug, columns, chrome variable map passed by builder — **no Figma calls inside**)
  - Document §0.9: skip `effectStyleId` on `token-overview/platform-mapping` subtree

  **Done when:** typed checklist exported; JSDoc references §13 step numbers.

- [x] **Step 12** — Implement `src/core/canvas/helpers/matrixSpecimen.ts` (Sprint 5 reuse — still required by ticket):
  - `createMatrixStateCell(colWidth, minHeight = 72)` — HORIZONTAL, primary FIXED, counter AUTO + minHeight
  - `createHorizontalUsageRow(width)` — counter AUTO for Do/Don't rows §10.2
  - `stretchLabelInMatrixRow(labelFrame)` — child `layoutAlign = 'STRETCH'`

  **Done when:** `matrixSpecimen.test.ts` asserts counter AUTO + minHeight 72.

### Barrel + CI

- [x] **Step 13** — Implement `src/core/canvas/index.ts` re-exporting public API:

  ```ts
  export * from './constants';
  export * from './types';
  export * from './helpers/autoLayout';
  export * from './helpers/textCell';
  export * from './helpers/tableCells';
  export * from './helpers/tableShell';
  export * from './helpers/columnSpec';
  export * from './helpers/buildOrder';
  export * from './helpers/bindings';
  export * from './helpers/matrixSpecimen';
  ```

  Add `src/core/index.ts` re-export if not present: `export * from './canvas';`

  **Done when:** WO-011 can `import { createBodyCell, getColumnSpec } from '@/core/canvas'`.

- [x] **Step 14** — Complete Vitest suite under `tests/unit/core/canvas/`:

  | File                     | Minimum assertions                                   |
  | ------------------------ | ---------------------------------------------------- |
  | `columnSpec.test.ts`     | 13 tables sum 1640                                   |
  | `autoLayout.test.ts`     | resize-then-sizing, reassertHug, assertNoOnePxMaster |
  | `tableCells.test.ts`     | header geometry, HORIZONTAL flip, row minHeight      |
  | `textCell.test.ts`       | §0.2 width, bandStrip exception                      |
  | `matrixSpecimen.test.ts` | counter AUTO, minHeight                              |

  **Done when:** `npm run test` passes; no live Figma required.

- [x] **Step 15** — CI hygiene: `npm run typecheck`, `lint`, `format:check`, `test`, `build:community` all green. Check off `ticket.md` acceptance criteria. Add note to `plan.md` Notes if Plugin Sandbox golden files used 48px headers (expected 8px VQA delta vs 56px — **do not revert to 48**).

  _ticket.md AC checkboxes deferred to `/vqa` — orchestrator build instructions._

---

## Build Agents

### Phase 1 (parallel)

- `code-build` — Steps 1–4: scaffold, constants, types, column-widths JSON + columnSpec + tests

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 5–6: figmaFrames mock + autoLayout.ts + tests

### Phase 3 (parallel, after Phase 2)

- `code-build` — Steps 7–9: textCell, tableCells, bindings + tests
- `code-build` — Steps 10–12: tableShell, buildOrder, matrixSpecimen + tests

### Phase 4 (sequential, after Phase 3)

- `code-build` — Steps 13–15: index exports, full test pass, CI, ticket checkoff

---

## Dependencies & Tools

| Dependency | Role                                                                  |
| ---------- | --------------------------------------------------------------------- |
| **WO-002** | Plugin scaffold, ES2017 esbuild target, Vitest harness                |
| **Blocks** | WO-011, WO-012, WO-013 (hard gate — no inline `resize()` in builders) |

**Lift sources (read one at a time — never load `.mcp.js` bundles):**

| Legacy                                                           | FigHub                              |
| ---------------------------------------------------------------- | ------------------------------------ |
| `_lib.js` `makeBodyCell`, `rehugCell`, `makeBodyRow`, `rehugRow` | `tableCells.ts` + `autoLayout.ts`    |
| `_lib.js` `bindPaintToVar`, `bindStrokeToVar`                    | `bindings.ts`                        |
| `conventions/column-widths.json`                                 | `data/column-widths.json`            |
| `00-gotchas.md` §0.1–§0.2, §0.5, §0.8, §0.10                     | comments + test cases                |
| `08-hierarchy-and-09-autolayout.md` §9                           | node naming in tableCells/tableShell |
| `11-cells-12-bindings-13-build-order.md` §12–§13                 | buildOrder.ts                        |
| `03-auto-layout-invariants.md` §10                               | matrixSpecimen.ts                    |

**Out of scope (do not implement in WO-014):**

- `ensureLocalVariableMap`, `resolvePath`, `buildPageContent`, `buildTable` with row manifests
- `runAudit('canvas')` wiring (export assert helpers only)
- UI iframe code

**MCP:** Not required. No Figma MCP for DoD.

---

## Open Questions

1. **Two APIs vs one** — **RESOLVED:** `resizeThenApplySizing` + `createHugFrame`/`reassertHug` only.
2. **`tableShell.ts` placement** — **RESOLVED:** separate module from `buildOrder.ts`.
3. **Bindings location** — **RESOLVED:** `helpers/bindings.ts`.
4. **Sandbox 48px headers** — **RESOLVED:** ship 56px; document VQA delta.

---

## Notes

### Build state (planning → build handoff)

An aborted `/build` may have left **partial** files under `src/core/canvas/` (helpers without tests). `/build` must run each step **Done when** before checking off — do not assume Steps 1–12 complete.

### Build fixes (2026-05-27 code-build)

Partial implementation from an aborted build failed 3 Vitest cases (`tableCells` VERTICAL/HORIZONTAL counter-axis AUTO, `matrixSpecimen` usage row). Root cause: `createHugFrame` set sizing modes **before** `resize()`, but Figma (and the mock) reset both axes to `FIXED` on resize per §0.10. **Fix:** re-apply Hug axis pair (`AUTO`/`FIXED` or `FIXED`/`AUTO`) immediately after `resize()` in `createHugFrame`; route `createHorizontalUsageRow` through `createHugFrame`. Extended `MockFrame.appendChild` to reset parent Hug axis to `FIXED` so `reassertHug` tests model post-append drift. Added `src/core/canvas/**` to ESLint ES2017-safe override (with variables/audit). Header height remains **56px** per convention prose — no Plugin Sandbox golden run in this build; expect 8px VQA delta vs legacy 48px sandbox files.

**CI:** all five legs green (149 tests). Minor lint/format fixes in adjacent audit/push/io files required for repo-wide `format:check`.

### ES2017 checklist (all `src/core/canvas/**` main-thread code)

- No `?.`, `??`, `replaceAll`
- Explicit null checks: `if (x !== undefined && x !== null)`
- Timing: `Date.now()` if needed; logging: `pluginLog()` from `@/core/pluginLog`

### Drift corrections agents must not repeat

| Wrong                                   | Correct                                                 |
| --------------------------------------- | ------------------------------------------------------- |
| Port from `step-15a-primitives.mcp.js`  | Port cell helpers from `_lib.js` + conventions          |
| Use `_lib.js` header height 48          | Use `TABLE_HEADER_HEIGHT = 56`                          |
| Single resize helper for all frames     | Two patterns per §0.1 vs §0.10                          |
| Implement variable path resolution here | Builders pass resolved `Variable` into `bindPaintToVar` |

### References

- Ticket: `./ticket.md`
- Research: `./research/auto-layout-helpers-library.md`
- Plan quality bar: `.github/templates/plan-quality-bar.md`
- Lift map: `Docs/lift-sources.md` §0, §3–§4

---

## Requirement traceability

| Ticket requirement                               | Plan step(s)   |
| ------------------------------------------------ | -------------- |
| F1 `constants.ts` locked geometry                | Step 2         |
| F2 `autoLayout.ts` — resize APIs + asserts       | Steps 4, 6     |
| F3 `textCell.ts` §0.2 pipeline                   | Step 7         |
| F4 `tableCells.ts` header/body/row + reassertHug | Step 8         |
| F5 `tableShell.ts` scaffold                      | Step 10        |
| F6 `matrixSpecimen.ts`                           | Step 12        |
| F7 `columnSpec.ts` + JSON lift                   | Steps 3–4      |
| F8 `buildOrder.ts` steps + chrome bindings       | Step 11        |
| F9 `index.ts` re-exports                         | Step 13        |
| F10 Vitest + figmaFrames mock                    | Steps 5, 12–14 |

| Acceptance criterion                       | Plan step(s)                                                 |
| ------------------------------------------ | ------------------------------------------------------------ |
| AC1 helpers/ + index exist                 | Steps 10–13                                                  |
| AC2 Builders import helpers not raw resize | Documented in Notes; enforced in sibling tickets' grep steps |
| AC3 Vitest coverage list                   | Steps 5–6, 8, 12, 14                                         |
| AC4 column-widths 13 profiles sum 1640     | Steps 3–4                                                    |
| AC5 Locked constants 56/64/20              | Step 2                                                       |
| AC6 CI clean                               | Step 15                                                      |

| User story                      | Plan step(s)       |
| ------------------------------- | ------------------ |
| Builder authors import helpers  | Steps 8–13 exports |
| Sprint 5 matrix reuse           | Step 12            |
| Maintainer Vitest without Figma | Steps 5, 14        |

---

## Planning sign-off

- [x] All Functional requirements + AC mapped to Steps 1–15
- [x] Build Agents assigns every step once across Phases 1–4
- **Planning complete** — ready for `/build` (verify partial tree if present)
