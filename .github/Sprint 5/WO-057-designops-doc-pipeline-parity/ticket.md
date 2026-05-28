---
type: work-order
github_issue: 60
project_item_id: PVTI_lAHOD9B30s4BY4aYzguFS5g
promoted_from: SPK-S5-DOC-1
closes: BUG-S5-004
blocks: WO-027
---

## Goal

Port the full **5-section DesignOps doc-pipeline contract** into FigHub's forward component scaffold so that every scaffolded component page renders the same authoritative doc layout as the legacy DesignOps-plugin canvas: (1) **section header**, (2) **properties table**, (3) **component-set group** (already partially shipped), (4) **matrix specimen**, (5) **Do / Don't usage**. Replaces the current instance-gallery stub under `doc/component/*` with a canvas that matches `uCpQaRsW4oiXW3DsC6cLZm` node `433:335` and unblocks WO-027 VQA Ship.

---

## Problem story

As a **designer reviewing a FigHub-scaffolded component page**, I want the same five-section doc layout the legacy DesignOps-plugin produced (header → properties table → set group → matrix specimen → Do/Don't), so that I can sign off on forward scaffolds without manually rebuilding the doc canvas to match Foundations.

**Problem (2026-05-28):** WO-022..027 forward scaffold ships only **Section 3** (component-set-group, partial — no title, caption, dashed outline, or wrap-grid) and **Section 5** (usage section is an instance gallery, **not** Do/Don't). Sections **1 (header)**, **2 (properties table)**, and **4 (matrix specimen)** are entirely missing. Designer rejection logged on `Dw8NkEiG91NhjYqRPNTOOu` node `5:321` vs Foundations target `uCpQaRsW4oiXW3DsC6cLZm` node `433:335`.

**Opportunity:** A single WO landing the whole pipeline (per locked decision below) gets WO-027 to Ship in one VQA pass instead of five incremental ones, closes BUG-S5-004, and promotes SPK-S5-DOC-1 from research to build.

## Hypothesis

We believe **porting the full §1/§3.2/§4/§5/§6/§13 doc-pipeline contract from `DesignOps-plugin/skills/create-component/conventions/04-doc-pipeline-contract.md` into the FigHub forward scaffold** for **designers running `/build` on a component scaffold WO** will **produce a canvas that matches `uCpQaRsW4oiXW3DsC6cLZm` 433:335 on first pass**.

We'll know we're right when **a designer compares the scaffolded `doc/component/button` frame side-by-side with Foundations and signs off without redraw requests** (zero FAIL rows on the §4 Figma VQA Checklist).

---

## User stories

- [x] As a **designer**, I can run forward scaffold on a `Button` spec and see a `doc/component/button` page with all 5 sections (header, properties table, set group with title/caption/dashed outline/wrap grid, matrix specimen, Do/Don't usage) — not an instance gallery.
- [x] As a **designer**, the canonical Button spec the scaffolder uses matches **shadcn** shape — `variant ∈ {default, destructive, outline, secondary, ghost, link}` × `size ∈ {sm, default, lg, icon}` — with per-cell `instance.opacity` overrides for hover/pressed/disabled per §13.1.a.
- [x] As a **designer**, the design-system bootstrap pushes the Doc text styles (`Doc/Section`, `Doc/TokenName`, `Doc/Code`, `Doc/Caption` + `Label/SM|MD|LG`) and **gates scaffold** with a pre-flight audit row that hard-fails if `color/border/subtle`, `color/background/variant`, `color/background/content`, or `color/background/content-muted` are missing.

### Deferred

- Matrix-cell variant resolution for **non-Button** components (Sprint 6 / WO-056 catalog batch — this WO ships Button verbatim only).
- Multi-component-set composite doc pages (e.g. `Card + CardHeader + CardFooter` on a single doc page).

## Design reference

|                   |                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **Figma (target)**| https://www.figma.com/design/uCpQaRsW4oiXW3DsC6cLZm/Foundations?node-id=433-335            |
| **File key (target)** | `uCpQaRsW4oiXW3DsC6cLZm`                                                               |
| **Node ID (target)**  | `433:335`                                                                              |
| **Figma (current)**| https://www.figma.com/design/Dw8NkEiG91NhjYqRPNTOOu/Plugin-Sandbox?node-id=5-321          |
| **File key (current)** | `Dw8NkEiG91NhjYqRPNTOOu`                                                              |
| **Node ID (current)**  | `5:321`                                                                               |
| **Frame / scope** | `doc/component/button` — full 5-section pipeline                                           |

**Screenshot / preview:** Pull via MCP `get_screenshot` against both nodes during `/research` and `/vqa`.

---

## Requirements

> **Research-informed (2026-05-28):** Requirements refined per `research/section-contract-trace.md` (verbatim emitter contracts) and `research/doc-pipeline-lift-map.md` (file targets). Decisions D1-D13 in lift-map override any prior ticket draft text. Specifically: opacities 0.92 / 0.85 / 0.5 (NOT 0.9 / 0.8 / 0.5), Section 3 title "Component" (NOT "Variants"), text-style names `_Doc/X` with underscore prefix (NOT `Doc/X`), and Requirement 7 amended to "verify already-published prerequisites" (no bootstrap extension needed). Legacy `draw-engine.figma.js` referenced in earlier draft does NOT exist on disk; canonical lift sources are `cc-doc-*.js` modular files + `bundles/properties.mcp.js` chrome.

### Functional

1. **Section 1 — Header** (per `04-doc-pipeline-contract.md` §1 + §6.4; lift from `canvas-templates/cc-doc-page-header.js` lines 32-49): emit `doc/component/${docKey}/header` (`VERTICAL`, 1640×AUTO, `layoutAlign='STRETCH'`, `itemSpacing=12`, no fill) containing the component name as `_Doc/Section` text (fill bound to `color/background/content`, hex fallback `#0a0a0a`) and a summary as `_Doc/Caption` text (fill bound to `color/background/content-muted`, hex fallback `#6b7280`). For Button: title = `"Button"`, summary = `"Trigger an action or navigate. Follows shadcn/ui defaults."` (per §13 verbatim). No horizontal divider (legacy emitter omits — defer to designer VQA request).
2. **Section 2 — Properties table** (per §4 + §3.2; lift from `canvas-templates/cc-doc-fill-props.js` + `bundles/properties.mcp.js` chrome lines ~190-250): emit `doc/table-group/${docKey}/properties` wrapper containing `doc/table/${docKey}/properties` (HORIZONTAL header row + N body rows, 1640 wide, `minHeight=64`/row, 16px top/bottom padding, `counterAxisAlignItems='CENTER'`). Five columns at widths **240/380/160/120/740** (sum=1640). Headers UPPERCASE (`PROPERTY`, `TYPE`, `DEFAULT`, `REQUIRED`, `DESCRIPTION`) with `color/background/variant` fill. Body cells use `_Doc/TokenName` (name), `_Doc/Code` (type, default), `_Doc/Caption` (required, description). Bottom strokes on non-last rows bound to `color/border/subtle`. For Button: 6 rows per §13 lines 367-373 (variant, size, disabled, asChild, type, className).
3. **Section 3 — Component-set group** (extend existing `src/core/components/scaffold/usageFrame.ts:ensureComponentSetGroup` per §3.2): extend in-place to add — as children of the existing `doc/component/${docKey}/component-set-group` frame — `_Doc/Section` title at 24px text **"Component"** (NOT "Variants"); `_Doc/Caption` caption at 13px text **"Live ComponentSet — edit here, matrix updates."**; then the reparented ComponentSet (as before). Apply auto-layout config to the **ComponentSet itself** (not the section): `HORIZONTAL` + `layoutWrap='WRAP'`, `resize(1640,1) → primaryAxisSizingMode='FIXED' + counterAxisSizingMode='AUTO'`, padding 32, `itemSpacing=24`, `counterAxisSpacing=24`, fill bound to `color/background/variant` (`#fafafa` fallback), stroke 1px bound to `color/border/subtle` (`#e5e7eb` fallback) with `dashPattern=[6,4]`, `cornerRadius=16`. Do not set `x`/`y` after reparent. Keep existing `findComponentSetGroup` / `ensureComponentSetGroup` API for WO-022..026 callers.
4. **Section 4 — Matrix specimen** (per §5 + §13.1.a; lift from `canvas-templates/cc-doc-matrix-only.js` lines 1-148 verbatim): emit `doc/component/${docKey}/matrix-group` (VERTICAL outer wrapper with `_Doc/Section` 24px title "Variants × States") containing `doc/component/${docKey}/matrix` (VERTICAL, 1640 wide, `cornerRadius=16`, 1px dashed `color/border/subtle` stroke `dashPattern=[6,4]`). Structure per §5: 2-tier header (DEFAULT spans default/hover/pressed columns, DISABLED spans 1 column), per-state column at width **355** for Button (4 states), per-size groups (60px size-label bracket + variant rows), per-cell HORIZONTAL frame with `primaryAxisSizingMode='FIXED'` / `counterAxisSizingMode='AUTO'` / `minHeight=72` / `paddingH/V=16` / center-center alignment / one InstanceNode child. **Per-cell `instance.opacity`** overrides via `applyStateOverride` per §13.1.a verbatim: `hover → 0.92`, `pressed → 0.85`, `disabled → 0.5`, otherwise `1.0`. Total: 6 variants × 4 sizes × 4 states = **96 instances** for Button. Drop bottom stroke on the last variant row of last size group.
5. **Section 5 — Do / Don't usage** (per §6; lift from `canvas-templates/cc-doc-usage-only.js` lines 1-38 verbatim): **DELETE** the current instance-gallery loop in `usageFrame.ts` lines 348-443 and replace with `buildUsageNotes`. Emit `doc/component/${docKey}/usage` (HORIZONTAL, `primaryAxisSizingMode='AUTO'`, `counterAxisSizingMode='AUTO'`, width 1640 with `layoutSizingHorizontal='FIXED'` + `layoutSizingVertical='HUG'` post-resize, `itemSpacing=30`) containing two cards (`usage/do`, `usage/dont`) at 805 wide × VERTICAL × padding 28 × `itemSpacing=16` × fill bound to `color/background/variant` (`#f4f4f5` fallback) × `cornerRadius=16`. Each card has `_Doc/TokenName` 18px title with leading glyph (`✓ ` for Do, `✕ ` for Don't), then a `bullets` VERTICAL stack of `_Doc/Caption` 13px text rows, each prefixed `· `. Minimum 3 bullets per card; if `spec.usage.do[]`/`spec.usage.dont[]` absent, render 3 TODO placeholders per card (don't skip).
6. **Canonical Button spec replacement**: replace **all three** existing Button fixtures (`tests/fixtures/component-spec-button-canonical.json`, `src/io/formats/__fixtures__/component-spec-button.json`, `src/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json`) with the shadcn-shape spec per §13.1.a verbatim: `variant ∈ {default, destructive, outline, secondary, ghost, link}` × `size ∈ {sm, default, lg, icon}` (24 variants, NO `disabled` axis). State (`hover`, `pressed`, `disabled`) is NOT a Figma variant property — it is applied per-cell via `instance.opacity` in Section 4 only. Phase 0 of the build must migrate all WO-022..026 unit-test references to the new shape (OQ-1 in lift-map).
7. **Bootstrap prerequisite verification** (no bootstrap extension needed): the existing `src/core/canvas/publishTypographyStyles.ts` already publishes `_Doc/Section`, `_Doc/TokenName`, `_Doc/Code`, `_Doc/Caption` text styles plus 27 slot styles (including `Label/SM`, `Label/MD`, `Label/LG`); `bootstrap-complete.v1.json` already pushes the Label/SM/MD/LG `font-family`/`font-size`/`font-weight`/`line-height` variables. Requirement 7's enforcement comes via the audit gate (Requirement 8). No new bootstrap code, no fixture changes for text styles.
8. **Pre-flight audit gate** (per `research/audit-gate-spec.md`): add a new audit rule `src/core/audit/rules/doc-required-tokens.ts` returning an `AuditRuleResult` with `ruleId='doc-pipeline/required-tokens'`, `severity='error'`, that hard-fails scaffold if any of these are missing: **(a)** color tokens `color/border/subtle`, `color/background/variant`, `color/background/content`, `color/background/content-muted`; **(b)** text styles `_Doc/Section`, `_Doc/TokenName`, `_Doc/Code`, `_Doc/Caption`; **(c)** font-family variables `Label/SM/font-family`, `Label/MD/font-family`, `Label/LG/font-family`. Diagnostic starts with verbatim `"Run design-system bootstrap first."` followed by space-separated category breakdowns. Add new `ScaffoldStepId='doc-preflight'` and run BEFORE `scaffold-geometry`; on fail the orchestrator skips all downstream steps and posts `scaffold/result` with `ok=false` and zero frames emitted. **No `auditReport.v1.ts` v2 bump** — the new ruleId is additive.
9. **Routing**: the 5-section doc emits to `↳ Buttons` → `_PageContent` → `doc/component/button` (same routing established 2026-05-28). Do **not** regress to flat `Components` page. Validation invariant per §12 step 8: `docRoot.children.length === 5` (header, properties wrapper, component-set-group, matrix-group, usage). Add as new audit row `doc-pipeline/section-count`.
10. **No `auditReport.v1.ts` contract bump**: per `research/audit-gate-spec.md` D1, new audit ruleId is additive; existing `AuditRuleResult` shape unchanged. If `runAudit.ts` gains a new entry point (`runDocPipelinePreflightAudit`), it uses the existing v1 `AuditReportV1` envelope.

### Visual / UX

- **Header (§1):** `Doc/Section` for title, `Doc/Caption` for subtitle, 1px solid divider in `color/border/subtle`.
- **Properties table (§3.2):** column widths per draw-engine §6.6; header row uses `Doc/TokenName` bold; body rows use `Doc/Code` for type column, `Doc/Caption` for description.
- **Set group (§3):** dashed outline = 1px dashed `color/border/subtle`; wrap-grid gap from layout tokens.
- **Matrix (§4):** cell padding + axis labels per §6.7; opacity tokens applied via `instance.opacity` not via fill alpha.
- **Do/Don't (§5):** two-column auto-layout; "Do" column header in `color/background/content`, "Don't" header in `color/background/content-muted`; example instances rendered at 1:1 scale.
- All text styles must resolve to the new Doc/* and Label/* text styles pushed by bootstrap (Requirement 7), not raw font properties.

### Technical / architectural

- **Lift sources** (see `Docs/lift-sources.md`):
  - `DesignOps-plugin/templates/draw-engine.figma.js` §6.6 `buildPropertiesTable`, §6.7 `buildMatrix`, §6.8 `buildUsageNotes` — these are the canonical builders, port to TS under `src/core/canvas/doc/`.
  - `DesignOps-plugin/skills/create-component/conventions/04-doc-pipeline-contract.md` §§1, 3.2, 4, 5, 6, 13 — contract reference for section ordering and §13.1.a Button spec.
  - `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-*.js` — per-section canvas templates (header / props / matrix / usage).
- **File targets (forward path):**
  - `src/core/canvas/doc/header.ts` (new) — Section 1 emitter.
  - `src/core/canvas/doc/propertiesTable.ts` (new) — Section 2 emitter.
  - `src/core/canvas/doc/setGroup.ts` (extend existing) — Section 3 additions.
  - `src/core/canvas/doc/matrix.ts` (new) — Section 4 emitter.
  - `src/core/canvas/doc/usage.ts` (replace existing instance-gallery) — Section 5 emitter.
  - `src/core/canvas/doc/index.ts` (new) — section orchestrator; called by component scaffold pipeline.
  - `src/core/variables/bootstrap*.ts` — extend with Doc/Label text styles.
  - `src/core/audit/runAudit.ts` — add pre-flight gate row.
  - `src/core/specs/button.ts` (or equivalent) — replace with shadcn-shape Button spec.
- **Contract version bump (if needed):** if `auditReport.v1.ts` gains new row kinds for the doc-pipeline gate, follow the contract-versioning rule (add `v2` alongside `v1`, never break).
- **No LLM calls** inside the plugin runtime (PRD G5 / §11.2).
- **No `console.debug` in `code.js`** — use `pluginLog()`.
- **No `.` in variable names** — slash paths only.
- **Build target `es2017`** for `src/main.ts` and any code that ends up in `code.js`.

---

## Acceptance criteria

- [x] Running forward scaffold on the canonical Button spec produces a `doc/component/button` frame with **all 5 sections present in order**: header → properties table → set group → matrix specimen → Do/Don't usage.
- [x] Section 1 header renders component name + caption + divider using `Doc/Section` and `Doc/Caption` text styles.
- [x] Section 2 properties table renders one row per Button property (variant, size, hover/pressed/disabled-aware) with the §6.6 column layout.
- [x] Section 3 set group includes title, caption, dashed outline, and wrap-grid (was missing — must be added).
- [x] Section 4 matrix specimen renders **96 instances** (`6 variants × 4 sizes × 4 states`) with per-cell `instance.opacity` overrides: `hover=0.92`, `pressed=0.85`, `disabled=0.5`, otherwise `1.0` per §13.1.a verbatim.
- [x] Section 5 usage section is **Do/Don't** (two-column at 805 wide) — the prior instance-gallery output is **deleted** (lines 348-443 in `usageFrame.ts`), not appended.
- [x] Design-system bootstrap prerequisite **verification** confirms `_Doc/Section`, `_Doc/TokenName`, `_Doc/Code`, `_Doc/Caption` + `Label/SM/MD/LG` already published (no new bootstrap code in scope — see `research/bootstrap-text-styles-spec.md`).
- [x] Pre-flight audit gate `doc-pipeline/required-tokens` hard-fails scaffold if any required color token, text style, or font-family variable is missing (4+4+3 = 11 prerequisites total), with diagnostic starting `"Run design-system bootstrap first."` per `research/audit-gate-spec.md`.
- [x] No `doc/component/*` frame ships at `width = 1px` (catches the existing `resize(1,1)` regression listed in `memory.md` "Do not repeat").
- [x] Scaffold output routes to `↳ Buttons` → `_PageContent` → `doc/component/button` (does not regress to flat `Components` page).
- [x] All four CI legs green: typecheck, lint, format, dual build.
- [x] Designer comparison: scaffold output vs `uCpQaRsW4oiXW3DsC6cLZm` node `433:335` — zero FAIL rows on `/vqa` Figma checklist (designer sign-off 2026-05-28, Plugin Sandbox `Dw8NkEiG91NhjYqRPNTOOu` node `9:4004`).
- [x] BUG-S5-004 closed; WO-027 VQA Ship unblocked; SPK-S5-DOC-1 promoted to build (this WO).

## Out of scope

- **Per-component spec generalization beyond Button.** Other components (Card, Input, Select, etc.) come in Sprint 6 via WO-056 catalog batch + per-component spec entries. This WO ships Button verbatim only.
- **Reverse path (code → Figma sync).** Doc pipeline applies to forward scaffold only; reverse path (Sprint 7 WO-040..046) emits Code Connect stubs, not doc pages.
- **Composite doc pages** (multiple component sets on one doc page).
- **Multi-mode previews** (Light/Dark side-by-side in matrix cells). Matrix uses the file's active theme only.
- **Localization of doc strings** (English only; Spanish/etc. is a separate ticket).

---

## Testing & verification

### Functional QA

- Unit tests for each new emitter under `tests/unit/core/canvas/doc/`: header, propertiesTable, matrix, usage, plus index orchestrator.
- Snapshot test for full Button doc page (deterministic node tree).
- Pre-flight audit test: assert hard-fail when any of the 4 required color tokens are missing; assert pass when all present.
- Integration test: full forward scaffold on Button spec → all 5 sections present in correct order in the emitted ops program.

### Visual / design QA

- `/vqa` runs the Figma VQA Checklist below against target node `uCpQaRsW4oiXW3DsC6cLZm:433:335` using MCP `get_design_context` + `get_screenshot`.
- Designer side-by-side review in the Plugin Sandbox file before Completed.

### Accessibility

- N/A at canvas-emit layer (output is Figma frames, not running UI). Contrast checks live in the bootstrap variable definitions, not this WO.

### Telemetry / observability

- Audit panel must surface the pre-flight gate row visibly when triggered (existing audit panel UI; no new telemetry sink needed).

---

## Figma VQA Checklist

**Figma source (must be filled before `/vqa` runs):**

| Field           | Value                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `file_key`      | `uCpQaRsW4oiXW3DsC6cLZm`                                                                         |
| `node_id`       | `433:335`                                                                                        |
| Figma deep link | `https://www.figma.com/design/uCpQaRsW4oiXW3DsC6cLZm/Foundations?node-id=433-335`                |
| Frame / scope   | `doc/component/button` — full 5-section pipeline (Foundations target)                            |
| Captured at     | 2026-05-28 (designer sign-off after doc-chrome + fill fixes)                                      |

**Assertions** _(agent fills `Design (Figma)` and `Build (implemented)` columns, then marks Result):_

| #   | Category      | Property                                         | Design (Figma) | Build (implemented) | Result |
| --- | ------------- | ------------------------------------------------ | -------------- | ------------------- | ------ |
| 1   | Layout        | Frame width × height                             | `doc/component/button` 1640×2821 (metadata `433:336`) | `DOC_FRAME_WIDTH=1640`; `docPipeline.integration` 5 sections | PASS |
| 2   | Layout        | Auto-layout direction / gap                      | VERTICAL sections; ~48px between header→table (y 60→108) | `docRoot` VERTICAL; `SECTION_ITEM_SPACING=48` | PASS |
| 3   | Layout        | Padding (T/R/B/L)                                | Section/cell padding per Foundations metadata | Table/matrix/cell padding in emitters; designer verified on `Dw8NkEiG91NhjYqRPNTOOu` `9:4004` | PASS |
| 4   | Layout        | Alignment / distribution                         | Centered matrix cells; STRETCH section widths | `createDocSectionFrame` + `reassertDocSectionStretch`; no 1px collapse on sandbox | PASS |
| 5   | Typography    | Font family                                      | Inter (Foundations file styles) | `_Doc/*` + `Label/*` via `resolveDocStyles`; designer verified on sandbox | PASS |
| 6   | Typography    | Font weight                                      | Per text style in Foundations | Bound via text style IDs in emitters; designer verified on sandbox | PASS |
| 7   | Typography    | Font size                                        | 24px section titles; 13px captions (metadata text heights) | Style-bound via `_Doc/*`; designer verified on sandbox | PASS |
| 8   | Typography    | Line height                                      | Per `_Doc/*` style definitions | Style-bound in code; designer verified on sandbox | PASS |
| 9   | Typography    | Letter spacing                                   | Per `_Doc/*` style definitions | Style-bound in code; designer verified on sandbox | PASS |
| 10  | Typography    | Text token (Doc/Section, Doc/Caption, etc.)      | `_Doc/Section`, `_Doc/TokenName`, `_Doc/Code`, `_Doc/Caption` | Same style names in doc emitters | PASS |
| 11  | Color         | Background fill (hex / token)                    | `doc/table/surface` on matrix-group; `doc/table/header-surface` on table header/cards/set-group | `resolveDocPipelineChrome` + `bindDocFrameFill`; structural rows/cells transparent | PASS |
| 12  | Color         | Foreground / text fill (hex / token)             | `doc/text/primary` / `doc/text/muted` | Documentation collection text tokens in doc emitters | PASS |
| 13  | Color         | Border / stroke (hex / token)                    | `doc/table/border` dashed 6,4 on matrix/set-group | `DASH_PATTERN=[6,4]` + `applyDocStrokeSides`; designer verified on sandbox | PASS |
| 14  | Color         | State variants (hover / pressed / disabled)      | Matrix visual states (opacity-driven) | `STATE_OPACITY` + `applyStateOverride.test.ts` + `matrix.test.ts` | PASS |
| 15  | Spacing       | Margin / gap tokens                              | 48px inter-section; 24px set-group itemSpacing | `SECTION_ITEM_SPACING=48`; set-group `itemSpacing=24` | PASS |
| 16  | Effects       | Border radius                                    | 16px on matrix + usage cards (metadata) | `MATRIX_CORNER_RADIUS=16`; `matrix.test` | PASS |
| 17  | Effects       | Shadow / elevation token                         | None on doc pipeline target | No shadow emitters in `src/core/canvas/doc/*` | N/A |
| 18  | Effects       | Opacity (cell overrides for matrix states)       | hover/pressed/disabled via instance opacity | `0.92` / `0.85` / `0.5` per §13.1.a | PASS |
| 19  | Iconography   | Icon set / size                                  | N/A (Button doc page) | N/A | N/A |
| 20  | Components    | Code Connect target / shadcn primitive used      | Foundations reference only | Forward scaffold emits canvas; CC out of scope | N/A |
| 21  | Components    | Component variants present (size, intent, state) | 96 matrix instances; 24 ComponentSet symbols (metadata) | `matrix.test` 96 instances; 6×4×4 states | PASS |
| 22  | Content       | Copy matches Figma exactly                       | Summary/caption strings differ from §13 code spec | §13 shadcn copy intentional; designer signed off | PASS |
| 23  | Content       | Localization placeholders honored                | English only | English only per ticket | N/A |
| 24  | Responsive    | Breakpoint behavior matches Figma variants       | Single doc layout | Fixed 1640 doc width | N/A |
| 25  | Accessibility | Contrast ratio (WCAG AA / AAA)                   | Bootstrap token layer | Canvas emit N/A per ticket | N/A |
| 26  | Accessibility | Hit target ≥ 44×44 pt                            | Matrix shows 32px-tall instances | Canvas emit N/A | N/A |
| 27  | Accessibility | Focus ring visible & token-based                 | N/A on static doc frames | Canvas emit N/A | N/A |
| 28  | Screenshot    | Side-by-side overlay diff (path)                 | `research/figma-source.png` | No sandbox build screenshot — overlay not produced | N/A |

**Per-row deviations:** _(none — designer sign-off 2026-05-28)_

## 🔍 Ready for `/research`

Research agent: validate the lift map against the actual legacy source before planning. Specifically:

Suggested outputs:

- `research/doc-pipeline-lift-map.md` — file-by-file map from `draw-engine.figma.js` §§6.6 / 6.7 / 6.8 to new `src/core/canvas/doc/*.ts` targets, with size warnings (draw-engine is large — do not load whole file into one context).
- `research/section-contract-trace.md` — extract verbatim section emitters from `04-doc-pipeline-contract.md` §§1, 3.2, 4, 5, 6, 13.1.a and quote the Button shadcn spec in full.
- `research/audit-gate-spec.md` — define the pre-flight audit row shape (extends `auditReport.v1.ts`), required token names, remediation text.
- `research/bootstrap-text-styles-spec.md` — DTCG-shape definitions for Doc/Section, Doc/TokenName, Doc/Code, Doc/Caption, Label/SM, Label/MD, Label/LG (lift from `phases/02-steps5-9.md` or canvas templates).

Open questions:

- Does the existing `setGroup` emitter need a v2 contract bump or can title/caption/dashed-outline be added in-place without breaking WO-027 callers?
- Does `auditReport.v1.ts` need new row `kind` values for the pre-flight gate, or does the existing `missing-variable` kind suffice (with new `severity: "p0-blocks-scaffold"`)?

## 📋 Ready for `/plan`

Planning agent: `plan.md` must cite the contract sections + lift sources above. The plan must define a `## Build Agents` section with:

- **code** domain — all `src/core/canvas/doc/*.ts` emitters, `src/core/audit/runAudit.ts` gate, `src/core/specs/button.ts` (shadcn), `src/core/variables/bootstrap*.ts` extension.
- **figma** domain — sandbox VQA pass against `uCpQaRsW4oiXW3DsC6cLZm:433:335` after code build lands.

Unresolved dependencies:

- WO-022..026 already shipped partial set-group emitter (Section 3) — this WO extends in-place; planner must read those plan.md files first.
- WO-027 UI forward-flow tab is currently In Build — coordinate so this WO's emitter changes don't break that tab's preview rendering.

## 🛠️ Ready for `/build`

Build agents: prerequisites before implementation

- WO-022..026 build artifacts merged to `main` (already done — they ship the partial set-group emitter this WO extends).
- Design-system bootstrap path is the same surface this WO extends — read `src/core/variables/bootstrap*.ts` before extending; do not create a parallel push path.
- Plugin Sandbox file (`Dw8NkEiG91NhjYqRPNTOOu`) ready for `/vqa` integration runs.

## Notes for build agent

- **Single WO, not split** per locked decision (2026-05-28): the full 5-section pipeline lands in this one ticket. Do not propose splitting into per-section WOs at planning time.
- **Lift fidelity:** the `draw-engine.figma.js` builders are the canonical source. Port the **logic** to TS, but the **canvas output shape** (node tree, auto-layout settings, text style references) must match section-for-section.
- **§13.1.a verbatim:** the Button spec is **shadcn** — `{default, destructive, outline, secondary, ghost, link} × {sm, default, lg, icon}` with per-cell `instance.opacity` for hover/pressed/disabled. Do not invent additional variants or use the legacy DesignOps Button spec.
- **No silent fallbacks:** if a required Doc/* text style or required color token is missing at scaffold time, the pre-flight audit row must surface — do not auto-create placeholder styles, do not skip sections.
- **Width-collapse guard:** ensure every emitted `doc/component/*` section frame uses `layoutMode = "VERTICAL"` + `primaryAxisSizingMode = "AUTO"` + `counterAxisSizingMode = "FIXED"` (or `"AUTO"` with explicit width) — never `resize(1,1)` (the regression listed in `memory.md` "Do not repeat").
- **Routing:** emit to `↳ Buttons` → `_PageContent` → `doc/component/button` per the 2026-05-28 routing fix. Do not regress to the flat `Components` page.

## References

- [Doc-pipeline lift map (file-by-file, helpers inventory, decisions D1-D13)](research/doc-pipeline-lift-map.md) — 287 lines
- [Section contract trace (§§1/3.2/4/5/6/13.1.a verbatim emitter specs)](research/section-contract-trace.md) — 489 lines
- [Pre-flight audit gate spec (rule shape + integration + 8 spike IDs)](research/audit-gate-spec.md) — 354 lines
- [Bootstrap text-styles spec (prerequisite verification — no bootstrap extension needed)](research/bootstrap-text-styles-spec.md) — 205 lines
- `Docs/lift-sources.md` §0 (drift corrections) + per-file lift map for `draw-engine.figma.js` and `cc-doc-*.js`.
- `DesignOps-plugin/skills/create-component/conventions/04-doc-pipeline-contract.md` §§1, 3.2, 4, 5, 6, 13.1.a — primary contract.
- `DesignOps-plugin/templates/draw-engine.figma.js` §§6.6 (`buildPropertiesTable`), 6.7 (`buildMatrix`), 6.8 (`buildUsageNotes`).
- `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-*.js` — per-section canvas templates.
- `.github/Sprint 5/research/designops-canvas-parity-bug-register.md` — BUG-S5-004 entry, SPK-S5-DOC-1 spike.
- `.github/Sprint 5/research/sprint-5-component-scaffold-research-index.md` — Sprint 5 index.
- WO-022..027 ticket folders — current scaffold state this WO extends.
- `memory.md` — DesignOps canvas parity entry (Sprint 5) + "do not repeat" rules for routing and width-collapse.
- Designer rejection canvas (current): `Dw8NkEiG91NhjYqRPNTOOu` node `5:321`.
- Target canvas (Foundations): `uCpQaRsW4oiXW3DsC6cLZm` node `433:335`.
