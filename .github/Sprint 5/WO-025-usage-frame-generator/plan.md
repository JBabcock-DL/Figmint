# Plan — WO-025: Usage frame generator

## Approach

WO-025 implements **FR-SCAF-5**: after the forward scaffold pipeline produces a bound, propertied `ComponentSetNode`, add a **compact usage-examples gallery** beside the set — **curated `InstanceNode` cells** (max **6**) with labeled variant tuples, **not** the legacy DesignOps Do/Don't documentation row.

**Core modules:** `curateVariantCombos()` (deterministic greedy axis-value coverage, alphabetical axes matching WO-022 `expandVariantMatrix`) and `buildUsageFrame()` (reparent set into `{spec.name}/forward-scaffold` HORIZONTAL wrapper, build `{spec.name}/usage-examples` VERTICAL column, instantiate + `setProperties` per combo). Return **`UsageFrameResult`** with `frame`, `instances`, `combos`, and inline **`comp/usage-*`** audit rows for WO-027 orchestration.

**Pipeline order (locked):** `scaffold()` (WO-022) → `applyBindings()` (WO-023) → `applyProperties()` (WO-024) → **`buildUsageFrame()` (WO-025)** → registry (WO-026). WO-025 runs **only after** `applyProperties()` completes; v1 sets **VARIANT axis keys only** on instances (no WO-024 boolean demo props unless axis appears in combo map).

