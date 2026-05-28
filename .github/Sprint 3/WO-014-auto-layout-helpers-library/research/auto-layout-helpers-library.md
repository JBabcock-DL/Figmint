# WO-014 — Auto-layout helpers library (research)

## Summary

WO-014 is the **Sprint 3 foundation ticket** for all style-guide canvas builders (WO-011, WO-012, WO-013) and, later, component scaffold matrix/doc frames (Sprint 5). DesignOps encodes auto-layout invariants as Markdown convention shards plus inlined helpers in `canvas-templates/_lib.js`; FigHub must lift those helpers into typed, unit-tested TypeScript under `src/core/canvas/helpers/`.

**Current FigHub state:** `src/core/canvas/` does **not** exist yet (`src/core/` holds `variables/`, `audit/`, `pluginLog.ts` only). WO-010 audit is **variables-only** (`runAudit('variables')`); canvas geometry rules live in DesignOps `14-audit.md` and are **not** ported yet — WO-014 helpers should be written so a future `runAudit('canvas')` scope can reuse the same invariants.

**Lift source of truth:** Prefer modular `DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js` + `conventions/column-widths.json` over bundled `.mcp.js` files. Cross-reference convention prose in `00-gotchas.md`, `08-hierarchy-and-09-autolayout.md`, `10-column-spec.md`, `11-cells-12-bindings-13-build-order.md`, and `create-component/conventions/03-auto-layout-invariants.md`.

**Build order:** WO-014 must land **before** WO-011 / WO-012 / WO-013 (those tickets already declare `WO-014` as a dependency).

---

## Key Findings

### 1. Two resize/sizing order patterns (not one)

Convention docs describe **two** valid sequences — conflating them is the #1 source of 1px sliver bugs:

| Pattern                | When                                                                  | Order                                                                           | Citations                                                                                 |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Hug-with-reassert**  | Style-guide table body rows, body cells, table-group shells           | Set Hug on height axis → `resize(w, 1)` → **`reassertHug` after `appendChild`** | `00-gotchas.md` §0.1, `_lib.js` `makeBodyRow` / `makeBodyCell` / `rehugRow` / `rehugCell` |
| **Resize-then-sizing** | `COMPONENT` roots, doc shells, matrix roots where resize resets modes | `resize(w, h)` → set `primaryAxisSizingMode` / `counterAxisSizingMode`          | `00-gotchas.md` §0.10, `03-auto-layout-invariants.md` §10.1                               |

`figma.resize()` **silently resets both sizing modes to `FIXED`**. The working table pattern relies on (a) pre-resize Hug assignment **plus** (b) post-append re-assert via `rehug*` — not on pre-resize alone.

PRD FR-SCAF-7 emphasizes resize-then-sizing for component masters; style-guide tables need **both** helpers (or a strategy enum).

### 2. HORIZONTAL vs VERTICAL body cells flip primary/counter axes (§0.1.H)

Default body cells are `VERTICAL`: primary = Hug (height), counter = Fixed (colWidth).

`HORIZONTAL` cells (Theme LIGHT/DARK, spacing/radius PREVIEW, category sub-headers) **invert** the pair: primary = Fixed (colWidth), counter = Hug (height). Using VERTICAL defaults on a HORIZONTAL cell collapses width to content and pins height at 1px — the Theme row misalignment bug.

`_lib.js` `makeBodyCell(colWidth, layoutMode)` branches correctly; any port must preserve this and expose `layoutMode: 'VERTICAL' | 'HORIZONTAL'` on the factory.

### 3. Header cells are a different species (§0.5)

Header cells: `HORIZONTAL` + **FIXED/FIXED** + `resize(colWidth, headerHeight)` **before** appending text. Never the body-cell Hug recipe.

Audit probe `badHeaderCells` flags frames under `header/cell/` with wrong `layoutMode`, non-FIXED counter axis, or `height < 8`.

### 4. Text pipeline is invariant (§0.2)

After every `text.characters = …`:

```ts
text.resize(colWidth - 40, 1); // 40 = paddingLeft 20 + paddingRight 20
text.textAutoResize = 'HEIGHT';
```

Exception: TOC `band-strip/*` count chips use `WIDTH_AND_HEIGHT` (§0.8) — do not apply full-width §0.2 resize.

### 5. Matrix specimen cells (Sprint 5 reuse)

From `03-auto-layout-invariants.md` §10:

