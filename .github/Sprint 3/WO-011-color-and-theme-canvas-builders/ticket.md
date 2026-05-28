---
type: work-order
github_issue: 14
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5I90
---

## Goal

Port the step-15a (Primitives page) and step-15b (Theme page) canvas builders from DesignOps-plugin into fighub as deterministic TypeScript modules. Together these build the foundational color portion of the style-guide canvas.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-7.

---

## Problem story

After WO-008 pushes the five variable collections, designers need the Primitives and Theme style-guide pages populated with bound swatch tables — the visual reference for every color token, alias chain, and platform codeSyntax. Today that logic lives in DesignOps-plugin canvas templates invoked via MCP bundles; FigHub must run the same deterministic draw inside the plugin sandbox with no 50 kB payload cap.

---

## User stories

- [ ] As a designer, after pushing tokens I can rebuild the Primitives and Theme pages and see bound swatches with hex, alias, and codeSyntax columns matching the Foundations reference layout.
- [ ] As an engineer, row projection from `TokensV1` is unit-testable without a live Figma file, while swatch paints bind to live variables post-push.

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).** Manual VQA uses [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox?node-id=0-1) after WO-008 push.

---

## Requirements

### Functional

1. **`src/core/canvas/lib/`** — shared port of `canvas-templates/_lib.js`: `ensureLocalVariableMap`, `bindPaintToVar` / `bindStrokeToVar`, `buildPageContent`, `buildTable`, cell helpers, font loading, color format helpers. Single shared surface for WO-012/013.
2. **`src/core/canvas/projectRows/`** — pure `TokensV1` → row DTO projectors:
   - `primitivesRows.ts` — color ramps (numeric stop discovery + `RAMP_ORDER`), optional space/radius/elevation/typeface/font-weight buckets.
   - `themeRows.ts` — theme COLOR tokens grouped by semantic role (`background`, `border`, `primary`, …) with per-mode hex/HSL, alias paths, codeSyntax.
3. **`src/core/canvas/colorTables.ts`** — Step 15a orchestrator: `buildPrimitivesPage(tokens, target)` draws all Primitives-page tables (color ramps + optional non-color primitive tables when rows exist).
4. **`src/core/canvas/themeTables.ts`** — Step 15b orchestrator: `buildThemePage(tokens, target)` draws all Theme semantic group tables with Light/Dark preview columns.
5. **Input contract:** both builders accept `TokensV1` + `CanvasPageTarget` (`pageSlug: 'primitives' | 'theme'`). Cell text/labels from projected rows; swatch binding from live Figma variables via `ensureLocalVariableMap()` after WO-008 push.
6. **Variable binding:** §0.7 pattern — clone paint → `figma.variables.setBoundVariableForPaint` → reassign fills/strokes. Theme previews use `setExplicitVariableModeForCollection` for Light/Dark columns.
7. **Page targets:** resolve via shared page slug (`primitives`, `theme`) with legacy fallbacks (`↳ Primitives`, `↳ Theme`). `buildPageContent` preserves header, deletes all other children, creates fresh `_PageContent`.
8. **Idempotency:** full page redraw on re-run (wipe + rebuild) — same destructive redraw as legacy; no slug-level patch/merge.
9. **WO-014 integration:** use `src/core/canvas/helpers/{autoLayout,columnSpec,buildOrder}.ts` for §0.10 gotchas and locked column widths; thin stubs acceptable only until WO-014 lands (migrate before VQA).
10. **`src/core/canvas/bench.ts`** — `runCanvasBench` mirroring `variables/bench.ts`; record ~100-swatch timing per builder.

### Visual / UX

- Table hierarchy and node names match legacy: `doc/table-group/{slug}`, `doc/table/{slug}/header|body`, `doc/theme-preview/light|dark`.
- Column widths sum to **1640 px** per `10-column-spec.md` (color + theme specs from research).
- C2 bulk-insert: suspend `_PageContent` auto-layout during table append, restore `VERTICAL` + `HUG` after.

