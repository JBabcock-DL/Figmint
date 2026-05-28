# Plan — WO-057: DesignOps doc-pipeline parity (header + properties table + matrix specimen + Do/Don't usage)

> **Canonical destination on approval:** `c:\Users\jbabc\Documents\GitHub\FigHub\.github\Sprint 5\WO-057-designops-doc-pipeline-parity\plan.md`. The IDE-sidecar copy at `C:\Users\jbabc\.claude\plans\staged-dazzling-starlight.md` is harness-internal only — build sub-agents and `/build` read from the ticket-folder copy. Immediately after `ExitPlanMode`, this exact content is written verbatim to the ticket folder via the `Write` tool, the file is re-read for byte-for-byte verification, and the GitHub Project status is transitioned to **In Planning** (option `69ec5a34`) via GraphQL.
>
> **Backend:** GitHub Project #9 · Issue #60 · Item `PVTI_lAHOD9B30s4BY4aYzguFS5g`
> **Promoted from:** SPK-S5-DOC-1 · **Closes:** BUG-S5-004 · **Blocks:** WO-027 VQA Ship
> **Plan-quality bar:** `.github/templates/plan-quality-bar.md` — integration WO (≥350 lines).
> **Reading order for build sub-agents:** `memory.md` → `.github/templates/workflow.md` → this `plan.md` → `ticket.md` → the 4 research files in `research/` → assigned `cc-doc-*.js` lift source for the agent's Phase 2 section. Do NOT load `bundles/properties.mcp.js`, `bundles/matrix.mcp.js`, `bundles/usage.mcp.js` together in one context (~130 KB combined — see D13).

## Context

The Sprint 5 forward-scaffold pipeline (WO-022..027) ships only **two partial sections** of the canonical DesignOps doc layout: a bare `component-set-group` (no title/caption/dashed outline/WRAP grid) and a `usage` frame populated as an **instance gallery** instead of the contract's **Do / Don't card row**. Sections 1 (header), 2 (properties table), and 4 (matrix specimen) are entirely missing. Designer rejection on `Dw8NkEiG91NhjYqRPNTOOu` node `5:321` vs Foundations target `uCpQaRsW4oiXW3DsC6cLZm` node `433:335`.

The P0 geometry fix landed 2026-05-28 (BUG-S5-001/002/003 — `createDocSectionFrame` + `assertNoCollapsedAxis` in `usageFrame.ts` + `autoLayout.ts`); 546 unit tests green; in-Figma verification still pending. That fix corrected `width=1` collapse but did **not** add the missing 3 sections, fix the wrong-content section 5, or migrate the canonical Button spec to shadcn shape.

This WO ports the full `04-doc-pipeline-contract.md` §§1 / 3.2 / 4 / 5 / 6 / 13.1.a into 6 new TS emitters under `src/core/canvas/doc/*.ts`, replaces three Button fixtures with the shadcn-native shape `{default, destructive, outline, secondary, ghost, link} × {sm, default, lg, icon}` (24 variants, no `disabled` axis), applies per-cell `instance.opacity` overlay (`0.92 / 0.85 / 0.5` per §13.1.a) for hover/pressed/disabled in the matrix, adds a pre-flight audit gate `doc-pipeline/required-tokens` that hard-fails scaffold if any of the 11 required prerequisites (4 color tokens + 4 `_Doc/*` text styles + 3 `Label/*/font-family` variables) is missing, and migrates all WO-022..026 unit-test fixtures off the legacy `{primary, secondary, outline} × {sm, md} × {disabled}` shape.

Closing BUG-S5-004 unblocks `/vqa` Ship on WO-027 and brings FigHub's forward scaffold output to canvas-parity with the Foundations reference implementation in one pass instead of five.

## Approach

Three slices, executed sequentially as four build phases (Phase 0 → 1 → 2 → 3 → 4):

1. **Migration first (Phase 0).** Replace 3 Button fixtures + migrate WO-022..026 unit tests off the legacy shape **before** any emitter code, so subsequent phases compile and test against the shadcn target. Verify `bootstrap-complete.v1.json` already contains the 4 required color tokens (research D11 confirms it does, but build re-greps to close OQ-2 zero-doubt).
2. **Foundation primitives (Phase 1, parallel).** Three independent code agents land the small infrastructure pieces in parallel: doc-pipeline constants + `applyButtonStateOverride` helper, the pre-flight audit rule `doc-pipeline/required-tokens`, and the orchestrator scaffolding (`scaffold/doc-preflight` step ID + `runScaffold.ts` early-exit branch) — these have no inter-dependencies and can land same day.
3. **Section emitters (Phase 2, sequential).** One agent per section in **emit order** (header → propertiesTable → setGroup → matrix → usage). Sequential, not parallel, because (a) each agent reads only the one `cc-doc-*.js` file matching its section (D13 reading-order rule), (b) Section 5 (`usage.ts`) requires deleting `usageFrame.ts` lines 348-443 which Section 3 (`setGroup.ts`) extends in-place, so order matters, (c) integration tests in Phase 3 need all 5 emitters present.
4. **Orchestrator wire-up + WO-027 coordination (Phase 3, single agent).** Wire `src/core/canvas/doc/index.ts` to call the 5 emitters in order, swap `runScaffold.ts` to call `buildDocPipeline` instead of `buildUsageFrame`, read WO-027 plan.md + extend its preview render path for 5 sections (OQ-3), and update the BUG-S5-001..004 entries in the bug register.
5. **VQA on Plugin Sandbox (Phase 4, figma agent).** `/vqa` against `uCpQaRsW4oiXW3DsC6cLZm:433:335` via MCP `get_design_context` + `get_screenshot`. Per memory.md do-not-repeat: only `/vqa` Step 7 may transition cards to Completed.