- State cells: `HORIZONTAL`, `primaryAxisSizingMode = 'FIXED'`, **`counterAxisSizingMode = 'AUTO'`**, **`minHeight: 72`**
- Row labels: `layoutAlign = 'STRETCH'` so labels track row height when specimens grow
- Usage rows (`doc/component/{name}/usage`): HORIZONTAL with **counter AUTO** (not FIXED)

These belong in `matrixSpecimen.ts` but share core logic with `autoLayout.ts`.

### 6. Column spec is data + validation

`conventions/column-widths.json` is the machine-readable source for 13 table profiles (primitives color ramp through token-overview platform-mapping). Every profile sums to **1640** (`sumTarget`). `columnSpec.ts` should:

- Port JSON as typed `ColumnSpec` records (lift file into FigHub repo, e.g. `src/core/canvas/data/column-widths.json`)
- Export `getColumnSpec(tableKey)` + `assertColumnsSum1640(columns)` for builder use
- Cell **patterns** (swatch, theme dual-preview, preview bar, two-line meta) stay documented in `10-column-spec.md` / §11 — expose as typed `CellPattern` enums + doc comments, not runtime Figma calls

### 7. Build order is a checklist, not one function

`11-cells-12-bindings-13-build-order.md` §13 defines a **7-step** ordered checklist per table:

1. Create outer `doc/table/{slug}` (modes, bindings, `resizeWithoutConstraints(1640, 1)`)
2. Header row + header cells (FIXED/FIXED species)
3. Body frame (no resize; `fills = []`)
4. Data rows (Hug-before-resize + empty fills on row/cell unless preview)
5. Text nodes (characters → resize → `textAutoResize`)
   5b. Primitives swatch bind (§0.7)
6. Strip last-row bottom stroke
7. Conditional `effectStyleId` (skip platform-mapping subtree — §0.9)

`buildOrder.ts` should export typed step constants + a `TableBuildContext` interface that WO-011..013 orchestrators follow — not a monolithic `buildTable()` port (page-specific row builders stay in each builder ticket).

### 8. `_lib.js` helpers to extract (direct lift map)

| Legacy helper                                               | FigHub target                                                            | Notes                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `makeText`                                                  | `helpers/textCell.ts`                                                     | §0.2 pipeline + optional style/fill bind                             |
| `makeHeaderCell`                                            | `helpers/tableCells.ts`                                                   | §0.5                                                                 |
| `makeBodyCell` + `rehugCell`                                | `helpers/tableCells.ts`                                                   | §0.1 + §0.1.H                                                        |
| `makeBodyRow` + `rehugRow`                                  | `helpers/tableCells.ts`                                                   | §0.1                                                                 |
| `buildTable` shell (group + table + header + body scaffold) | `helpers/tableShell.ts` or split across `buildOrder.ts` + `tableCells.ts` | Row content stays page-specific                                      |
| Enum guard (`STRETCH` on child not parent)                  | `helpers/autoLayout.ts`                                                   | §3.1.2                                                               |
| `bindPaintToVar` / `bindStrokeToVar`                        | `helpers/bindings.ts` (or `canvas/bindings.ts`)                           | Shared with builders; not auto-layout but used by every cell factory |

**Out of scope for WO-014:** variable map / canonical path resolution (`ensureLocalVariableMapOnCtx`, `resolvePath`, …) — stays in variables layer or per-builder context.

### 9. Drift: `_lib.js` vs convention prose

When conventions and `_lib.js` disagree, **follow convention prose** for FigHub (legacy `_lib.js` has known drift):

| Property                | `_lib.js` | Conventions (`08`, `10`, `14-audit`) | FigHub decision |
| ----------------------- | --------- | ------------------------------------ | ---------------- |
| Header band height      | 48px      | 56px                                 | **56px**         |
| Body row `minHeight`    | 56        | 64                                   | **64**           |
| Row vertical padding    | 24        | 16                                   | **16**           |
| Cell horizontal padding | 16        | 20                                   | **20**           |

Document these locked numbers in helper constants (`TABLE_HEADER_HEIGHT = 56`, etc.).

### 10. Testing strategy

- Existing Vitest setup: `tests/**/*.test.ts`, jsdom — **no Figma frame mock yet** (only `tests/unit/core/variables/__mocks__/figmaVariables.ts` for variables).
- WO-014 needs `tests/unit/core/canvas/__mocks__/figmaFrames.ts` that models:
  - `resize()` resetting `primaryAxisSizingMode` / `counterAxisSizingMode` to `'FIXED'`
  - `appendChild` optionally flipping `layoutSizingVertical` to `'FIXED'`
