---
type: work-order
github_issue: 17
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JAc
---

## Goal

Encode the auto-layout gotchas + invariants from DesignOps-plugin's convention shards as a typed helper library in `src/core/canvas/helpers/`. Every canvas builder uses these helpers so the gotchas (e.g. `resize()` resetting sizing modes, matrix specimen counter-axis AUTO) disappear from prompt rules and become unit-tested functions.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-7.

---

## Problem story

Style-guide and component doc draws in DesignOps depend on ~15 convention shards and inlined `_lib.js` helpers to avoid 1px sliver / 10px collapse bugs. FigHub has no `src/core/canvas/` yet; WO-011..013 would re-implement these rules ad hoc without this library. WO-014 ports the invariant logic once, with Vitest coverage and locked geometry constants, so all Sprint 3 canvas builders and Sprint 5 matrix/doc frames share one source of truth.

---

## User stories

- [ ] As a canvas builder author (WO-011..013), I import table/cell/text helpers instead of calling raw `resize()` on auto-layout frames.
- [ ] As a component scaffold author (Sprint 5), I reuse matrix specimen + resize-then-sizing helpers for variant matrix cells.
- [ ] As a maintainer, I run unit tests that fail when resize/sizing order regresses — without opening Figma.

---

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. **`src/core/canvas/constants.ts`** — locked geometry tokens: `TABLE_WIDTH = 1640`, `PAGE_CONTENT_WIDTH = 1800`, `TABLE_HEADER_HEIGHT = 56`, `TABLE_ROW_MIN_HEIGHT = 64`, cell padding H=20 / V=4, row padding V=16 (convention prose wins over `_lib.js` drift).
2. **`src/core/canvas/helpers/autoLayout.ts`**
   - `resizeThenApplySizing(frame, w, h, sizing)` — resize **then** set modes (§0.10 / `03-auto-layout-invariants.md` §10.1) for COMPONENT roots and doc shells.
   - `createHugFrame` + `reassertHug(frame)` — Hug-before-resize + post-`appendChild` re-assert (§0.1; mirrors `_lib.js` `rehugRow` / `rehugCell`).
   - `assertValidAxisAlign(parent)` — reject `'STRETCH'` on `primaryAxisAlignItems` / `counterAxisAlignItems` (§3.1.2).
   - `assertNoOnePxMaster(frame)` — flag frames with `width > 40`, `height ≤ 2`, and taller children (FR-SCAF-7 / §14 audit symptom).
3. **`src/core/canvas/helpers/textCell.ts`** — `configureTableText(text, colWidth, opts?)`: after `characters`, `resize(colWidth - 40, 1)` → `textAutoResize = 'HEIGHT'` (§0.2); `opts.bandStrip: true` → `WIDTH_AND_HEIGHT` (§0.8 TOC exception).
4. **`src/core/canvas/helpers/tableCells.ts`**
   - `createHeaderCell(colWidth, label, …)` — HORIZONTAL + FIXED/FIXED + `resize(colWidth, 56)` before text append (§0.5).
   - `createBodyCell(colWidth, layoutMode: 'VERTICAL' | 'HORIZONTAL')` — axis flip for HORIZONTAL cells (§0.1.H).
   - `createBodyRow(tokenPath, …)` — HORIZONTAL, counter AUTO, primary FIXED 1640, Hug-before-resize, `minHeight 64`, padding V=16 (§0.1).
   - `reassertHug` exported for row and cell frames.
5. **`src/core/canvas/helpers/tableShell.ts`** (or equivalent) — scaffold only: `doc/table-group/{slug}`, outer `doc/table/{slug}`, header row frame, empty body — no page-specific row content (§08 hierarchy + §13 steps 1–3).
6. **`src/core/canvas/helpers/matrixSpecimen.ts`**
   - `createMatrixStateCell(colWidth, minHeight = 72)` — HORIZONTAL, primary FIXED, **counter AUTO** + minHeight (§10 state cells).
   - `createHorizontalUsageRow(width)` — counter AUTO for Do/Don't usage rows (§10.2).
   - `stretchLabelInMatrixRow(labelFrame)` — child `layoutAlign = 'STRETCH'` (§10 row-label).
7. **`src/core/canvas/helpers/columnSpec.ts`**
   - Lift `column-widths.json` to `src/core/canvas/data/column-widths.json`.
   - `getColumnSpec(tableKey)` returns typed `{ id, width }[]` for all 13 table profiles.
   - `validateColumnWidths(columns)` throws if sum ≠ 1640.
8. **`src/core/canvas/helpers/buildOrder.ts`**
   - Export `TableBuildStep` ordered checklist matching §13 (7 steps incl. 5b swatch bind + conditional shadow).
   - Export `TABLE_CHROME_BINDINGS` map from §12 (chrome element → variable path + collection/mode).
   - Document §0.9 platform-mapping shadow exclusion in constants/comments.