**Lift fidelity discipline.** Every section emitter ports the **logic** of its `cc-doc-*.js` source verbatim (frame names, sizing modes, paddings, fills, strokes, dash patterns, text styles, item-spacing). Low-level helpers (`bindColor`, `makeFrame`, `makeText`, `readTypoString`, `resize-then-AUTO`) are **not** ported — D1/F5 lock that FigHub's existing equivalents (`bindPaintToVar`, `createHugFrame`, `makeTableText`, `ensureLocalVariableMap`, `resizeThenApplySizing`) are the canonical replacements.

**No silent fallbacks.** If any required token / style / font-family variable is missing at scaffold time, the pre-flight gate fires and zero frames are emitted. No hex-fallback "best-effort" path — that path would silently produce off-brand output the designer can't visually distinguish from a bug.

## Steps

### Phase 0 — Pre-flight migration (sequential)

- [x] **Step 1** — Grep `tests/unit/core/components/scaffold/**` for hardcoded legacy variant names (`primary`, `secondary`, `outline`, `disabled` as variant key) and produce a migration list. Files to scan: `applyBindings.test.ts`, `applyProperties.test.ts`, `applyPropertiesPreCombine.test.ts`, `auditRows.test.ts`, `scaffold.integration.test.ts`, `idempotency.test.ts`, `usageFrameAudit.test.ts`, plus any `__fixtures__/*.json`. **Done when** a migration list is captured in `.github/Sprint 5/WO-057-…/research/test-migration-list.md` and reviewed.
- [x] **Step 2** — Replace `tests/fixtures/component-spec-button-canonical.json` with shadcn shape: `variant ∈ {default, destructive, outline, secondary, ghost, link}` × `size ∈ {sm, default, lg, icon}` (24 variants; **no** `disabled` axis). Keep `archetype: 'chip'`. Keep `bindings[]` and `props[]` re-keyed to the new variant names where applicable. **Done when** the fixture parses against `ComponentSpecV1` and `expandVariantMatrix` returns 24 entries.
- [x] **Step 3** — Replace `src/io/formats/__fixtures__/component-spec-button.json` + matching `.md` sidecar with the same shadcn shape. **Done when** the `io/formats` round-trip parse + emit tests still pass.
- [x] **Step 4** — Replace `src/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json` with the shadcn shape. **Done when** `fixture.smoke.test.ts` passes.
- [x] **Step 5** — Migrate each unit-test file in the Step 1 list. Strategy: replace hardcoded `'primary' / 'secondary' / 'md' / 'disabled=true'` strings with the new shadcn keys, and update curated-combo cardinality expectations (e.g. `expect(combos.length).toBe(6)` → `expect(combos.length).toBe(MAX_USAGE_INSTANCES)` since the new matrix is 24 not 12). **Done when** `npm test -- --run tests/unit/core/components/scaffold tests/integration/core/components/scaffold` is fully green against the new fixtures.
- [x] **Step 6** — Grep `bootstrap-complete.v1.json` for the 4 required color tokens (`color/border/subtle`, `color/background/variant`, `color/background/content`, `color/background/content-muted`). If any missing, file a 1-line fixture-fix WO ahead of Phase 1; otherwise mark OQ-2 RESOLVED inline in `audit-gate-spec.md`. **Done when** the grep output confirms all 4 present OR a fixture-fix WO is opened and merged.

### Phase 1 — Foundation primitives (parallel; 3 agents)

