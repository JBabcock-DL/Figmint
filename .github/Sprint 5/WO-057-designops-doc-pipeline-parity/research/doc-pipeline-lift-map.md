# WO-057 — Doc-pipeline lift map (legacy `cc-doc-*.js` + `draw-engine.figma.js` → FigHub TS)

> **Status:** Research-complete · 2026-05-28
> **Quality bar:** `.github/templates/research-quality-bar.md`
> **Sibling research files:**
> - [`section-contract-trace.md`](./section-contract-trace.md) — verbatim section-emitter contracts §§1 / 3.2 / 4 / 5 / 6 / 13.1.a
> - [`audit-gate-spec.md`](./audit-gate-spec.md) — pre-flight audit row shape (extends `auditReport.v1.ts`)
> - [`bootstrap-text-styles-spec.md`](./bootstrap-text-styles-spec.md) — DTCG text-style definitions for Doc/* and Label/*

## Summary

The legacy DesignOps **draw-engine** has already been split into bite-sized modular files at `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-*.js`. These files — NOT the 44-57 KB `*.mcp.js` bundles or the abstract `draw-engine.figma.js §6.6 / §6.7 / §6.8` references in `04-doc-pipeline-contract.md` — are the actual readable port targets. `draw-engine.figma.js` does NOT exist on disk; the doc-pipeline contract names sections of a logical engine whose physical realisation is the `cc-doc-*.js` set.

Lift map: write **6 new TS modules** under `src/core/canvas/doc/` (header, propertiesTable, setGroup, matrix, usage, plus an `index.ts` orchestrator), plus **5 small support modules** (constants, makeText helper, makeFrame helper, bindColor helper, bindNum helper). Extend the existing `usageFrame.ts` setGroup emitter (do NOT replace it — WO-022..026 callers depend on `findComponentSetGroup` / `ensureComponentSetGroup` / `removeUsageSectionContents`). Replace the current `usageFrame.ts` Do/Don't section path (lines 348-443) with the new emitter; the legacy "instance gallery" code is deleted, not appended.

**Locked recommendation:** Port logic from `cc-doc-page-header.js`, `cc-doc-matrix-only.js`, `cc-doc-usage-only.js`, `cc-doc-fill-props.js`, `cc-doc-constants.js`, plus the `properties.mcp.js` bundle (lines 100-132 for `bindColor` / `bindNum`; the property table builder lives there too). Do NOT load any `*.min.mcp.js`. Do NOT load `bundles/properties.mcp.js` and `bundles/matrix.mcp.js` simultaneously into one agent context — they overlap 60-70% and total 1,100 lines / ~80 KB combined.

## Key findings

### F1 — `draw-engine.figma.js` does NOT exist on disk; only the README references it

`DesignOps-plugin/skills/create-component/templates/` contains exactly `README.md` + `__fixtures__/sample-config-block.js`. There is no `draw-engine.figma.js`, no `archetype-builders.figma.js`. The README at lines 47-56 describes how the **build script** (`scripts/build-min-templates.mjs`) would assemble per-archetype bundles from those source files using two banner-line markers — but the source files are not in the repo.

**Implication:** The ticket's references to "lift `buildPropertiesTable` from `draw-engine.figma.js §6.6`" must be re-routed. The actual readable physical source is the modular `cc-doc-*.js` files plus the inline implementations inside `bundles/properties.mcp.js`, `bundles/matrix.mcp.js`, `bundles/usage.mcp.js`. Each bundle inlines its own copy of the relevant builder.

### F2 — `cc-doc-*.js` files are tiny and per-section — lift verbatim

| Source file | Lines | What it produces | FigHub target |
| ----------- | ----- | ---------------- | -------------- |
| `cc-doc-constants.js` | 3 | `DOC_FRAME_WIDTH = 1640`, `GUTTER_W_SIZE = 60`, `GUTTER_W_VARIANT = 160` | `src/core/canvas/doc/constants.ts` |
| `cc-doc-page-header.js` | 50 | `__ccDocPageHeader()` — creates `_PageContent` (1800×AUTO) + `docRoot` (1640×AUTO) + `header` (title + summary) | `src/core/canvas/doc/header.ts` (Section 1 emitter) — also subsumes the `_PageContent` + `docRoot` create logic currently in `ensureComponentScaffoldTarget.ts` |
| `cc-doc-fill-props.js` | 66 | `__ccDocFillPropertiesFromConfig()` — fills properties-table cells in-place (text only) | `src/core/canvas/doc/propertiesTable.ts` (Section 2 emitter — combines this with `bundles/properties.mcp.js` line ~190-250 chrome builder) |
| `cc-doc-matrix-only.js` | 148 | `buildMatrix()` — full Variants × States matrix (header-groups, state labels, size-groups, variant rows, cells with `createInstance` + `applyStateOverride`) | `src/core/canvas/doc/matrix.ts` (Section 4 emitter) |
| `cc-doc-usage-only.js` | 38 | `buildUsageNotes()` — Do/Don't two-column row | `src/core/canvas/doc/usage.ts` (Section 5 emitter — **replaces** existing `buildUsageFrame` Do/Don't path) |
| `cc-doc-chunk-a.js` | 29 | Insert-or-replace section helper | helper inside `src/core/canvas/doc/index.ts` |
| `cc-doc-chunk-b.js` | 220 | (chunked / overflow logic — large; READ before porting) | Optional helper |
| `cc-doc-chunk-c.js` | 77 | (chunked / overflow logic) | Optional helper |
| `cc-doc-insert-replace.js` | 13 | `__ccDocInsertOrReplaceSection(name, builder)` | helper inside `src/core/canvas/doc/index.ts` |

Total readable source = **~644 lines across 9 small files**. Each individual file is under the 1k-line bundle warning threshold; load them ALL in one context if needed. They are dwarfed by the bundle-only files (`bundles/properties.mcp.js` = 363 lines, `bundles/matrix.mcp.js` = 737 lines, `bundles/usage.mcp.js` = 604 lines).

### F3 — Bundle files (`bundles/*.mcp.js`) contain the **chrome** builders the cc-doc-* files don't

The cc-doc-* modular files cover the section bodies. The properties-table **chrome** (header row + 1640-wide table shell + 5 columns at 240/380/160/120/740) lives only inside `bundles/properties.mcp.js`. Reading order to minimize context cost:

1. **Read first:** all 9 `cc-doc-*.js` files (644 lines total — safe to load).
2. **Read second (sequentially, NOT in parallel):** `bundles/properties.mcp.js` (363 lines) for the table chrome and the `bindColor` / `bindNum` / `readTypoString` / `makeFrame` / `makeText` helpers (lines 1-300). Discard the variant-build logic in lines 300-363 (already shipped by WO-022).
3. **Read third (NOT with #2):** `bundles/matrix.mcp.js` (737 lines) only if `cc-doc-matrix-only.js` skipped something — most logic is duplicated.
4. **Skip:** `bundles/usage.mcp.js` (604 lines) — `cc-doc-usage-only.js` already has the full `buildUsageNotes` body. `usage.mcp.js` is bundle wire format around the same function.

### F4 — `bundles/properties.mcp.js` is the canonical source for `bindColor`, `bindNum`, `makeFrame`, `makeText`, `readTypoString`

Lines 100-132 implement `bindColor` (variable resolution + hex fallback + miss recording) and `bindNum` (variable + numeric fallback + miss recording). Lines 70-89 implement `readTypoString` for reading Typography mode-100 string values. Lines 134-152 explain why `figma.getLocalTextStylesAsync()` MUST be awaited at script top-level before any synchronous text-style consumer is declared.

**FigHub already has working equivalents** (see F5). The legacy `bindColor` / `bindNum` are the contract; do NOT copy them verbatim — use the existing FigHub helpers.

### F5 — FigHub already has working equivalents for most low-level helpers

| Legacy helper (DesignOps) | FigHub equivalent | Path |
| ------------------------- | ------------------ | ---- |
| `bindColor(node, varName, hex, target)` | `bindPaintToVar(node, varRef, hex, target)` | `src/core/canvas/helpers/bindings.ts` |
| `bindNum(node, field, varName, fallback)` | (similar pattern in `src/core/canvas/helpers/bindings.ts`) | same |
| `makeFrame(name, opts)` | `createHugFrame({ name, layoutMode, width, height })` | `src/core/canvas/helpers/autoLayout.ts` |
| `makeText(chars, style, size)` | `makeTableText({ chars, ... })` + `configureTableText` | `src/core/canvas/lib/cells.ts`, `helpers/textCell.ts` |
| `readTypoString(variable)` | `ensureLocalVariableMap` + value-by-mode lookup | `src/core/canvas/lib/variables.ts` |
| `resize(w,h) → AUTO/FIXED reset` | `resizeThenApplySizing(frame, w, h, sizing)` | `src/core/canvas/helpers/autoLayout.ts` |
| `pageContent` create | `buildPageContent(page)` | `src/core/canvas/lib/pages.ts` |
| `docRoot` create | `ensureDocComponentRoot(content, docKey)` | `src/core/components/scaffold/ensureComponentScaffoldTarget.ts` |
| `_Doc/Section` / `_Doc/TokenName` / `_Doc/Code` / `_Doc/Caption` styles | already published by bootstrap | `src/core/canvas/publishTypographyStyles.ts` line 19 |
| `Label/SM` / `Label/MD` / `Label/LG` font-family variables | already pushed by bootstrap | `src/core/variables/__fixtures__/bootstrap-complete.v1.json` line 2845 |

**Implication:** WO-057 does NOT need to port low-level helpers. The new `src/core/canvas/doc/*.ts` emitters consume the existing FigHub helpers. The lift work is **section-emitter logic**: how each section assembles its frame tree, what frame names / sizes / paddings / strokes / item-spacings / per-cell instance-overrides to apply.

### F6 — Naming convention: legacy uses `_` prefix, FigHub already does too

Text-style naming in FigHub = `_Doc/Section` (underscore-prefixed). The lift-source contract (`04-doc-pipeline-contract.md` §11) names them `Doc/Section` (no underscore). The FigHub convention prevails — emitters apply `_Doc/*` from `findTextStyleByName(existing, '_Doc/Section')`.

**Decision (locked):** Keep FigHub's `_` prefix. Update the ticket-text "Doc/Section, Doc/TokenName, Doc/Code, Doc/Caption" references to read `_Doc/Section` etc. when applied — they map 1:1. No bootstrap change needed for these four — they already ship.

### F7 — Label/SM, Label/MD, Label/LG are PUBLISHED VARIABLES, not text styles

The ticket (Requirement 7) asks bootstrap to push "Label/SM, Label/MD, Label/LG **text styles**". This is wrong. In the FigHub bootstrap they are **Typography slot variables** (font-family, font-size, font-weight, line-height per slot — see `src/core/canvas/data/typography-slots.json`). The 27 slot text styles (`Label/MD`, etc.) ARE published by `publishTypographyStyles.ts` lines 74-98 via `listExpectedSlotStyleNames()`. **They already exist.**

**Decision (locked):** Drop Requirement 7's text-styles push. Replace with "verify slot text styles `Label/SM`, `Label/MD`, `Label/LG` are present" (covered by `verifySlotTextStyles()` line 115). The pre-flight audit gate (R8) handles the miss case.

### F8 — Current FigHub `usageFrame.ts` has 443 lines — most is reusable

`src/core/components/scaffold/usageFrame.ts` already implements:

- `findComponentSetGroup` / `ensureComponentSetGroup` (lines 81-141) — Section 3 (component-set-group): existing emitter creates the group + reparents the ComponentSet. **Missing:** title, caption, dashed-outline wrapper, WRAP grid config. Extend in-place per `04-doc-pipeline-contract.md` §3.2.
- `findUsageSection` / `ensureUsageSection` / `removeUsageSectionContents` (lines 163-183) — reusable for Section 5.
- `createDocSectionFrame` / `reassertDocSectionStretch` (lines 91-117) — BUG-S5-001 P0 fix; reuse for ALL new section emitters.
- `createHugAutoFrame` / `reassertHugBoth` (lines 148-161) — useful for matrix cells.
- The "instance gallery" loop in `buildUsageFrame` (lines 348-443) is the **only** code that gets replaced — it becomes the Do/Don't emitter.

**Decision (locked):** Keep file. Replace lines 348-443 with `buildUsageNotes` (Do/Don't). Keep all `ensure*Section` exports. WO-022..026 callers continue to work.

### F9 — Current button spec is NOT shadcn-shape — must be replaced

`tests/fixtures/component-spec-button-canonical.json` ships:
- `variant ∈ {primary, secondary, outline}` × `size ∈ {sm, md}` × `disabled ∈ {false, true}` = 12 variants.
- archetype = `chip`.

shadcn shape (locked decision 2026-05-28, per `04-doc-pipeline-contract.md` §13.1.a):
- `variant ∈ {default, destructive, outline, secondary, ghost, link}` × `size ∈ {default, sm, lg, icon}` = 24 variants.
- `disabled` is NOT a variant — it becomes a per-cell `instance.opacity = 0.5` overlay in the matrix.

**Decision (locked):** Replace `tests/fixtures/component-spec-button-canonical.json` and `src/io/formats/__fixtures__/component-spec-button.json` AND `src/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json` to the shadcn shape. Add per-cell `instance.opacity` overrides via a CONFIG.applyStateOverride function in the matrix emitter (see [`section-contract-trace.md`](./section-contract-trace.md) §13.1.a). Drop the `disabled` axis from `variantMatrix`.

**Risk:** WO-022..026 tests reference the old shape. Audit before promoting plan — see Open Question OQ-1 below.

## Validated evidence

### Repo inventory — FigHub targets (will create)

| Path | Status | Role |
| ---- | ------ | ---- |
| `src/core/canvas/doc/constants.ts` | greenfield | DOC_FRAME_WIDTH=1640, GUTTER_W_SIZE=60, GUTTER_W_VARIANT=160, MATRIX_RADIUS=16, DASH_PATTERN=[6,4] |
| `src/core/canvas/doc/header.ts` | greenfield | Section 1 emitter (`buildSectionHeader(docRoot, spec) → FrameNode`) |
| `src/core/canvas/doc/propertiesTable.ts` | greenfield | Section 2 emitter (`buildPropertiesTable(docRoot, spec) → FrameNode`) |
| `src/core/canvas/doc/setGroup.ts` | greenfield | Section 3 wrapper around existing `ensureComponentSetGroup` — adds title/caption/dashed outline/WRAP grid per §3.2 |
| `src/core/canvas/doc/matrix.ts` | greenfield | Section 4 emitter (`buildMatrix(docRoot, spec, componentSet, variantByKey) → FrameNode`) |
| `src/core/canvas/doc/usage.ts` | greenfield | Section 5 emitter (`buildUsageNotes(docRoot, spec) → FrameNode`) |
| `src/core/canvas/doc/index.ts` | greenfield | Section orchestrator (`buildDocPipeline(componentSet, spec, ctx) → DocPipelineResult`) |
| `src/core/canvas/doc/applyStateOverride.ts` | greenfield | Per-cell opacity overlay (`applyButtonStateOverride(instance, stateKey)`) |

### Repo inventory — FigHub targets (will modify)

| Path | Lines now | What changes |
| ---- | --------- | ------------ |
| `src/core/components/scaffold/usageFrame.ts` | 443 | Replace `buildUsageFrame` lines 348-443; keep all `ensure*Section` exports. The new pipeline calls `buildDocPipeline` and routes through `buildUsageNotes` for Section 5 (Do/Don't) instead of the instance gallery. |
| `src/core/components/scaffold/runScaffold.ts` | 333 | Replace the `buildUsageFrame` call (line 248) with a `buildDocPipeline` call that emits all 5 sections, not just usage. |
| `src/core/components/scaffold/index.ts` | 382 | Update `forwardScaffold` (line 275) to call `buildDocPipeline` instead of `buildUsageFrame`. Keep both exports for WO-022..026 tests. |
| `src/core/audit/runAudit.ts` | 190 | Add a new component pre-flight gate row that runs BEFORE bindings — see [`audit-gate-spec.md`](./audit-gate-spec.md). |
| `src/core/audit/rules/index.ts` | (exists) | Add `runDocPipelinePreflightRules` export. |
| `src/core/audit/rules/doc-required-tokens.ts` | greenfield | The 4 required tokens (`color/border/subtle`, `color/background/variant`, `color/background/content`, `color/background/content-muted`) — see [`audit-gate-spec.md`](./audit-gate-spec.md). |
| `tests/fixtures/component-spec-button-canonical.json` | 38 | Replace with shadcn-shape (24 variants). |
| `src/io/formats/__fixtures__/component-spec-button.json` | 62 | Same. |
| `src/io/formats/__fixtures__/component-spec-button.md` | (exists) | Update the matching Markdown sidecar. |
| `src/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json` | (exists) | Same shape; archetype stays `chip`. |

### Repo inventory — FigHub targets (already shipped — DO NOT recreate)

| Path | Role |
| ---- | ---- |
| `src/core/canvas/publishTypographyStyles.ts` | publishes `_Doc/Section`, `_Doc/TokenName`, `_Doc/Code`, `_Doc/Caption` text styles (line 19) plus the 27 slot styles (line 74). |
| `src/core/variables/__fixtures__/bootstrap-complete.v1.json` | already includes `Label/SM/*`, `Label/MD/*`, `Label/LG/*` font-family/size/weight/line-height variables (line 2845+). |
| `src/core/canvas/lib/cells.ts` | `resolveDocStyles()` resolves the 4 `_Doc/*` styles (lines 47-57). |
| `src/core/canvas/lib/pages.ts` | `buildPageContent(page)` creates `_PageContent` at 1800×AUTO. |
| `src/core/canvas/helpers/autoLayout.ts` | `createHugFrame`, `resizeThenApplySizing`, `reassertHug`, `assertNoCollapsedAxis` (BUG-S5-002). |
| `src/core/canvas/helpers/bindings.ts` | `bindPaintToVar` for variable-bound fills/strokes. |
| `src/core/components/scaffold/ensureComponentScaffoldTarget.ts` | `_PageContent` + `docRoot` create + `↳ Buttons` page routing. |
| `src/core/components/scaffold/usageFrame.ts` lines 81-141 | Section 3 (component-set-group) emitter — extend in-place. |

### Legacy lift sources (DesignOps-plugin)

| Path | Lines | Role | Read in this order |
| ---- | ----- | ---- | ------------------ |
| `skills/create-component/canvas-templates/cc-doc-constants.js` | 3 | DOC_FRAME_WIDTH + gutter widths | 1 (read first) |
| `skills/create-component/canvas-templates/cc-doc-page-header.js` | 50 | Section 1 emitter | 2 |
| `skills/create-component/canvas-templates/cc-doc-fill-props.js` | 66 | Section 2 fill helper | 3 |
| `skills/create-component/canvas-templates/cc-doc-matrix-only.js` | 148 | Section 4 emitter | 4 |
| `skills/create-component/canvas-templates/cc-doc-usage-only.js` | 38 | Section 5 emitter | 5 |
| `skills/create-component/canvas-templates/cc-doc-insert-replace.js` | 13 | section insert/replace helper | 6 |
| `skills/create-component/canvas-templates/cc-doc-chunk-a.js` | 29 | overflow helper (optional) | 7 |
| `skills/create-component/canvas-templates/cc-doc-chunk-b.js` | 220 | chunked logic (optional — large) | 8 (skip if Section 2 chrome from properties.mcp.js suffices) |
| `skills/create-component/canvas-templates/cc-doc-chunk-c.js` | 77 | chunked logic (optional) | 9 |
| `skills/create-component/canvas-templates/bundles/properties.mcp.js` | 363 | Section 2 chrome builder + `bindColor` / `bindNum` / `makeFrame` / `makeText` / `readTypoString` reference | 10 (only after #1-9; properties-table chrome lines ~190-250) |
| `skills/create-component/conventions/04-doc-pipeline-contract.md` | 425 | Contract for §§1, 3.2, 4, 5, 6, 13.1.a | already read |
| `skills/create-component/conventions/03-auto-layout-invariants.md` | (existing) | §10.1 (resize-before-AUTO order), §10.2 (counter-axis sizing rule) | read if Hug/sizing failures recur |

### Official API / platform facts

| API | Behavior | Source |
| --- | -------- | ------ |
| `figma.combineAsVariants(nodes, parent)` | Returns a ComponentSetNode; preserves node identity (Code Connect still resolves) | `bundles/properties.mcp.js` line ~310 + `04-doc-pipeline-contract.md` §3 |
| `section.appendChild(componentSet)` | Reparents the ComponentSet without breaking variant resolution | `04-doc-pipeline-contract.md` §3 (Figma stable behavior) |
| `figma.createInstance(componentNode)` | Per-cell matrix instance; `setProperties({...})` applies variant overrides | `cc-doc-matrix-only.js` lines 137-143 |
| `instance.opacity = 0.5 / 0.85 / 0.92` | Per-cell visual state override; does NOT mutate the ComponentSet | `04-doc-pipeline-contract.md` §13.1.a |
| `figma.variables.setBoundVariable(field, variable)` | Wires a numeric layout field (padding, gap, etc.) to a Variable | `bundles/properties.mcp.js` lines 124-132 |
| `node.fills = [{ type: 'SOLID', boundVariables: { color: createVariableAlias(v) } }]` | Color binding requires `boundVariables` on the paint, NOT `setBoundVariable` | `bundles/properties.mcp.js` lines 100-117 |
| `node.dashPattern = [6, 4]` | Dashed stroke pattern (used on set-group wrapper + matrix root per §3.2 / §5.5) | `04-doc-pipeline-contract.md` §3.2 |
| `figma.getLocalTextStylesAsync()` | Must be awaited at top level; cache result | `bundles/properties.mcp.js` lines 134-152 (CRITICAL ORDERING RULE — explained inline) |
| `node.textStyleId = style.id` | Apply text-style by id; raw `fontName`/`fontSize` forbidden per `04-doc-pipeline-contract.md` §11 | Figma Plugin API |
| `figma.fileKey` returns `''` on Untitled files | Pre-flight audit gate must tolerate empty fileKey (don't fail solely on it) | `memory.md` "do not repeat" 2026-05-28 |

### Cross-ticket matrix

| Ticket | Interface / artifact | WO-057 consumes or produces |
| ------ | -------------------- | --------------------------- |
| WO-022 | `scaffold()` + `componentSet` + `variantByKey` | **consumes** — `componentSet` is the input to Section 3 / 4 / 5 emitters |
| WO-023 | `applyBindings()` + bound paints on variants | **consumes** — runs before doc pipeline so variant masters carry resolved colors |
| WO-024 | `applyProperties()` + element properties on ComponentSet | **consumes** — set-group section renders props; matrix instances inherit |
| WO-025 | `buildUsageFrame()` (instance gallery) | **REPLACES** — lines 348-443 deleted; new `buildUsageNotes` (Do/Don't) replaces |
| WO-026 | `registry.upsertRegistryEntry()` | **unchanged** — registry still emits one entry per ComponentSet; doc pipeline does not touch registry |
| WO-027 | UI orchestrator + scaffold/run message + preview | **consumes** — UI consumes the new audit pre-flight gate; preview must handle 5 sections, not 2 |
| BUG-S5-004 | this WO | **closes** — full pipeline lands |
| SPK-S5-DOC-1 | scope spike | **promotes** — research → build |

## Decision log

| # | Decision | Rationale | Alternatives rejected | Owner |
| --- | -------- | --------- | --------------------- | ----- |
| D1 | Port modular `cc-doc-*.js` (644 lines total) — NOT `draw-engine.figma.js` (which does not exist on disk) | Source files in `templates/` are missing; modular `canvas-templates/cc-doc-*.js` are the only readable per-section source | Loading any `bundles/*.mcp.js` whole as primary lift source — wastes 1k+ lines of context per bundle | code-build |
| D2 | Keep FigHub's `_Doc/Section` underscore-prefixed text-style names | Existing bootstrap (`publishTypographyStyles.ts` line 19) already uses `_Doc/*`; renaming would break WO-011..013 callers | Renaming to legacy `Doc/Section` (no `_`) — would require migration + breaking change | code-build |
| D3 | Drop Requirement 7 "push Label/SM, Label/MD, Label/LG text styles" — they already exist as **variables + slot styles** | `bootstrap-complete.v1.json` line 2845+ has Label/* font-family/size/weight/line-height variables; `verifySlotTextStyles` line 115 verifies 27 slot styles | Pushing duplicates would break the bootstrap fixture (167 tokens) | code-build |
| D4 | Replace canonical Button spec with shadcn shape — drop `disabled` axis, add per-cell `instance.opacity` overlay | Per `04-doc-pipeline-contract.md` §13.1.a + 2026-05-28 locked decision in `memory.md` | Keeping `disabled` as a variant — would produce `6 × 4 × 2 = 48` master components instead of 24, and break the matrix's expected `6 variants × 4 sizes` shape | code-build |
| D5 | Extend `usageFrame.ts` in-place — keep `ensureComponentSetGroup`, `findUsageSection`, etc.; replace only the instance-gallery loop (lines 348-443) | WO-022..026 callers depend on the `ensure*Section` exports; replacing the whole file would break them | Replacing the file wholesale would require touching every caller — too many surface-area changes for a single WO | code-build |
| D6 | New `src/core/canvas/doc/index.ts` orchestrator wires all 5 sections; existing `runScaffold.ts` calls the orchestrator instead of `buildUsageFrame` | Keeps section emitters as small testable units; one orchestrator = one integration test | Inlining all 5 sections into `usageFrame.ts` — would balloon the file past 1k lines | code-build |
| D7 | Section 2 properties-table chrome lifted from `bundles/properties.mcp.js` lines ~190-250 — not from `cc-doc-chunk-b.js` (220 lines, chunked overflow logic) | Bundle-only code is the only available chrome source; chunked logic is for >12-row tables which Button (6 rows) does not need | Skipping the chrome and rendering a stub table — would not match §4 column widths 240/380/160/120/740 = 1640 | code-build |
| D8 | Section 4 matrix uses Figma instance `opacity` overrides for hover/pressed/disabled — driven by `CONFIG.applyStateOverride` injected at orchestrator scope | Mirrors `04-doc-pipeline-contract.md` §13.1.a + matches the existing Button spec contract (state is NOT a Figma variant property) | Per-state bound tokens (`color/primary/hover` etc.) — would require Theme variables that may not exist in every file (violates determinism) | code-build |
| D9 | New audit row `doc-pipeline/required-tokens` runs at preflight (before bindings + before scaffold-geometry) — see [`audit-gate-spec.md`](./audit-gate-spec.md) for the full shape | Per ticket R8 — must hard-fail BEFORE any drawing happens to avoid the 1px-collapse regression | Audit-row as a post-scaffold check — would still produce the broken canvas and require redraw | code-build |
| D10 | Do NOT version-bump `auditReport.v1.ts` — the new audit row is just a new entry in `AuditRuleResult[]` with a new `ruleId` string | New rows are not a contract break per `memory.md` "Contracts are versioned literals" rule | Adding a `v2` contract just for a new ruleId — would force every consumer to migrate | code-build |
| D11 | New `src/core/canvas/doc/index.ts` orchestrator gates ALL output behind preflight result — if any required token is missing, returns `{ ok: false, audit }` and emits NO frames | Per "Always preview, never silent-apply" PRD §11.4 | Half-shipping doc pipeline with hex fallbacks — would silently hide the missing-token problem and produce off-brand output | code-build |
| D12 | The new Button spec drops `disabled` from `variantMatrix` and renames `primary → default`, removes `secondary`, adds `destructive`, `ghost`, `link`, renames `md → default` | Per `04-doc-pipeline-contract.md` §13.1.a (shadcn 1:1) + locked 2026-05-28 decision | Keeping `secondary` + `disabled` for back-compat — would diverge from shadcn and break Code Connect mappings downstream | code-build |
| D13 | Bundle-source files (`properties.mcp.js`, `matrix.mcp.js`, `usage.mcp.js`) are read **sequentially, never in parallel** — total 1,704 lines / ~130 KB combined would blow context | Per `memory.md` "do not repeat" rule about canvas-bundle loading | Concatenating them in one Read call — would exhaust 80+% of one agent's context budget | code-build |

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-S5-DOC-1.A | Bootstrap on a fresh empty Figma file with `bootstrap-complete` fixture, then trigger forward scaffold; assert preflight gate FAILS with `doc-pipeline/required-tokens` rule and ZERO frames emitted | Gate fires before bindings; no `doc/component/*` frame created | ☐ pending (run during build, Phase 1 first day) |
| SPK-S5-DOC-1.B | Bootstrap on Plugin Sandbox `cVdPraIafWFBRZnzMPhtrW`, then scaffold canonical shadcn Button; assert 5 sections present (header, properties, set-group, matrix, usage), `docRoot.children.length === 5`, no width=1 sections | All 5 section names exist as direct children of `doc/component/button`; matrix has `6 × 4 = 24` cells (no `disabled` variant) | ☐ pending (run during build, Phase 1 last day) |
| SPK-S5-DOC-1.C | Visual VQA against `uCpQaRsW4oiXW3DsC6cLZm:433:335` via MCP `get_screenshot`; designer sign-off | Zero FAIL rows on Figma VQA Checklist (ticket.md §VQA) | ☐ deferred to `/vqa` |
| SPK-S5-DOC-1.D | Run audit on a file with `color/border/subtle` missing; assert gate row says "Run design-system bootstrap first" exactly | Diagnostic copy matches; severity = `error` (default); `passed = false` | ☐ pending (unit test during build, Phase 1) |
| SPK-S5-DOC-1.E | Run forward scaffold and assert all 5 section frames have `width > 100` AND `height > 100` (BUG-S5-002 collapse guard); width must hug `DOC_FRAME_WIDTH = 1640` on stretched sections | All section width = 1640 (or AUTO-hugged equivalent); no collapsed-axis violations from `assertNoCollapsedAxis` | ☐ pending (integration test during build, Phase 1) |
| SPK-S5-DOC-1.F | Run matrix emitter against shadcn Button (24 variants) and verify `applyStateOverride` produces 96 instances with correct opacities (0.92/0.85/0.5) | Spot-check 4 cells: `[default, default, default]` opacity=1, `[default, default, hover]` opacity=0.92, `[destructive, lg, pressed]` opacity=0.85, `[ghost, sm, disabled]` opacity=0.5 | ☐ pending (unit test during build, Phase 1) |

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| **R1** Button spec replacement breaks WO-022..026 unit tests that hardcode `{primary, secondary, outline}` × `{sm, md}` × `{disabled}` (12 variants, 48 with state) | High | High (will happen) | Audit `tests/unit/core/components/scaffold/**` for hardcoded variant names BEFORE replacing the fixture. Plan an explicit "test migration" Phase 0 step before any emitter work. See OQ-1. |
| **R2** Section 3 set-group title/caption/dashed-outline extension breaks WO-022..026 `findComponentSetGroup` lookups | Medium | Low | Keep the frame name (`doc/component/{key}/component-set-group`) unchanged; only add children (title + caption + the existing reparented ComponentSet) and apply dashed-outline + WRAP grid to the **child** ComponentSet, not the section frame. Verified by reading existing `ensureComponentSetGroup` (lines 119-141). |
| **R3** Bootstrap-complete fixture only has 167 tokens — required tokens may not include all 4 audit-gate tokens | Medium | Medium | Pre-flight: grep `bootstrap-complete.v1.json` for `color/border/subtle`, `color/background/variant`, `color/background/content`, `color/background/content-muted`. If any missing, escalate as a fixture bug. See OQ-2. |
| **R4** Preflight audit gate may incorrectly fail on Untitled / unsaved Figma files where `figma.fileKey === ''` | Medium | High | The gate inspects variable presence, not `fileKey`. Mirror the existing `runScaffold.ts` `readFileKey` pattern (lines 33-38) and accept empty string. Per memory.md "do not repeat" 2026-05-28. |
| **R5** Properties table chrome ported from `properties.mcp.js` may use `figma.variables.getLocalVariableCollections()` (sync API removed in some Figma versions) | Medium | Low | Use FigHub's existing `ensureLocalVariableMap` from `src/core/canvas/lib/variables.ts` instead. The legacy sync API call is at `properties.mcp.js` line 20; replace with the async helper. |
| **R6** Per-cell opacity overrides on Figma instances may not survive Save → Reopen on older Figma desktop versions | Low | Low | `instance.opacity` is a stable persisted property on InstanceNode (Plugin API ≥1.84). Document in plan; no fallback needed. |
| **R7** Matrix renders 96 instances (24 variants × 4 states) — may exceed perf budget for `/build` end-to-end < 5s | Low | Low | Spike SPK-S5-DOC-1.B measures end-to-end time; cap matrix at 96 instances total. Per WO-005 spike, 96 createInstance + setProperties calls ≈ 50 ms. Negligible. |
| **R8** WO-027 UI preview rendering tab expects 2-section output (set-group + usage); 5-section output may overflow the preview frame | Medium | Medium | Add a coordination note in plan.md for WO-027. The WO-057 plan must read WO-027's plan.md first (per ticket dependency block). |
| **R9** Section 4 matrix needs `_Doc/Caption` for state column headers; current `_Doc/Caption` is small (13px) — may look too thin against the 1640-wide matrix | Low | Low | Match `04-doc-pipeline-contract.md` §11 verbatim (`Doc/Caption` for state headers); designer signs off in VQA. No code change needed. |
| **R10** Replacing the existing `buildUsageFrame` Do/Don't path deletes the curated-instance-gallery audit row (`USAGE_AUDIT_RULE_IDS`) which downstream consumers may depend on | Low | Low | Grep `USAGE_AUDIT_RULE_IDS` callers before deletion; if any, port to a new `DOC_PIPELINE_AUDIT_RULE_IDS` constant. Confirmed 0 external callers via repo grep at start of build. |

## Recommendations

1. **Phase 0 — Test migration (before any emitter code).** Audit `tests/unit/core/components/scaffold/**` for hardcoded variant names. Migrate to shadcn shape OR add a `legacyButton` fixture alongside `canonicalButton`. Estimate: 1 day.
2. **Phase 1 — Foundation (parallel).**
   1. `src/core/canvas/doc/constants.ts` + `applyStateOverride.ts` (small).
   2. Replace 3 button-spec fixtures (`tests/fixtures/component-spec-button-canonical.json`, `src/io/formats/__fixtures__/component-spec-button.json`, `src/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json`).
   3. Write the preflight audit gate `src/core/audit/rules/doc-required-tokens.ts` and wire into `src/core/audit/runAudit.ts`.
3. **Phase 2 — Section emitters (sequential per the order they emit).**
   1. `header.ts` (Section 1) — simplest, gates the rest visually.
   2. `propertiesTable.ts` (Section 2) — read `bundles/properties.mcp.js` first (lines 190-250 for chrome).
   3. `setGroup.ts` (Section 3 wrapper) — extend `usageFrame.ts:ensureComponentSetGroup` for title/caption/dashed-outline/WRAP.
   4. `matrix.ts` (Section 4) — port `cc-doc-matrix-only.js` verbatim (148 lines).
   5. `usage.ts` (Section 5) — port `cc-doc-usage-only.js` verbatim (38 lines); also DELETE old `buildUsageFrame` instance-gallery loop.
4. **Phase 3 — Orchestrator + integration.**
   1. `src/core/canvas/doc/index.ts` orchestrator wires 5 emitters with the preflight gate.
   2. Update `runScaffold.ts`, `forwardScaffold` to call orchestrator.
   3. Coordinate with WO-027 preview tab — extend preview rendering.
5. **Phase 4 — VQA on Plugin Sandbox `cVdPraIafWFBRZnzMPhtrW`.** Run `/vqa` against `uCpQaRsW4oiXW3DsC6cLZm:433:335` (Foundations target). Per `memory.md` "do not repeat", only Step 7 of `/vqa` may mark Completed.

## Open questions

- **OQ-1 (BLOCKS PLAN)** — Should Phase 0 migrate all WO-022..026 test fixtures to the shadcn shape (one-shot), or add a parallel `canonicalShadcnButton` fixture and leave the legacy one alone? Owner: planning agent + user sign-off. _Resolution suggestion:_ Migrate one-shot — the legacy shape is no longer canonical per 2026-05-28 lock; running both forever is debt.
- **OQ-2 (BLOCKS BUILD)** — Does `bootstrap-complete.v1.json` already include all 4 required tokens (`color/border/subtle`, `color/background/variant`, `color/background/content`, `color/background/content-muted`)? Owner: build agent on Phase 1 day 1. _Resolution suggestion:_ Phase 0 grep; if any missing, file a quick fixture-fix WO (1-line change) that runs ahead of Phase 1.
- **OQ-3 (BLOCKS BUILD COORDINATION)** — WO-027 In Build — does its preview render path consume `setGroup` + `usage` as separate frames, or does it look up by `doc/component/{key}/usage` (the section the new emitter still produces)? Owner: build agent on Phase 1 day 1 (read WO-027 `plan.md`). _Resolution suggestion:_ Read WO-027 plan.md first thing in Phase 3.
- **OQ-4 (RESOLVED)** — Does `auditReport.v1.ts` need a v2 bump for the new pre-flight gate? **NO** (D10). The new rule just adds an entry to `AuditRuleResult[]` with `ruleId: 'doc-pipeline/required-tokens'`.
- **OQ-5 (RESOLVED)** — Does the existing `_Doc/*` text-style naming with underscore prefix need to be migrated to match the legacy `Doc/*` (no underscore)? **NO** (D2). Keep FigHub's `_` prefix.
- **OQ-6 (RESOLVED)** — Does bootstrap need to push new Label/SM, Label/MD, Label/LG **text styles**? **NO** (D3). They already exist as Typography slot styles (`Label/MD` etc.) published by `publishTypographyStyles.ts` line 74. Bootstrap is already complete.

## References

- `DesignOps-plugin/skills/create-component/conventions/04-doc-pipeline-contract.md` (§§1, 2, 3, 3.2, 4, 5, 6, 11, 12, 13.1.a) — primary contract (retrieved 2026-05-28).
- `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-*.js` (9 files, 644 lines) — modular per-section emitters (retrieved 2026-05-28).
- `DesignOps-plugin/skills/create-component/canvas-templates/bundles/properties.mcp.js` (363 lines) — properties-table chrome + `bindColor` / `bindNum` / `makeFrame` / `makeText` / `readTypoString` reference (retrieved 2026-05-28).
- `DesignOps-plugin/skills/create-component/canvas-templates/bundles/matrix.mcp.js` (737 lines) — matrix bundle (sequential-read only).
- `DesignOps-plugin/skills/create-component/canvas-templates/bundles/usage.mcp.js` (604 lines) — usage bundle (sequential-read only).
- `DesignOps-plugin/skills/create-component/templates/README.md` — explains the build script + bundle assembly (notes that `draw-engine.figma.js` is the SOURCE the build script splits — but no copy lives on disk).
- `FigHub/Docs/lift-sources.md` §0 (drift corrections) — already noted `*.min.mcp.js` are off-limits; this research confirms `bundles/*.mcp.js` should be read sequentially.
- `FigHub/.github/Sprint 5/research/designops-canvas-parity-bug-register.md` — BUG-S5-001..008 register; BUG-S5-004 is what WO-057 closes.
- `FigHub/memory.md` — 2026-05-28 entry locking 3 decisions: full pipeline in one WO, shadcn-shape Button spec, bootstrap text-style + audit gate.
- `FigHub/src/core/canvas/publishTypographyStyles.ts` line 19 + 74 — proves `_Doc/*` and slot text styles already published.
- `FigHub/src/core/variables/__fixtures__/bootstrap-complete.v1.json` line 2845+ — proves Label/SM/MD/LG variables already pushed.
- `FigHub/src/core/components/scaffold/usageFrame.ts` (443 lines) — current Section 3 + 5 emitter (extend in-place).
- `FigHub/src/core/components/scaffold/runScaffold.ts` (333 lines) — current orchestrator (call doc-pipeline orchestrator instead).
- `FigHub/src/core/audit/runAudit.ts` (190 lines) — current audit entry point (add preflight rule).