9. **`src/core/canvas/index.ts`** — re-export public API for WO-011..013.
10. **Unit tests** under `tests/unit/core/canvas/` with `__mocks__/figmaFrames.ts` modeling `resize()` resetting sizing modes and post-append flips. Cover: resize-then-sizing order, Hug+reassert, HORIZONTAL cell axis flip, header FIXED/FIXED, column sum validation, counter-axis AUTO on matrix cells, `assertNoOnePxMaster`.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `skills/create-design-system/canvas-templates/_lib.js` — `makeText`, `makeHeaderCell`, `makeBodyCell`, `rehugCell`, `makeBodyRow`, `rehugRow`, `buildTable` shell
  - `skills/create-design-system/conventions/column-widths.json`
  - `skills/create-design-system/conventions/00-gotchas.md` §0.1–§0.2, §0.5, §0.8, §0.10
  - `skills/create-design-system/conventions/08-hierarchy-and-09-autolayout.md` §9
  - `skills/create-design-system/conventions/10-column-spec.md`, `11-cells-12-bindings-13-build-order.md` §12–§13
  - `skills/create-component/conventions/03-auto-layout-invariants.md` §3.1.2, §10–§10.2
  - `skills/create-design-system/conventions/14-audit.md` — probe definitions (inform assert helpers; full canvas audit scope deferred)
- **Target layout:** `src/core/canvas/{constants.ts, data/, helpers/, index.ts}` per PRD §7.3.
- **Main-thread constraints:** ES2017-safe syntax; `pluginLog()` not `console.debug`.
- **Dependencies:** WO-002 (scaffold). **Blocks:** WO-011, WO-012, WO-013.

---

## Acceptance criteria _(definition of done)_

- [ ] `src/core/canvas/helpers/` exists with all modules listed in Functional requirements; `src/core/canvas/index.ts` re-exports public API.
- [ ] Every canvas builder ticket (WO-011, WO-012, WO-013) can import table/cell/text/column helpers — **no raw `node.resize()` on auto-layout frames in those builders** (enforced at code review / grep in their VQA).
- [ ] Vitest: resize-then-sizing stickiness, Hug+reassert after mock appendChild, HORIZONTAL vs VERTICAL body cell axes, header FIXED/FIXED geometry, column widths sum 1640, matrix counter AUTO + minHeight, `assertNoOnePxMaster` detects 1px sliver mock.
- [ ] `column-widths.json` lifted and typed; all 13 profiles validate to sum 1640.
- [ ] Locked constants match convention prose (56px header, 64px row minHeight, 20px cell padding H) — not legacy `_lib.js` drift values.
- [ ] `tsc --noEmit` and CI (lint, format, test) clean.

## Out of scope

- Page-specific row builders (`colorTables.ts`, `themeTables.ts`, etc.) — WO-011..013.
- Full `buildTable()` port with manifest-driven rows — stays in builder tickets.
- Variable map / alias resolution helpers — variables layer.
- `runAudit('canvas')` scope in WO-010 — export assert helpers now; wire audit scope later.
- Component-specific archetype builders (Sprint 5) — they **import** these helpers.
- UI thread helpers (plugin-thread Figma API only).

---

## Testing & verification

### Functional QA

- Vitest unit tests with Figma frame mock (see Functional req #10).
- Manual smoke optional: import helpers in a throwaway main-thread script against Plugin Sandbox — not required for WO-014 DoD.

### Visual / design QA

- See ticket-level scope; visual QA lives in WO-011..013 Figma VQA checklists.

### Accessibility

- N/A — subsystem ticket.

### Telemetry / observability

- `pluginLog()` on helper validation failures (optional); production telemetry deferred.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- Complete — see [auto-layout-helpers-library.md](research/auto-layout-helpers-library.md).

## 📋 Ready for `/plan`

- ✅ Complete — see [plan.md](plan.md) (329 lines; requirement traceability + Build Agents Phases 1–4). Open questions resolved in plan Notes.

## 🛠️ Ready for `/build`

- `/code-build` first in Sprint 3 build order; verify partial `src/core/canvas/` from aborted build against step **Done when** clauses.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-7, §7.3 `src/core/canvas/`
- Research: [auto-layout-helpers-library.md](research/auto-layout-helpers-library.md)
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/column-widths.json`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/00-gotchas.md` §0.1–§0.2, §0.5, §0.8, §0.10
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/08-hierarchy-and-09-autolayout.md` §9
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/10-column-spec.md`, `11-cells-12-bindings-13-build-order.md` §12–§13
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/03-auto-layout-invariants.md` §3.1.2, §10–§10.2
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/14-audit.md` (inform assert helpers)
- Lift map: `Docs/lift-sources.md` §3–§4
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