- [x] **Step 7** — Create `src/core/canvas/doc/constants.ts` exporting `DOC_FRAME_WIDTH = 1640`, `GUTTER_W_SIZE = 60`, `GUTTER_W_VARIANT = 160`, `MATRIX_CORNER_RADIUS = 16`, `DASH_PATTERN = [6, 4]`, `SECTION_ITEM_SPACING = 48`, `STATE_OPACITY = { hover: 0.92, pressed: 0.85, disabled: 0.5 } as const`. **Done when** every value is referenced as `import { … } from '@/core/canvas/doc/constants'` by later emitters; no magic numbers in section files.
- [x] **Step 8** — Create `src/core/canvas/doc/applyStateOverride.ts` exporting `applyButtonStateOverride(instance: InstanceNode, stateKey: 'default' | 'hover' | 'pressed' | 'disabled'): void` that sets `instance.opacity = STATE_OPACITY[stateKey] ?? 1` per §13.1.a verbatim. **Done when** `applyButtonStateOverride(instance, 'hover')` sets `instance.opacity = 0.92` and a unit test covers all 4 state keys + the fallthrough.
- [x] **Step 9** — Create `src/core/audit/rules/doc-required-tokens.ts` exporting `buildDocRequiredTokensRow({ tokens, textStyles, fontFamilyVars })` per `audit-gate-spec.md` F3 (verbatim TS contract — copy from the research file). Diagnostic must start with literal `"Run design-system bootstrap first."` followed by space-separated category breakdowns. Severity = `error` (default). **Done when** unit tests SPK-AUDIT-1, SPK-AUDIT-2, SPK-AUDIT-3 pass (research file lines 307-309).
- [x] **Step 10** — Add `runDocPipelinePreflightAudit(): Promise<AuditReportV1>` to `src/core/audit/runAudit.ts` per `audit-gate-spec.md` F6 (verbatim). Reads `figma.variables.getLocalVariableCollectionsAsync()` + `figma.getLocalVariablesAsync()` + `figma.getLocalTextStylesAsync()`. Wires Theme + Typography collection lookups. Returns `AuditReportV1` with `meta.operation = 'scaffold-component'`, single row `doc-pipeline/required-tokens`. **Done when** SPK-AUDIT-4 integration test passes (research file line 310).
- [x] **Step 11** — Add `'doc-preflight'` to the `ScaffoldStepId` union in `src/io/messages/scaffold.ts` and add the matching label `"Pre-flight doc-pipeline check"` to `getScaffoldStepLabel`. **Done when** typecheck is green and `postProgress('doc-preflight', 'running')` is type-safe.
- [x] **Step 12** — In `src/core/components/scaffold/runScaffold.ts` add a new step at the start of the `try` block: `postProgress('doc-preflight', 'running'); const preflightAudit = await runDocPipelinePreflightAudit(); audits.push(preflightAudit); if (!preflightAudit.passed) { const reason = preflightAudit.results[0]?.diagnostic ?? 'Pre-flight failed'; postProgress('doc-preflight', 'error', { detail: reason, audit: preflightAudit }); postScaffoldError(reason, 'doc-preflight'); return; } postProgress('doc-preflight', 'done');`. Runs **before** `ensureComponentScaffoldTarget` to ensure zero frames if it fails. **Done when** SPK-AUDIT-4 confirms no `doc/component/*` frame is created on a fresh Untitled file with no tokens.
- [x] **Step 13** — Export `runDocPipelinePreflightRules` from `src/core/audit/rules/index.ts` (one-line export). **Done when** the import in `runAudit.ts` resolves.

### Phase 2 — Section emitters (sequential, one agent per step)