### Technical / architectural

- **Lift reference (readable sources — NOT variable push):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js` — shared helpers
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/primitives.js` — Step 15a page template
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/theme.js` — Step 15b page template
  - Runner row-projection logic (re-home, do not port): `canvas-templates/bundles/_step15a-runner.fragment.js`, `_step15b-runner.fragment.js`
  - **Wire-format reference only (do not load wholesale):** `bundles/step-15a-primitives.mcp.js`, `step-15b-theme.mcp.js`
  - Conventions: `00-gotchas.md`, `08-hierarchy-and-09-autolayout.md`, `10-column-spec.md`, `11-cells-12-bindings-13-build-order.md`
- **Do NOT lift:** variable creation (WO-008 `push.ts`); MCP runner glue; `canvas-bundle-runner` skill
- **Dependencies:** WO-008 (variables pushed first), WO-014 (auto-layout helpers — soft gate with stubs)

---

## Acceptance criteria _(definition of done)_

- [ ] Running both builders against a sample design system (push via WO-008, then build) produces visually correct Primitives and Theme canvas pages matching the DesignOps-plugin reference output.
- [ ] Output frames use legacy node naming so future `scope: 'canvas'` audit rules (WO-010 extension) can validate geometry.
- [ ] Vitest covers pure row projection from `TokensV1` fixtures (`foundations-minimal.v1.json` + ~100-color generated fixture).
- [ ] Bench: each builder completes **< 3 s** for ~100 swatches (warm font cache; canvas-only timing excluding push).

## Out of scope

- Typography / Layout / Effects builders (WO-012, WO-013).
- Token overview specimen (WO-012).
- Bootstrap tab UI invocation (WO-015).
- `runAudit('canvas', …)` rule implementation (defer to WO-010 canvas scope extension).
- Canvas-time `setVariableCodeSyntax` healing (WO-009 owns codeSyntax at push).

---

## Testing & verification

### Functional QA

- Vitest: `projectRows/*` pure functions, color format helpers, row DTO edge cases (alpha/HSL, alias chains, empty groups).
- Figma manual: push fixture → `buildPrimitivesPage` + `buildThemePage` → verify table count and bound swatches in Plugin Sandbox.

### Visual / design QA

- Compare Primitives color ramps + Theme background/primary tables against DesignOps reference screenshots or live Foundations file.

### Accessibility

- N/A — style-guide tables; UI tab a11y is WO-015.

### Telemetry / observability

- `pluginLog()` per major build phase; bench results logged to `research/canvas-bench-result.md` at VQA.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket). Manual VQA uses Plugin Sandbox after push.

---

## 🔍 Ready for `/research`

- ✅ Complete — see [Color & Theme Canvas Builders](research/color-theme-canvas-builders.md).

## 📋 Ready for `/plan`

- ✅ Complete — see [plan.md](plan.md) (316 lines; requirement traceability + Build Agents Phases 1–4).

## 🛠️ Ready for `/build`

- `/code-build` after WO-014 `src/core/canvas/helpers/` merged; single domain unless plan adds bench script agent.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-7
- Research: [Color & Theme Canvas Builders](research/color-theme-canvas-builders.md)
- Lift map: `Docs/lift-sources.md` §0 (15a/15b = canvas, not push) + §3 bundle table
- Canonical tokens: [WO-055 canonical token model](../../Sprint%201/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md)
- Push engine: [WO-008 variable push design](../../Sprint%202/WO-008-variable-collection-push-engine-5-collections-modes/research/variable-push-engine-design.md)
- Audit (variables scope): [WO-010 post-push audit rules](../../Sprint%202/WO-010-audit-reporter-post-build-validation/research/post-push-audit-rules.md)
- Lift reference (DesignOps-plugin):
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/primitives.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/theme.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/00-gotchas.md`, `08-hierarchy-and-09-autolayout.md`, `10-column-spec.md`, `11-cells-12-bindings-13-build-order.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