**Lift correction:** port **instance cell pattern** from `DesignOps-plugin/.../bundles/matrix.mcp.js` L676–691 (`createInstance` + optional `setProperties`) and `04-doc-pipeline-contract.md` §3 step 4. **Do not port:** `usage.mcp.js`, `_usage-runner.fragment.js`, `buildUsageNotes`, `__ccDocAppendUsage` (Do/Don't cards only).

**Out of scope (do not implement):** designer-customizable usage examples; legacy Do/Don't cards; variant × **state** matrix (hover/pressed); full `doc/component/{name}` Foundations page; `usageDo`/`usageDont` contract fields; `runAudit('component')` scope wiring (inline audit rows only in v1).

---

## AC traceability

| Ticket acceptance criterion | Plan step(s) |
| --------------------------- | ------------ |
| Button `variant × size × disabled` (12 combos) → **6 curated** instances with tuple labels | Steps 2, 3, 6, 7, 13, 15 |
| `curateVariantCombos` unit tests snapshot AC matrix + Button 3×3 fixture | Steps 2, 9, 10 |
| Frame passes inline audit (`comp/usage-instance-count`, `comp/usage-label-present`, `comp/usage-setproperties`, `comp/usage-one-px-cell`) | Steps 5, 8, 11, 13 |

| Ticket requirement | Plan step(s) |
| ------------------ | ------------ |
| `usageFrame.ts` exports `buildUsageFrame` → `UsageFrameResult` | Steps 4, 6, 7 |
| `curateVariantCombos` greedy coverage, default max 6, alphabetical axes | Steps 2, 3 |
| Instance pipeline: `createInstance` → `setProperties` → labeled cell | Steps 6, 7 |
| Layout: `forward-scaffold` HORIZONTAL + `usage-examples` column | Steps 6, 7 |
| WO-014 helpers from `helpers/autoLayout.ts` + `matrixSpecimen.ts` | Steps 6, 7 |
| Pipeline after `applyProperties()` | Step 12 |
| Idempotent rescaffold (rebuild usage subtree, preserve ComponentSet id) | Step 7 |
| Vitest + integration mock harness | Steps 9–11, 13 |
| SPK-025-1 sandbox VQA | Step 15 |

---

## Wrong vs correct (lift drift guard)

| Wrong | Correct |
| ----- | ------- |
| Port `usage.mcp.js` / `buildUsageNotes` Do/Don't cards | Instance gallery via `componentSet.createInstance()` + `setProperties` |
| Lift `_usage-runner.fragment.js` (17 lines, doc append only) | Lift `matrix.mcp.js` L676–691 instance cell pattern |
| Import `src/core/canvas/autoLayout.ts` (does not exist) | Import `src/core/canvas/helpers/autoLayout.ts` |
| Show full 12-instance cross-product for Button AC matrix | `curateVariantCombos` caps at 6 with coverage-first greedy pick |
| Frame name `doc/component/{name}/usage` | `{spec.name}/usage-examples` under `forward-scaffold` |
| `variantByKey[combo].createInstance()` as primary path | `componentSet.createInstance()` then `setProperties`; `variantByKey` fallback on throw only |
| Random or hand-coded Button-only tuples | Deterministic greedy + golden snapshot tests |

---

## Module tree (greenfield — extends WO-022 scaffold dir)

```
src/core/components/scaffold/
├── usageFrame.ts              # buildUsageFrame orchestrator — WO-025 entry
├── curateVariantCombos.ts     # curation + combo helpers (or merge into usageFrame if <120 lines total)
├── usageFrameAudit.ts         # comp/usage-* inline audit row builders
├── types.ts                   # extend with UsageFrameResult, UsageFrameContext (shared WO-022..027)
└── __fixtures__/
    ├── usage-curation-ac-matrix.v1.json       # ticket AC 3×2×2 golden input
    ├── usage-curation-ac-matrix.picks.v1.json # locked 12→6 output snapshot
    └── usage-curation-button-3x3.picks.v1.json # Button fixture 9→6 snapshot

tests/unit/core/components/scaffold/
├── curateVariantCombos.test.ts
├── usageFrameHelpers.test.ts    # comboToSetProperties, formatVariantTupleLabel
└── usageFrameAudit.test.ts

tests/integration/core/components/scaffold/
├── usageFrame.integration.test.ts
└── mockUsageFrameHarness.ts     # extends mockComponentSet from WO-024 if present

tests/fixtures/                    # symlink or re-export path ticket cites
└── component-spec-button.json     # copy or import from src/io/formats/__fixtures__/
```

**Re-use (do not duplicate):** `expandVariantMatrix`, `sortAxisKeys`, `formatVariantName` from `src/core/components/scaffold/variantMatrix.ts` (WO-022) for full combo enumeration and label grammar parity.

---

## Lift map (DesignOps → Figmint)

| Legacy source | Figmint target | Action |
| ------------- | -------------- | ------ |
| `matrix.mcp.js` L676–691 | `usageFrame.ts` `createUsageInstanceCell` | Port centered instance in cell frame |
| `04-doc-pipeline-contract.md` §3 step 4 | `comboToSetProperties` | VARIANT `setProperties` map |
| `03-auto-layout-invariants.md` §0.1, §10.2 | `createHugFrame`, `reassertHug`, `createHorizontalUsageRow` | WO-014 helpers — geometry only |
| `06-audit-checklist.md` FR-SCAF-7 one-px guard | `assertNoOnePxMaster` per cell | Inline `comp/usage-one-px-cell` |

**Drift guard:** never open `usage.mcp.js` or multiple `*.mcp.js` bundles in one agent session (`Docs/lift-sources.md` §3).

---

## Constants (locked)

| Constant | Value | Source |
| -------- | ----- | ------ |
| `MAX_USAGE_INSTANCES` | `6` | Ticket AC "4–6"; research D2 |
| `FORWARD_SCAFFOLD_SPACING` | `48` | Ticket req §4 itemSpacing |
| `USAGE_ROW_WIDTH` | `440` | Research §5 — `createHorizontalUsageRow(440)` |
| `USAGE_CELL_PAD` | `16` | Research node tree |
| `USAGE_CELL_GAP` | `8` | Vertical cell itemSpacing |
| `USAGE_TITLE` | `"Usage examples"` | Plain caption above row |
| `PLUGIN_DATA_USAGE_FRAME` | `figmint:usageFrame:v1:{scaffoldId}` | Idempotency marker on usage-examples frame |
| Label font | `{ family: 'Inter', style: 'Regular' }`, `fontSize: 13` | Doc/Caption equivalent |

---

## Naming convention (node tree)

```text
{spec.name}/forward-scaffold                    HORIZONTAL · counterAxisSizingMode AUTO · itemSpacing 48
├── {spec.name}                                 ComponentSetNode (WO-022 — reparented, id preserved)
└── {spec.name}/usage-examples                  VERTICAL · width ~440 · hug height
    ├── usage-examples/title                    TEXT — "Usage examples"
    └── usage-examples/row                      HORIZONTAL · createHorizontalUsageRow(440)
        └── usage-examples/cell/{comboHash}     VERTICAL · pad 16 · gap 8
            ├── instance                        InstanceNode · layoutAlign CENTER
            └── label                           TEXT — formatVariantTupleLabel(combo)
```

**Cell hash:** FNV-1a hex of canonical combo JSON (sorted axes) — stable idempotency key for rescaffold cell replacement.

**Label grammar:** comma-separated `axis=value` pairs in **sorted axis order**; booleans lowercase `true`/`false` (not Figma `"true"`/`"false"` strings in label text). Example: `disabled=false, size=sm, variant=default`.

**Wrapper discovery on rescaffold:** find child of target page named `{spec.name}/forward-scaffold` via `findForwardScaffoldWrapper(page, spec.name)`; if missing, create wrapper and reparent ComponentSet from page.

---

## Typed API blocks (copy-paste-ready)

```ts
// src/core/components/scaffold/types.ts — extend WO-022 exports

export interface UsageFrameContext {
  targetPage: PageNode;
  fontsLoaded?: boolean;
  maxInstances?: number;           // default MAX_USAGE_INSTANCES (6)
  variantByKey?: Record<string, ComponentNode>; // ScaffoldResult fallback
  applyPropertiesResult?: ApplyPropertiesResult; // optional v1 — unused except logging
}

export interface UsageFrameResult {
  ok: boolean;
  frame: FrameNode;                // usage-examples column frame
  wrapper: FrameNode;              // forward-scaffold wrapper
  instances: InstanceNode[];
  combos: VariantCombo[];          // curated picks applied
  instanceCount: number;
  auditRows: AuditRuleResult[];    // comp/usage-* inline rules
  setPropertiesErrors: string[];   // captured throws for comp/usage-setproperties
}

export type VariantCombo = Record<string, string | boolean>;
```

```ts
// src/core/components/scaffold/curateVariantCombos.ts

export const MAX_USAGE_INSTANCES = 6;

export function curateVariantCombos(
  variantMatrix: Record<string, (string | boolean)[]>,
  maxInstances?: number,
): VariantCombo[];

export function comboToSetProperties(
  combo: VariantCombo,
  axes: string[],
): Record<string, string | boolean>;

export function formatVariantTupleLabel(
  combo: VariantCombo,
  axes: string[],
): string;

export function comboLexCompare(a: VariantCombo, b: VariantCombo, axes: string[]): number;
```

```ts
// src/core/components/scaffold/usageFrame.ts

export async function buildUsageFrame(
  componentSet: ComponentSetNode,
  spec: ComponentSpecV1,
  ctx: UsageFrameContext,
): Promise<UsageFrameResult>;
```

```ts
// src/core/components/scaffold/usageFrameAudit.ts

export function buildUsageFrameAuditRows(input: {
  instances: InstanceNode[];
  combos: VariantCombo[];
  crossProductCount: number;
  maxInstances: number;
  cells: FrameNode[];
  setPropertiesErrors: string[];
}): AuditRuleResult[];
```

**Inline audit rules:**

| ruleId | Severity | Pass condition |
| ------ | -------- | -------------- |
| `comp/usage-instance-count` | error | `instances.length === min(crossProductCount, maxInstances)` |
| `comp/usage-label-present` | error | Each cell has TEXT child named `label` with non-empty `characters` |
| `comp/usage-setproperties` | error | `setPropertiesErrors.length === 0` |
| `comp/usage-one-px-cell` | error | `assertNoOnePxMaster(cell) === null` for every cell frame |

---

## Curation algorithm spec (`curateVariantCombos`)

**Input:** `variantMatrix`, optional `maxInstances` (default `6`).

1. `axes ← sortAxisKeys(variantMatrix)` — **must** call WO-022 `sortAxisKeys` (alphabetical).
2. `combos ← expandVariantMatrix(variantMatrix)` — full cartesian product, stable WO-022 order.
3. If `combos.length ≤ maxInstances` → return all combos (no curation).
4. `baseline ← { axes[i]: variantMatrix[axes[i]][0] for each axis }`; `picked ← [baseline]`.
5. `covered ← set of (axis, value) pairs from baseline`.
6. `remaining ← combos \ { baseline }` sorted lexicographically via `comboLexCompare`.
7. While `picked.length < maxInstances` and `remaining` not empty:
   - Choose `best ∈ remaining` maximizing count of `(axis, c[axis])` pairs **not** in `covered`.
   - Tie-break: lexicographically smallest combo (`comboLexCompare`).
   - Append `best` to `picked`; merge pairs into `covered`; remove `best` from `remaining`.
8. Return `picked`.

**Golden fixtures (lock in Step 1):**

- **AC matrix** `{ variant: ['a','b','c'], size: ['sm','md'], disabled: [false, true] }` → exactly **6** picks; store in `usage-curation-ac-matrix.picks.v1.json`.
- **Button 3×3** from `component-spec-button.json` (`size` × `variant`, 9 combos) → **6** picks in `usage-curation-button-3x3.picks.v1.json`.

---

## Steps

- [x] **Step 1** — Create golden curation fixtures under `src/core/components/scaffold/__fixtures/`:
  - `usage-curation-ac-matrix.v1.json` — input matrix from ticket AC (3×2×2 = 12).
  - Run reference implementation (can be a one-off script `scripts/lock-usage-curation-fixtures.mjs` or inline Vitest snapshot generator) to write `usage-curation-ac-matrix.picks.v1.json` and `usage-curation-button-3x3.picks.v1.json`.
  - Copy or re-export `src/io/formats/__fixtures__/component-spec-button.json` to `tests/fixtures/component-spec-button.json` for ticket AC path citation.
  - **Done when:** three fixture files exist; picks files contain exactly 6 combo objects each with sorted axis keys.

- [x] **Step 2** — Implement `src/core/components/scaffold/curateVariantCombos.ts`:
  - Implement `curateVariantCombos`, `comboLexCompare`, `countNewCoverage`, `comboToSetProperties`, `formatVariantTupleLabel` per algorithm spec above.
  - Import `sortAxisKeys`, `expandVariantMatrix` from `./variantMatrix` (WO-022).
  - ES2017-safe: no `?.`, `??`, `replaceAll`.
  - **Done when:** `curateVariantCombos.test.ts` asserts picks match golden JSON byte-for-byte for AC matrix and Button 3×3; edge cases: 1×1 matrix → 1 combo; 4-value single axis → 4 combos; 5 combos total → all 5 returned.

- [x] **Step 3** — Unit test `tests/unit/core/components/scaffold/curateVariantCombos.test.ts`:
  - Snapshot AC matrix 12→6 against `usage-curation-ac-matrix.picks.v1.json`.
  - Snapshot Button matrix 9→6 against `usage-curation-button-3x3.picks.v1.json`.
  - Assert deterministic: calling twice returns identical array references values.
  - Assert axis order: first combo uses first value of every axis (baseline).
  - **Done when:** all tests pass; ticket AC "snapshot deterministic picks" satisfied.

- [x] **Step 4** — Extend `src/core/components/scaffold/types.ts` with `UsageFrameContext`, `UsageFrameResult`, `VariantCombo` re-export if defined in curate module:
  - Add `PLUGIN_DATA_USAGE_FRAME` constant adjacent to WO-022 `PLUGIN_DATA_SCAFFOLD_ID`.
  - **Done when:** types compile; exported from `scaffold/index.ts` barrel.

- [x] **Step 5** — Implement `src/core/components/scaffold/usageFrameAudit.ts`:
  - `buildUsageFrameAuditRows` emits four `AuditRuleResult` rows per table above.
  - Use `assertNoOnePxMaster` from `src/core/canvas/helpers/autoLayout.ts`.
  - Aggregate `ok: auditRows.every(r => r.status === 'pass')` helper optional.
  - **Done when:** `usageFrameAudit.test.ts` covers pass/fail for each ruleId.

- [x] **Step 6** — Implement layout helpers in `usageFrame.ts` (private functions):
  - `findForwardScaffoldWrapper(page, specName): FrameNode | null`
  - `ensureForwardScaffoldWrapper(page, componentSet, specName): FrameNode` — create HORIZONTAL frame `{specName}/forward-scaffold`, itemSpacing 48, reparent ComponentSet as first child preserving node id.
  - `createUsageExamplesColumn(specName): FrameNode` — VERTICAL `{specName}/usage-examples`, width 440.
  - `createUsageTitleFrame(): TextNode` — load Inter Regular 13px via `figma.loadFontAsync` before setting characters.
  - Import `createHugFrame`, `reassertHug`, `assertNoOnePxMaster` from `helpers/autoLayout.ts`; `createHorizontalUsageRow` from `helpers/matrixSpecimen.ts`.
  - **Done when:** unit tests with mock `figma.createFrame` verify wrapper name + layoutMode + spacing constants.

- [x] **Step 7** — Implement instance cell builder + idempotency in `usageFrame.ts`:
  - `removeUsageExamplesSubtree(wrapper): void` — find child `{specName}/usage-examples`, `remove()` if exists.
  - `createUsageInstanceCell(combo, componentSet, axes, variantByKey?): { cell, instance, label, error? }`:
    1. `instance = componentSet.createInstance()`.
    2. `props = comboToSetProperties(combo, axes)`.
    3. try `instance.setProperties(props)`; on throw log via `pluginLog('[usageFrame] setProperties failed', { combo, message })`, push to `setPropertiesErrors`, attempt fallback `variantByKey[formatVariantName(combo)].createInstance()` if key exists.
    4. Build VERTICAL cell `{specName}/usage-examples/cell/{comboHash}` with centered instance + label TEXT.
    5. Call `reassertHug` on cell and row after each append.
  - `buildUsageFrame` orchestrates: curate combos → ensure wrapper → remove old usage-examples → build column (title + row) → loop cells → set `pluginData` on usage-examples frame → return `UsageFrameResult`.
  - **Done when:** integration test verifies rescaffold removes old cells; ComponentSet id unchanged across two calls.

- [x] **Step 8** — Implement `buildUsageFrame` export + `pluginLog` telemetry:
  - Log per combo: `pluginLog('[usageFrame] combo applied', { index, label, propKeys: Object.keys(props) })`.
  - Aggregate log on any setProperties failure: `pluginLog('[usageFrame] setProperties miss count', { count })`.
  - **Done when:** grep confirms no `console.debug` in `usageFrame.ts`; logs use `pluginLog` only.

- [x] **Step 9** — Unit test `tests/unit/core/components/scaffold/usageFrameHelpers.test.ts`:
  - `comboToSetProperties({ disabled: false, size: 'sm' }, ['disabled','size'])` → `{ disabled: 'false', size: 'sm' }`.
  - `formatVariantTupleLabel` → `disabled=false, size=sm, variant=default` grammar.
  - Boolean true → `'true'` in setProperties map, `true` lowercase in label.
  - **Done when:** ticket AC label grammar covered.

- [x] **Step 10** — Copy golden matrix inputs into curate tests referencing `tests/fixtures/component-spec-button.json`:
  - Parse `variantMatrix` only (ignore props/bindings) for 3×3 curation test path cited in ticket.
  - **Done when:** test file imports fixture path exactly as ticket specifies.

- [x] **Step 11** — Implement `tests/integration/core/components/scaffold/mockUsageFrameHarness.ts`:
  - Extend or duplicate WO-024 `mockComponentSet` pattern: stub `ComponentSetNode.createInstance`, `InstanceNode.setProperties`, frame tree mutations.
  - Pre-seed `componentPropertyDefinitions` VARIANT axes matching fixture matrix.
  - **Done when:** harness supports counting `createInstance` / `setProperties` invocations.

- [x] **Step 12** — Wire pipeline caller in `src/core/components/scaffold/index.ts` (depends on WO-022 + WO-023 + WO-024 merged):

```ts
// Locked forward scaffold sequence — WO-027 will mirror this in scaffold/run handler
const scaffoldResult = await scaffold(spec, targetPage, options);
const bindingsResult = applyBindings(spec, scaffoldResult.componentSet);
const propsResult = applyProperties(spec, scaffoldResult.componentSet);
const usageResult = await buildUsageFrame(scaffoldResult.componentSet, spec, {
  targetPage: targetPage,
  variantByKey: scaffoldResult.variantByKey,
  applyPropertiesResult: propsResult,
});
pluginLog('[scaffold] buildUsageFrame', {
  ok: usageResult.ok,
  instanceCount: usageResult.instanceCount,
  auditPass: usageResult.auditRows.every(function (r) { return r.status === 'pass'; }),
});
```

  - `buildUsageFrame` **must** appear immediately after `applyProperties`; never before.
  - Export `buildUsageFrame`, `curateVariantCombos`, types from barrel.
  - **Done when:** grep in `index.ts` shows order `applyProperties` then `buildUsageFrame`; no inversion.

- [x] **Step 13** — Integration test `tests/integration/core/components/scaffold/usageFrame.integration.test.ts`:
  - Mock Button-like 3×2×2 matrix → assert `createInstance` called **6** times (not 12).
  - Assert `setProperties` called **6** times with VARIANT keys matching curated combos.
  - Assert `auditRows` all `pass` when mocks succeed.
  - Assert `comp/usage-instance-count` fails when instance count deliberately wrong (negative test).
  - **Done when:** ticket AC integration bullet satisfied.

- [x] **Step 14** — Re-export audit rule IDs in `usageFrameAudit.ts` as `USAGE_AUDIT_RULE_IDS` constant array for WO-027 UI surfacing (optional consumer):
  - **Done when:** constant exported; documented in Notes.

- [x] **Step 15** — Manual VQA spike **SPK-025-1** (requires WO-022 + WO-024 on sandbox branch):
  - **Deferred:** automated Vitest coverage complete; live Plugin Sandbox run pending `/vqa` (file_key `cVdPraIafWFBRZnzMPhtrW`).
  - File: Plugin Sandbox `file_key=cVdPraIafWFBRZnzMPhtrW`.
  - Procedure: scaffold Button with `variant × size × disabled` (12 variants); run full pipeline through `buildUsageFrame`.
  - Verify: 6 labeled instances visible beside ComponentSet; labels match tuple grammar; no 1px-tall cells; wrapper `{name}/forward-scaffold` present.
  - Record node ids in ticket Figma VQA Checklist `node_id` field.
  - **Done when:** SPK-025-1 marked PASS in research or ticket VQA table; or explicit deferral note if WO-022 not merged at build time.

- [x] **Step 16** — CI gate:
  - Run `npm run typecheck && npm run lint && npm run test -- tests/unit/core/components/scaffold/curateVariantCombos.test.ts tests/unit/core/components/scaffold/usageFrameHelpers.test.ts tests/unit/core/components/scaffold/usageFrameAudit.test.ts tests/integration/core/components/scaffold/usageFrame.integration.test.ts`.
  - **Done when:** all commands exit 0.

- [x] **Step 17** — Barrel + docs comment in `scaffold/index.ts`:
  - JSDoc on `buildUsageFrame`: "FR-SCAF-5 instance gallery — not legacy Do/Don't usage cards."
  - **Done when:** comment present; no references to `buildUsageNotes` in repo scaffold code.

---

## Build Agents

### Phase 1 (parallel — no WO-022 canvas code required)

- `code-build` — Steps 1–3, 9–10: golden fixtures, `curateVariantCombos.ts`, curation unit tests, helper unit tests, Button fixture path

### Phase 2 (parallel — after Phase 1)

- `code-build` — Steps 4–8, 14: `types.ts` extensions, `usageFrameAudit.ts`, `usageFrame.ts` layout + instance pipeline + telemetry

### Phase 3 (parallel — after Phase 2)

- `code-build` — Steps 11, 13: mock harness + integration tests (`usageFrameAudit.test.ts` covered in Step 5 Done when)

### Phase 4 (sequential — requires WO-022 `scaffold()` + WO-023 + WO-024 merged)

- `code-build` — Steps 12, 17: pipeline wire in `index.ts`, barrel exports, JSDoc drift guard

### Phase 5 (after Phase 4 + sandbox availability)

- `code-build` — Steps 15–16: SPK-025-1 manual VQA + CI gate

---

## Dependencies & Tools

| Dependency | Role | Blocker? |
| ---------- | ---- | -------- |
| WO-022 `scaffold()`, `variantMatrix.ts`, `ScaffoldResult.variantByKey` | ComponentSet + variant naming + combo expansion | Phase 4 pipeline; SPK-025-1 |
| WO-023 `applyBindings()` | Visual binds before usage frame | Phase 4 ordering |
| WO-024 `applyProperties()` | Runs immediately before usage frame | Phase 4 ordering |
| WO-014 `helpers/autoLayout.ts`, `matrixSpecimen.ts` | Hug frames, horizontal row, one-px audit | Phase 2 |
| WO-003 `@detroitlabs/figmint-contracts` | `ComponentSpecV1.variantMatrix` | Phase 1 |
| WO-027 forward-flow UI | Consumes `buildUsageFrame` in `scaffold/run` | Downstream — stub export sufficient |
| WO-026 registry | Optional usage frame nodeId metadata | **Deferred** (OQ-1) |

**Tools:** Vitest (unit + integration), TypeScript strict, `pluginLog()` for main-thread logging (never `console.debug` in `code.js`).

**Figma Plugin API references:**

- [ComponentSetNode.createInstance](https://developers.figma.com/docs/plugins/api/componentsetnode/)
- [InstanceNode.setProperties](https://developers.figma.com/docs/plugins/api/instancenode/#setproperties)
- [figma.loadFontAsync](https://developers.figma.com/docs/plugins/api/figma/#loadfontasync)

**MCP:** Figma sandbox for Step 15 only (`plugin-figma-figma` + `/figma-use` skill). Default sandbox: `cVdPraIafWFBRZnzMPhtrW`.

**ES2017:** `build.target: 'es2017'` — no optional chaining in `usageFrame.ts`, `curateVariantCombos.ts`, or audit module.

---

## Open Questions

| # | Question | Status |
| - | -------- | ------ |
| OQ-1 | Export usage frame `nodeId` in registry (WO-026)? | **OPEN — defer v1**; `UsageFrameResult.frame.id` sufficient for WO-027 |
| OQ-2 | Reduce `MAX_USAGE_INSTANCES` to 4 for icon-heavy components? | **RESOLVED — lock 6** for v1 (`MAX_USAGE_INSTANCES = 6`); ticket AC "6 (or fewer)" satisfied by curation algorithm, not a separate product cap |
| OQ-3 | Include `usageDo` bullets under gallery? | **RESOLVED — out of scope** per ticket |
| OQ-4 | Merge `curateVariantCombos.ts` into `usageFrame.ts`? | **RESOLVED — separate file** unless combined LOC < 120 at build time |

---

## Notes

- **Build (2026-05-28):** WO-025 code-build complete — all 17 steps checked; SPK-025-1 deferred to `/vqa`.
- **Pipeline:** `forwardScaffold()` in `index.ts` — order `scaffold → applyBindings → applyProperties → buildUsageFrame`.
- **Golden curation:** locked via `scripts/lock-usage-curation-fixtures.mjs` + `__fixtures__/usage-curation-*.picks.v1.json`.
- **Tests:** 25/25 pass (`curateVariantCombos`, `usageFrameHelpers`, `usageFrameAudit`, `usageFrame.integration`).
- **USAGE_AUDIT_RULE_IDS:** exported for WO-027 progress surfacing.
- **Mock harness:** extended `figmaFrames` MockFrame with `setPluginData`, `insertChild`, vertical hug height simulation.

---

## Notes (plan quality)

- **Bibliography only:** `ticket.md`, `research/usage-frame-generator.md`, WO-022 `component-scaffold-engine.md`, WO-024 `component-property-definitions.md`, `Docs/PRD.md` §6.2 FR-SCAF-5 / FR-SCAF-7.
- **Determinism:** same `ComponentSpecV1.variantMatrix` → same curated combos → same labels on every rescaffold.
- **Idempotency:** preserve `ComponentSetNode.id`; only `usage-examples` subtree is removed/rebuilt. Optional `pluginData` on usage-examples frame stores scaffold id hash for debugging.
- **Fallback path:** if `setProperties` throws (partial property defs), log and try `variantByKey[formatVariantName(combo)]` — do not fail entire gallery unless zero instances created.
- **WO-027 handoff:** forward-flow orchestrator calls the same sequence as Step 12; progress events should include `usageFrame` step after `applyProperties`.
- **Plan quality bar:** `.github/templates/plan-quality-bar.md` — sub-agents execute from this file only.