- [x] **Step 14** — **Section 1 (header).** Create `src/core/canvas/doc/header.ts` exporting `buildSectionHeader(docRoot: FrameNode, spec: ComponentSpecV1): FrameNode`. Lift logic from `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-page-header.js` lines 32-49. Emits `doc/component/${docKey}/header` (VERTICAL, `layoutAlign='STRETCH'` to fill 1640, `itemSpacing=12`, no fill) containing two text nodes: title (`spec.displayTitle ?? spec.name`, style `_Doc/Section`, fill bound to `color/background/content` with hex fallback `#0a0a0a`) and summary (`spec.summary ?? ''`, style `_Doc/Caption`, fill bound to `color/background/content-muted` with hex fallback `#6b7280`). For Button: title=`"Button"`, summary=`"Trigger an action or navigate. Follows shadcn/ui defaults."` (per §13 verbatim — comes from spec, not hardcoded). Use `findTextStyleByName` from `cells.ts:resolveDocStyles` to apply text styles. No horizontal divider (cc-doc-page-header.js omits per D7). **Done when** `header.test.ts` snapshot has `doc/component/button/header` with 2 children, both text, widths summing or hugging.
- [x] **Step 15** — **Section 2 (properties table).** Create `src/core/canvas/doc/propertiesTable.ts` exporting `buildPropertiesTable(docRoot: FrameNode, spec: ComponentSpecV1): FrameNode`. Lift chrome from `bundles/properties.mcp.js` lines ~190-250 (header row + 5-column body chrome) + fill logic from `cc-doc-fill-props.js` (per F2). Emits `doc/table-group/${docKey}/properties` wrapper containing `doc/table/${docKey}/properties` (HORIZONTAL header row + N body rows; 1640 wide; `minHeight=64`/row; 16px top/bottom padding; `counterAxisAlignItems='CENTER'`). Five columns at widths **240/380/160/120/740** (sum=1640). Headers UPPERCASE (`PROPERTY`, `TYPE`, `DEFAULT`, `REQUIRED`, `DESCRIPTION`), `_Doc/Caption`, fill bound to `color/background/variant` (hex fallback `#fafafa`). Body cells: name=`_Doc/TokenName`, type+default=`_Doc/Code`, required+description=`_Doc/Caption`. Bottom strokes on non-last rows bound to `color/border/subtle` (hex fallback `#e5e7eb`). Body content from `spec.props` (re-ordered per §4 canonical order: variant props → state props → content → a11y → escape-hatch). For Button: 6 rows (variant, size, disabled, asChild, type, className) — pulled from updated spec. **Done when** `propertiesTable.test.ts` confirms `docRoot.findChild('doc/table-group/button/properties')` has correct column widths and 7 rows (1 header + 6 body), and integration test confirms text content matches the §13 reference table verbatim.
- [x] **Step 16** — **Section 3 (component-set group extension).** Create `src/core/canvas/doc/setGroup.ts` exporting `extendComponentSetGroup(setGroup: FrameNode, componentSet: ComponentSetNode, spec: ComponentSpecV1): void`. **Does NOT replace** the existing `ensureComponentSetGroup` in `usageFrame.ts` — extends it in-place per D5/F8. After `ensureComponentSetGroup` returns, this function: (a) prepends a `_Doc/Section` title text **"Component"** (24px, fill bound to `color/background/content`) and a `_Doc/Caption` caption text **"Live ComponentSet — edit here, matrix updates."** (13px, fill bound to `color/background/content-muted`) — both verbatim per D2/D3; (b) applies to the **ComponentSet itself** (not the section frame): `layoutMode='HORIZONTAL'`, `layoutWrap='WRAP'`, `resize(1640,1)` → `primaryAxisSizingMode='FIXED'` + `counterAxisSizingMode='AUTO'`, `paddingLeft/Right/Top/Bottom=32`, `itemSpacing=24`, `counterAxisSpacing=24`, fill bound to `color/background/variant` (hex fallback `#fafafa`), `strokes=[{type:'SOLID', boundVariables: ...}]` bound to `color/border/subtle` (hex fallback `#e5e7eb`), `strokeWeight=1`, `dashPattern=[6,4]`, `cornerRadius=16`. Do **not** set `x`/`y` after reparent. **Done when** `setGroup.test.ts` confirms 3 children on the section frame (title + caption + ComponentSet) and the ComponentSet has WRAP, padding 32, dashed stroke. **Coordination:** keep `findComponentSetGroup` / `ensureComponentSetGroup` exports stable so WO-022..026 lookups don't break (R2 mitigation).
- [x] **Step 17** — **Section 4 (matrix specimen).** Create `src/core/canvas/doc/matrix.ts` exporting `buildMatrix(docRoot: FrameNode, spec: ComponentSpecV1, componentSet: ComponentSetNode, variantByKey: Record<string, ComponentNode>): FrameNode`. Lift `buildMatrix` logic from `cc-doc-matrix-only.js` lines 1-148 verbatim (per F2/D8). Emits outer `doc/component/${docKey}/matrix-group` (VERTICAL wrapper with `_Doc/Section` 24px title text **"Variants × States"** verbatim per D5) containing inner `doc/component/${docKey}/matrix` (VERTICAL, 1640 wide, `cornerRadius=16`, 1px dashed `color/border/subtle` stroke with `dashPattern=[6,4]`). Inside the matrix: 2-tier header (`matrix/header-groups` row with DEFAULT band spanning hover+default+pressed columns + DISABLED band spanning 1 column; `matrix/header-states` row with 4 state columns at width **355** each for Button). Per-size groups (4 for Button: sm, default, lg, icon) — each is HORIZONTAL with a 60px size-label bracket + a VERTICAL `variant-rows` stack. Per-variant rows (6 for Button) — each is HORIZONTAL with a 160px variant-label + 4 state cells. Per-cell HORIZONTAL frame with `primaryAxisSizingMode='FIXED'` (width 355), `counterAxisSizingMode='AUTO'`, `minHeight=72`, `paddingLeft/Right/Top/Bottom=16`, `primaryAxisAlignItems='CENTER'`, `counterAxisAlignItems='CENTER'`. Each cell holds one InstanceNode via `figma.createInstance(variantByKey[${variant}=${v}, size=${s}}])` + `instance.setProperties({ variant, size })` + `applyButtonStateOverride(instance, stateKey)` (per Step 8). Drop the bottom stroke on the last variant row of the last size group (per ticket Step 7 in `04-doc-pipeline-contract.md` §12). Total: 6 variants × 4 sizes × 4 states = **96 instances**. **Done when** `matrix.test.ts` snapshot has 96 instances, spot-checks `[default,default,default].opacity===1`, `[default,default,hover].opacity===0.92`, `[destructive,lg,pressed].opacity===0.85`, `[ghost,sm,disabled].opacity===0.5` per SPK-S5-DOC-1.F.
- [x] **Step 18** — **Section 5 (Do/Don't usage).** Create `src/core/canvas/doc/usage.ts` exporting `buildUsageNotes(docRoot: FrameNode, spec: ComponentSpecV1): FrameNode`. Lift `buildUsageNotes` body from `cc-doc-usage-only.js` lines 1-38 verbatim (per F2/D5). Emits `doc/component/${docKey}/usage` (HORIZONTAL, `primaryAxisSizingMode='AUTO'`, `counterAxisSizingMode='AUTO'`, width 1640 with `layoutSizingHorizontal='FIXED'` + `layoutSizingVertical='HUG'` post-resize per §6 critical-sizing rule, `itemSpacing=30`). Two cards: `usage/do` and `usage/dont` (each 805 wide, VERTICAL, padding 28, `itemSpacing=16`, fill bound to `color/background/variant` with hex fallback `#f4f4f5`, `cornerRadius=16`). Each card: `_Doc/TokenName` 18px title with leading glyph (`"✓ Do"` / `"✕ Don't"` per §6), then `bullets` VERTICAL stack of `_Doc/Caption` 13px text rows each prefixed `"· "`. Min 3 bullets/card from `spec.usage.do[]` / `spec.usage.dont[]`; if absent emit 3 TODO placeholders per card (do not skip per §6 last paragraph). **Done when** `usage.test.ts` snapshot has 2 cards each with title + ≥3 bullets and integration test confirms the HORIZONTAL section width is 1640 not 1 (BUG-S5-001 regression guard).
- [x] **Step 19** — **Delete instance-gallery loop.** In `src/core/components/scaffold/usageFrame.ts`, delete the `buildUsageFrame` body's instance-gallery section (the loop calling `createUsageInstanceCell`, lines ~340-400). Keep `ensureComponentSetGroup`, `ensureUsageSection`, `removeUsageSectionContents`, `findComponentSetGroup`, `findUsageSection`, and the geometry helpers `createDocSectionFrame`, `reassertDocSectionStretch`, `createHugAutoFrame`, `reassertHugBoth`. Keep `USAGE_AUDIT_RULE_IDS` and `buildUsageFrameAuditRows` exports (R10 confirmed 0 external callers but the assertions still want to run against the new Do/Don't cards). Rewrite `buildUsageFrame` so its body delegates to `buildUsageNotes` from Step 18 — preserving the old export name so callers don't break, but the implementation is the new Do/Don't path. **Done when** `usageFrame.ts` is < 280 lines and `npm test` is green.