- Unit tests assert **call order** and **final property state** on mock frames — no live Figma required.
- Acceptance “no 1px masters” → test frames with tall children end with `height > 2` and counter/primary AUTO where expected.

### 11. Audit overlap (WO-010)

WO-010 `src/core/audit/` implements **16 variable rules** only. Canvas rules from `14-audit.md` (badHeaderCells, badTableText, badPageContent, badTableGroups, 1px sliver probes) are **future** `runAudit('canvas')` work — likely WO-010 extension or a sibling ticket after WO-011 proves builders.

WO-014 should export **pure assertion helpers** (e.g. `assertNoOnePxSliver(frame)`, `assertHeaderCellGeometry(cell)`) that builders use in tests now and audit can call later.

### 12. ES2017 / main-thread constraints

Per `memory.md`: plugin main thread must avoid `?.`, `??`, `replaceAll`. Helpers run in Figma sandbox — same constraint applies.

Use `pluginLog()` not `console.debug` on main thread.

---

## Recommendations

### Module layout (proposed)

```
src/core/canvas/
  constants.ts                 # 1640, 1800, header 56, row minHeight 64, padding tokens
  data/column-widths.json      # lifted from DesignOps conventions
  helpers/
    autoLayout.ts              # resize-then-sizing, hug-with-reassert, enum guards, no-1px assert
    textCell.ts                # configureTableText (§0.2), band-strip exception flag
    tableCells.ts              # makeHeaderCell, makeBodyCell, makeBodyRow, rehug*
    tableShell.ts              # createTableGroup, createTableRoot, createHeaderRow, createBody (no rows)
    matrixSpecimen.ts          # createMatrixStateCell, createUsageRow, label stretch
    columnSpec.ts              # typed column profiles + sum validator
    buildOrder.ts              # TableBuildStep enum, chrome binding map (§12), step checklist (§13)
  index.ts                     # re-exports
tests/unit/core/canvas/
  __mocks__/figmaFrames.ts
  autoLayout.test.ts
  tableCells.test.ts
  columnSpec.test.ts
  matrixSpecimen.test.ts
```

### API highlights for `/plan`

1. **`resizeThenApplySizing(frame, w, h, sizing)`** — §10.1 / §0.10 pattern for COMPONENT and doc roots.
2. **`createHugFrame(frame, axisConfig)` + `reassertHug(frame)`** — §0.1 table rows/cells with post-append call.
3. **`createHeaderCell(colWidth, label, …)`** — FIXED/FIXED, height 56, never Hug.
4. **`createBodyCell(colWidth, 'VERTICAL' | 'HORIZONTAL')`** — axis flip built-in.
5. **`configureTableText(text, colWidth, opts?)`** — §0.2; `opts.bandStrip?: boolean` for §0.8.
6. **`assertNoOnePxMaster(frame)`** — width > 40 && height ≤ 2 with children → throw or audit violation.
7. **`getColumnSpec(key)`** + **`validateColumnWidths(columns)`** — throws if sum ≠ 1640.

### Dependencies

- **WO-002** (scaffold) — satisfied.
- **No dependency on WO-008** for helper code itself; builders need variables pushed first.
- **Blocks:** WO-011, WO-012, WO-013, indirectly WO-015 (Bootstrap tab orchestration).

### Out of scope (confirm in plan)

- Full `buildTable()` with page-specific row manifests
- Variable resolution / alias walking
- Canvas audit scope in WO-010 (defer; export assert helpers now)
- UI-thread helpers
- TOC / Token Overview page builders (later tickets)

---

## Open Questions

1. **Single `resizeWithAutoLayout` vs two explicit APIs?** Ticket text implies one function; research shows two patterns. Recommend two named functions + shared types — update ticket requirements accordingly.
2. **`tableShell.ts` vs folding shell into `buildOrder.ts`?** Shell creation is ~80 lines in `_lib.js` `buildTable`; splitting avoids a god-module but adds a file — decide in `/plan`.
3. **Where to put `bindPaintToVar` / `bindStrokeToVar`?** Needed by cell factories; could live in `src/core/canvas/bindings.ts` or reuse a future shared binding module — avoid circular imports with `variables/`.
4. **Header height drift in golden Figma files:** If Plugin Sandbox tables were drawn with `_lib.js` 48px headers, VQA may show 8px delta vs convention 56px — confirm whether to match conventions (recommended) or match existing sandbox artifacts.
5. **Canvas audit timing:** Extend WO-010 in Sprint 3 vs new WO — does not block WO-014 build but affects whether assert helpers target `AuditReportV1` shape now or later.