### Phase 3 — Orchestrator wire-up + WO-027 coordination (sequential, single agent)

- [x] **Step 20** — Create `src/core/canvas/doc/index.ts` exporting `buildDocPipeline(componentSet, spec, ctx): Promise<DocPipelineResult>` where `DocPipelineResult = { ok: boolean; auditRows: AuditRuleResult[]; sections: { header, properties, setGroup, matrix, usage } }`. Calls in order: (1) `buildSectionHeader(docRoot, spec)`, (2) `buildPropertiesTable(docRoot, spec)`, (3) `extendComponentSetGroup(setGroup, componentSet, spec)` (after `ensureComponentSetGroup` is invoked upstream), (4) `buildMatrix(docRoot, spec, componentSet, variantByKey)`, (5) `buildUsageNotes(docRoot, spec)`. Asserts `docRoot.children.length === 5` post-build (per §12 step 8 / R9 in lift-map). Adds a new audit row `doc-pipeline/section-count` (pass iff children.length === 5). **Done when** an integration test on a freshly bootstrapped sandbox shows `docRoot.children.map(c => c.name) === ['doc/component/button/header', 'doc/table-group/button/properties', 'doc/component/button/component-set-group', 'doc/component/button/matrix-group', 'doc/component/button/usage']`.
- [x] **Step 21** — In `src/core/components/scaffold/runScaffold.ts`, replace the `buildUsageFrame` call (around line 248) with `await buildDocPipeline(componentSet, spec, ctx)`. Update the `'build-usage-frame'` step label to `'build-doc-pipeline'` (or add a new `ScaffoldStepId='build-doc-pipeline'` and deprecate the old one with an alias for one release). Audit rows from the doc pipeline flow into `audits[]`. **Done when** the existing scaffold integration test (`tests/integration/core/components/scaffold/usageFrame.integration.test.ts`) is updated to assert 5-section output and stays green.
- [x] **Step 22** — In `src/core/components/scaffold/index.ts`, update `forwardScaffold` (around line 275) to call `buildDocPipeline` instead of `buildUsageFrame`. Keep both exports so WO-022..026 unit tests continue importing the legacy entry points; internally `buildUsageFrame` now delegates to `buildDocPipeline` for one release. **Done when** `npm test -- --run tests/unit/core/components/scaffold tests/integration/core/components/scaffold` is fully green.
- [x] **Step 23** — Read WO-027 `plan.md` to understand its preview render-path expectations (OQ-3). If the preview consumes 2 hardcoded sections (set-group + usage), extend the preview to iterate `docRoot.children` and render whatever sections are present (5 now, fewer if early sections fail). Update `src/ui/tabs/Components.tsx` or whichever component owns the preview. **Done when** the Components tab successfully renders all 5 section previews for a Button scaffold without overflowing or showing blank sections.
- [x] **Step 24** — Update the `Open bugs` section of each ticket.md in WO-022..027 to mark BUG-S5-001/002/003/004 as **Resolved in code (WO-057)**, then remove the **Blocks VQA** tag from each. **Done when** WO-022..026 ticket.md files compile cleanly and `vqa-report.md` for WO-027 (already written) can be re-run with the correct bug-state.
- [x] **Step 25** — In `.github/Sprint 5/research/designops-canvas-parity-bug-register.md`, move BUG-S5-001/002/003/004 to a **"Resolved"** section near the top of the file. Reference WO-057 #60 as the closing WO. **Done when** the register still lists the original P0 → Resolved trail (don't delete) and BUG-S5-005..008 remain Open with current owners.

### Phase 4 — VQA on Plugin Sandbox (figma agent)

- [ ] **Step 26** — Run `npm run build`, reload plugin in Figma desktop, bootstrap Plugin Sandbox (`cVdPraIafWFBRZnzMPhtrW`) with `bootstrap-complete` fixture. Verify the pre-flight gate passes (no audit row fires). **Done when** the Components tab shows 11/11 prerequisites OK.
- [ ] **Step 27** — Paste the updated canonical Button spec and scaffold. Assert via Figma MCP `get_metadata` on the resulting `doc/component/button` node: 5 sections present in order; matrix has 96 instance cells; cells `[default,default,default].opacity ≈ 1`, `[…,hover].opacity ≈ 0.92`, `[…,pressed].opacity ≈ 0.85`, `[…,disabled].opacity ≈ 0.5` (SPK-S5-DOC-1.F); zero `width <= 2` violations (BUG-S5-001/002 regression guard). **Done when** the MCP metadata dump confirms all five.
- [ ] **Step 28** — Run `/vqa WO-057`. The agent pulls `uCpQaRsW4oiXW3DsC6cLZm:433:335` via MCP `get_design_context` + `get_screenshot`, fills the 28-row Figma VQA Checklist in ticket.md, runs functional QA, and writes `.github/Sprint 5/WO-057-…/research/vqa-report.md`. **Done when** vqa-report.md verdict is **Ship** (zero FAIL rows, designer sign-off block populated).
- [ ] **Step 29** — On Ship verdict, `/vqa` Step 7 transitions WO-057 #60 to **Completed** (option `167fdd81`). Then re-run `/vqa WO-027` (which was blocked on WO-057) — same Ship gate. **Done when** WO-027 also Ships and both cards are Completed on Project #9.

## Build Agents

> **Domain convention** (`memory.md` plan-quality-bar): each step assigned to exactly one agent; agents within a phase run in parallel; phases sequential.

### Phase 0 — Migration (sequential, 1 agent)

- `code-build` — **Steps 1–6**: fixture replacement (canonical Button) + WO-022..026 unit-test migration + bootstrap-complete grep.

### Phase 1 — Foundation primitives (parallel, 3 agents)

- `code-build` (foundation-a) — **Steps 7–8**: `doc/constants.ts` + `doc/applyStateOverride.ts`. Smallest unit; standalone.
- `code-build` (foundation-b) — **Steps 9–10, 13**: `audit/rules/doc-required-tokens.ts` + `runAudit.ts` preflight entry point + `rules/index.ts` export. Standalone audit slice.
- `code-build` (foundation-c) — **Steps 11–12**: `ScaffoldStepId='doc-preflight'` + `runScaffold.ts` early-exit branch. Depends on Step 10's `runDocPipelinePreflightAudit` signature but can interface-stub it until foundation-b lands; tested with mocked audit return.

### Phase 2 — Section emitters (sequential, 1 agent per step)

> **Reading-order rule (D13):** each agent loads ONE `cc-doc-*.js` source file matching its section. Never load `bundles/properties.mcp.js` + `bundles/matrix.mcp.js` + `bundles/usage.mcp.js` together (~130 KB combined).

- `code-build` (section-1) — **Step 14**: `doc/header.ts` (lift `cc-doc-page-header.js`).
- `code-build` (section-2) — **Step 15**: `doc/propertiesTable.ts` (lift `cc-doc-fill-props.js` + `bundles/properties.mcp.js` chrome lines 190-250 only).
- `code-build` (section-3) — **Step 16**: `doc/setGroup.ts` (extends `usageFrame.ts` per D5/F8; no new bundle read needed).
- `code-build` (section-4) — **Step 17**: `doc/matrix.ts` (lift `cc-doc-matrix-only.js` only; do NOT load `bundles/matrix.mcp.js`).
- `code-build` (section-5) — **Steps 18–19**: `doc/usage.ts` (lift `cc-doc-usage-only.js`) + delete instance-gallery loop in `usageFrame.ts`.

### Phase 3 — Orchestrator + WO-027 coordination (sequential, 1 agent)

- `code-build` (orchestrator) — **Steps 20–25**: `doc/index.ts` orchestrator + `runScaffold.ts` swap + `forwardScaffold` swap + WO-027 preview render-path extension + bug-register + WO-022..027 ticket.md `Open bugs` updates.

### Phase 4 — VQA (figma + vqa skills)

- `figma-build` (vqa-prep) — **Steps 26–27**: build + reload + sandbox bootstrap + MCP metadata verify of 5-section output.
- `vqa` agent — **Steps 28–29**: `/vqa WO-057` and `/vqa WO-027` Ship gating + Project status transitions.

## Dependencies & Tools

### Internal dependencies

- **WO-022..026 build artifacts** on `main` (already shipped). Phase 0 migration touches their test fixtures + unit tests; their plan.md files do not need re-reading by build agents.
- **WO-027 in In Build** with active changes to `AuditPanel.tsx` + Components tab preview render path. Phase 3 Step 23 reads WO-027 `plan.md` and extends its preview.
- **WO-008 bootstrap-complete fixture** (`bootstrap-complete.v1.json`) — required tokens (4 color + 4 text styles + 3 font-family vars). Verified per D11/F5; re-confirmed in Step 6.
- **BUG-S5-001/002/003** P0 geometry fix (already on `main`, 2026-05-28). Provides `createDocSectionFrame`, `reassertDocSectionStretch`, `assertNoCollapsedAxis` used by all new emitters.

### External / platform

- **Figma Plugin API** — `figma.combineAsVariants`, `figma.createInstance`, `instance.setProperties`, `instance.opacity`, `figma.variables.getLocalVariableCollectionsAsync`, `figma.getLocalTextStylesAsync`, `node.dashPattern`, `node.fills[].boundVariables`. All stable.
- **Figma MCP** — `get_design_context`, `get_screenshot`, `get_metadata`. Phase 4 only.
- **GitHub** — `gh project item-edit` for status transitions (Phase 4 / `/vqa`).
- **GitHub Project #9** — Field ID `PVTSSF_lAHOD9B30s4BY4aYzhT7CAM`; status options per `workflow.md`. Used by `/vqa` Step 7.

### MCP / external systems

- **Plugin Sandbox file** `cVdPraIafWFBRZnzMPhtrW` (Pro/Org tier per `memory.md`) — the only sanctioned VQA target for forward scaffold. Do NOT verify in Untitled files (R4 / memory.md do-not-repeat: `figma.fileKey === ''` issue).
- **Foundations target** `uCpQaRsW4oiXW3DsC6cLZm:433:335` — read-only VQA reference.

### Lift sources (read order, sequential not parallel)

Per `memory.md` "do not repeat" canvas-bundle rule + D13:

1. **Always loadable in one context (small)**: `cc-doc-constants.js` (3 lines), `cc-doc-page-header.js` (50), `cc-doc-fill-props.js` (66), `cc-doc-matrix-only.js` (148), `cc-doc-usage-only.js` (38), `cc-doc-insert-replace.js` (13), `cc-doc-chunk-a.js` (29). Total 347 lines across 7 files.
2. **One at a time (medium)**: `bundles/properties.mcp.js` (363 lines) — Section 2 chrome only; lines 190-250.
3. **Never together**: `bundles/properties.mcp.js` + `bundles/matrix.mcp.js` (737) + `bundles/usage.mcp.js` (604) = ~1,704 lines combined.

## Open Questions

- **OQ-1** (BLOCKS PLAN — RESOLVED by user 2026-05-28 lock) — Phase 0 migrates all WO-022..026 test fixtures to shadcn shape **one-shot**, not parallel-keep. Confirmed via locked decision "Match DesignOps verbatim".
- **OQ-2** (BLOCKS BUILD — **RESOLVED 2026-05-28 Phase 0 Step 6**) — `bootstrap-complete.v1.json` already contains all 4 required color tokens (`color/border/subtle`, `color/background/variant`, `color/background/content`, `color/background/content-muted`). Grep confirmed in `src/core/variables/__fixtures__/bootstrap-complete.v1.json` lines 997, 1021, 1045, 1093. No fixture-fix WO needed.
- **OQ-3** (BLOCKS BUILD COORDINATION — still open, owner orchestrator agent in Phase 3 Step 23) — Does WO-027's Components tab preview render path consume sections as 2 hardcoded frames or iterate `docRoot.children`? Resolution: Phase 3 Step 23 reads WO-027 plan.md + adjusts.
- **OQ-4** (RESOLVED by D10 / audit-spec D1) — No `auditReport.v1.ts` v2 bump needed.
- **OQ-5** (RESOLVED by D2) — Keep FigHub `_Doc/*` underscore prefix; do not rename to legacy `Doc/*`.
- **OQ-6** (RESOLVED by D3 / F7) — Bootstrap does NOT need new Label/* text styles. The 27 slot styles are already published; Label/* are typography variables, not text styles.

## Notes

### Research-locked decisions (do not re-decide at build time)

These mirror the lock-state in `research/doc-pipeline-lift-map.md` D1-D13 and `research/audit-gate-spec.md` D1-D15. Build agents must honor them verbatim:

1. **Opacities = `0.92 / 0.85 / 0.5`** (hover/pressed/disabled) — §13.1.a verbatim. NOT 0.9/0.8/0.5 as some draft text suggested.
2. **Section 3 title = `"Component"`**, caption = `"Live ComponentSet — edit here, matrix updates."` — §3.2 verbatim.
3. **Text-style names keep underscore prefix**: `_Doc/Section`, `_Doc/TokenName`, `_Doc/Code`, `_Doc/Caption`. FigHub convention from WO-012.
4. **Section 4 outer name = `doc/component/${docKey}/matrix-group`**, inner = `doc/component/${docKey}/matrix`. Per `cc-doc-matrix-only.js` lines 13-21.
5. **Section 2 wrapper name = `doc/table-group/${docKey}/properties`**, inner table = `doc/table/${docKey}/properties`. Per §4.
6. **Section 1 omits the horizontal divider** §1 prose mentions. `cc-doc-page-header.js` does not emit one; defer to designer VQA request if needed.
7. **Bootstrap extension is OUT OF SCOPE.** Requirement 7 satisfied by audit gate verification (Requirement 8). No new bootstrap code.
8. **`auditReport.v1.ts` does NOT bump to v2.** New ruleId is additive on existing `AuditRuleResult` shape.
9. **`bootstrap-complete.v1.json` already contains the 4 required color tokens.** OQ-2 RESOLVED per D11; re-grep in Step 6.
10. **Bundle reading order is sequential, never parallel** (D13).
11. **Button `disabled` axis is dropped from `variantMatrix`.** 24 variants, NOT 48. State becomes per-cell opacity overlay only.
12. **Section 4 `applyStateOverride` is opacity-only** for Button (and any Button-like component whose shadcn source uses `:hover`/`:active`/`:disabled` CSS). NOT per-state token swap.

### Plan-quality-bar references

- **AC traceability**: Steps 1-25 map 1:1 to ticket.md Acceptance Criteria via the table below. AC numbers refer to the ordered `## Acceptance criteria` list in ticket.md lines 109-123.
- **Risk register**: 10 risks R1-R10 documented in `research/doc-pipeline-lift-map.md` lines 230-243; mitigations are step-level (e.g. R1 → Step 1+5; R2 → Step 16; R3 → Step 6; R4 → Step 12; R8 → Step 23).
- **Spikes**: SPK-S5-DOC-1.A through .F + SPK-AUDIT-1 through .5 are encoded as Phase 1/2/4 unit/integration tests (Steps 9, 12, 17, 26, 27).

### Acceptance criteria traceability

| AC | Step(s) | Verifier |
| -- | ------- | -------- |
| AC1 — 5 sections present in order | Steps 14-18, 20 | Integration test in Step 21 + MCP metadata in Step 27 |
| AC2 — Section 1 header w/ title + caption | Step 14 | `header.test.ts` |
| AC3 — Section 2 properties table w/ §6.6 cols | Step 15 | `propertiesTable.test.ts` + designer VQA |
| AC4 — Section 3 set group w/ title + caption + dashed + WRAP | Step 16 | `setGroup.test.ts` |
| AC5 — Section 4 96 instances w/ opacities 0.92/0.85/0.5 | Step 17 | `matrix.test.ts` SPK-S5-DOC-1.F |
| AC6 — Section 5 is Do/Don't (not gallery) + delete old loop | Steps 18-19 | `usage.test.ts` + lines 348-443 deleted |
| AC7 — Bootstrap prereqs verified (no new bootstrap code) | Step 6 + Step 9 audit gate | grep + SPK-AUDIT-3 |
| AC8 — Pre-flight gate hard-fails on misses, diagnostic verbatim | Steps 9-12 | SPK-AUDIT-1/2/3/4 |
| AC9 — No `doc/component/*` frame ships at width=1 | Steps 14-18 reuse BUG-S5-001 geometry helpers | SPK-S5-DOC-1.E |
| AC10 — Routes to `↳ Buttons` → `_PageContent` → `doc/component/button` | Step 20 orchestrator + existing `ensureComponentScaffoldTarget` | Integration test |
| AC11 — All 4 CI legs green (typecheck, lint, format, dual build) | All steps + Step 21 final verification | `npm run build && npm test` |
| AC12 — Designer comparison vs target: 0 FAIL on /vqa | Step 28 | `vqa-report.md` Ship verdict |
| AC13 — BUG-S5-004 closed, WO-027 unblocked, SPK-S5-DOC-1 promoted | Steps 24-25 + Step 29 | Bug register update + WO-027 status transition |

### Do-not-repeat references (memory.md)

- **`figma.fileKey === ''` on Untitled files** → pre-flight gate inspects collections + styles, not `fileKey` (Step 12). Validate in Plugin Sandbox, not Untitled.
- **No `console.debug` in `code.js`** → use `pluginLog()` for any new logging in emitters.
- **`resize(1,1)` regression** → all new emitters route through `createDocSectionFrame` / `resizeThenApplySizing` (D5/F5) — never raw `resize(1,1)` + reassertHug.
- **Bundle loading discipline** → D13 / `Docs/lift-sources.md` §3.
- **Variable names use slash paths only, no `.`** → `color/border/subtle` not `color.border.subtle`.
- **Build target `es2017`** for `src/main.ts` and any code that ends up in `code.js`.

### Build agent reading-order constraint (verbatim from research)

Per `Docs/lift-sources.md` §3 + `memory.md` do-not-repeat:

- OK in one context (small): all 9 `cc-doc-*.js` files (644 lines total), `04-doc-pipeline-contract.md` (425 lines).
- OK in one context (one at a time): `bundles/properties.mcp.js` (363 lines).
- NEVER together: `bundles/properties.mcp.js` + `bundles/matrix.mcp.js` + `bundles/usage.mcp.js` (1,704 lines combined, ~130 KB).

The `cc-doc-*.js` modular files contain most of what's needed; bundles are wire-format and overlap heavily.

## Verification

### Local (during build)

- `npm test -- --run` — all 546+ tests pass; new tests added per Phase 1/2/3.
- `npm run build` — dual build (UI + main) green; bundle sizes within ±20 KB of current.
- `npm run lint && npm run typecheck && npm run format -- --check` — all green.

### In-Figma (Phase 4)

- Reload plugin in Figma desktop, open [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox).
- Bootstrap with `bootstrap-complete` fixture → preflight gate shows 11/11 prerequisites OK.
- Paste canonical Button spec → scaffold → confirm 5 sections on `↳ Buttons` → `_PageContent` → `doc/component/button`.
- MCP `get_metadata` dump for the scaffolded node — confirm `docRoot.children.length === 5` + 96 matrix instances + correct opacity spot-checks (SPK-S5-DOC-1.F).
- MCP `get_screenshot` side-by-side vs `uCpQaRsW4oiXW3DsC6cLZm:433:335` — paste both into `vqa-report.md` Phase 4 evidence.

### Cross-ticket (post-Phase 4)

- Re-run `/vqa WO-027` (was blocked) → Ship verdict expected.
- WO-022..026 ticket.md `Open bugs` sections re-checked → BUG-S5-001/002/003/004 all marked Resolved with WO-057 reference.
- Bug register (`designops-canvas-parity-bug-register.md`) shows BUG-S5-001..004 in Resolved section; BUG-S5-005..008 still Open.
- `memory.md` changelog appended with `2026-XX-XX — WO-057 Completed. DesignOps doc-pipeline parity shipped on `main`. ...` line.
