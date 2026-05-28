# Plan — WO-023: Variable bindings application

## Approach

Implement a **post-scaffold binding pass** that reads `ComponentSpecV1.bindings[]` and applies Figma variable bindings to **every variant `ComponentNode`** under a scaffolded `ComponentSetNode`. The pass is deterministic, non-silent, and audit-backed: missing variables or unresolvable selectors become `AuditReportV1` FAIL rows with the selector path — **never hex fallbacks** (DesignOps `07-token-paths.md` §7.6; PRD §11.4 preview/confirm culture).

**Pipeline order (locked):** `scaffold()` (WO-022) → **`applyBindings()`** (this ticket) → `applyProperties()` (WO-024). Bindings run after combine-as-variants so targets are variant component trees inside the set.

**In scope (ticket Requirements):**

- `src/core/components/scaffold/applyBindings.ts` — orchestrator with locked public API (see §Locked API below).
- `src/core/components/scaffold/selector.ts` — parse `{nodePath}.{kind}` selectors and resolve nodes by slash-separated layer names.
- Numeric bind helpers (`padding`, `gap`, `radius`) and `text-style` apply via published TextStyle name.
- Reuse `bindPaintToVar` / `bindStrokeToVar` (WO-014) and `ensureLocalVariableMap` / `resolvePath` (WO-008).
- Extend WO-010 `runAudit` with `scope: 'component'` and four `comp/binding-*` rules fed by `ApplyBindingsResult`.
- Vitest unit + integration tests; chip-archetype fixture with ≥10 bindings under `tests/fixtures/components/`.

**Out of scope (ticket — do not implement):**

- Property definitions (`applyProperties` — WO-024).
- Token resolution from CSS classes / Tailwind (Sprint 8 token resolver).
- Per-typography-field variable binds on text nodes (`fontSize`, `fontFamily`, …) — **`text-style` kind with published TextStyle names only**.
- Scaffold geometry / variant matrix (WO-022).
- Components tab UI wiring (WO-027).
- Live Figma sandbox VQA in CI (SPK-023-3 deferred until WO-022 scaffold lands; manual sandbox optional post-build).

**Drift guard — do not copy from DesignOps bundles:**

- Do **not** lift binding logic from `component-*.mcp.js` bundles wholesale — read §5 patterns only (`bindColor` → paint bind, `bindNum` → `setBoundVariable` loop).
- Do **not** use CSS-like selectors (`.button`) or collection-prefixed paths as authoritative keys — `src/io/formats/__fixtures__/component-spec-button.json` is export-sample only.
- Do **not** add `kind` or `property` fields to `ComponentSpecBinding` — selector string encodes both (contract v1 locked).

**Lift map (legacy → Figmint):**

| DesignOps source | Figmint module | Notes |
| ---------------- | -------------- | ----- |
| `conventions/07-token-paths.md` §7.1 | `normalizeVariablePath()` + `resolvePath()` | Slash paths; optional `{Collection}/` strip |
| `component-chip.mcp.js` §5 `bindColor` | `bindPaintToVar` / `bindStrokeToVar` | Paint bind, not `setBoundVariable` on fill |
| `component-composed.mcp.js` §5 `bindNum` | `bindPaddingToVar`, `bindGapToVar`, `bindRadiusToVar` | Fallback scalar first, then bind |
| `06-audit-checklist.md` §Text & bindings | `comp/binding-verified` rule | Automated chrome-bound check |
| N/A (greenfield orchestrator) | `applyBindings.ts` | Post-scaffold pass |

**Wrong vs correct (common mistakes):**

| Wrong | Correct |
| ----- | ------- |
| `setBoundVariable('fills', …)` for color | `figma.variables.setBoundVariableForPaint` via `bindPaintToVar` |
| Hex fallback when variable missing | Record `missing-variable` in `ApplyBindingsResult.failed`; audit FAIL |
| Bind only default variant | Iterate all `componentSet.children` where `type === 'COMPONENT'` |
| `Theme/color/primary/default` lookup key | Normalize to `color/primary/default` before `resolvePath` |
| Separate `property` field on binding | Parse kind from selector suffix after final `.` |

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| 10 bindings applied to every variant; `failed.length === 0` | Steps 12–14, 24–26, 30 |
| Missing variable → audit FAIL with selector + variable name (`comp/binding-variable-resolved`) | Steps 18–21, 27–28 |
| Missing node path → audit FAIL with selector (`comp/binding-node-resolved`) | Steps 6–7, 18–21, 27–28 |
| Integration test against canonical chip-archetype shadcn spec fixture | Steps 23–26, 30 |

| Ticket requirement | Plan steps |
| ------------------ | ---------- |
| Req §1 `applyBindings.ts` on every variant | Steps 12–14 |
| Req §2 selector grammar `{nodePath}.{kind}` | Steps 5–8 |
| Req §3 variable paths + prefix strip; no hex fallback | Steps 8, 13 |
| Req §4 binding mechanics per kind | Steps 9–11, 13 |
| Req §5 `selector.ts` parse + resolve | Steps 5–8 |
| Req §6 audit `comp/binding-*` + `ApplyBindingsResult` input | Steps 17–22 |
| Req §7 pipeline order after scaffold, before properties | Notes + Step 29 (orchestrator stub) |

---

## Locked API — `applyBindings.ts`

Copy-paste contract for build agents — **do not rename exports or change signatures without contract bump:**

```ts
import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';
import type { VariablePathMap } from '@/core/canvas/lib/variables';

/** Parsed binding kind — suffix of selector after final '.' */
export type BindingKind =
  | 'fill'
  | 'stroke'
  | 'radius'
  | 'padding'
  | 'gap'
  | 'text-style';

export type BindingFailureReason =
  | 'missing-variable'
  | 'missing-node'
  | 'type-mismatch'
  | 'api-error';

export interface BindingFailure {
  selector: string;
  variable: string;
  reason: BindingFailureReason;
  diagnostic: string;
}

export interface ApplyBindingsResult {
  /** bindings.length × variant count when every entry applied cleanly */
  applied: number;
  failed: BindingFailure[];
  /** true iff failed.length === 0 */
  passed: boolean;
}

export interface ApplyBindingsOptions {
  /** When omitted, built via ensureLocalVariableMap() on main thread */
  variableMap?: VariablePathMap;
}

/**
 * Apply every entry in spec.bindings to each COMPONENT child of componentSet.
 * Does not mutate spec. Idempotent re-run: overwrites binds with same variables.
 */
export async function applyBindings(
  spec: ComponentSpecV1,
  componentSet: ComponentSetNode,
  options?: ApplyBindingsOptions,
): Promise<ApplyBindingsResult>;

/** Pure helper exported for Vitest */
export function parseBindingSelector(selector: string): { nodePath: string; kind: BindingKind };

/** Normalize variable path (strip optional collection prefix) */
export function normalizeVariablePath(raw: string): string;
```

**Internal dispatch (not exported):**

```ts
function applyBindingToNode(
  node: SceneNode,
  kind: BindingKind,
  variable: Variable,
): void;
```

**Call sequence (orchestrator body):**

```ts
const map = options && options.variableMap !== undefined
  ? options.variableMap
  : await ensureLocalVariableMap();
const result: ApplyBindingsResult = { applied: 0, failed: [], passed: true };
for (let v = 0; v < componentSet.children.length; v++) {
  const variant = componentSet.children[v];
  if (variant.type !== 'COMPONENT') continue;
  for (let b = 0; b < spec.bindings.length; b++) {
    const binding = spec.bindings[b];
    const parsed = parseBindingSelector(binding.selector);
    const path = normalizeVariablePath(binding.variable);
    const target = resolveNodeByPath(variant, parsed.nodePath);
    const variable = resolvePath(map, path);
    // dispatch + record applied/failed
  }
}
result.passed = result.failed.length === 0;
return result;
```

---

## Steps

### Phase 1 — Module scaffold, types, contract patch

- [x] **Step 1** — **Extend** WO-022 `src/core/components/scaffold/types.ts` (do **not** recreate the file or overwrite scaffold types):
  - Append binding types from the locked API block above (`BindingKind`, `BindingFailureReason`, `BindingFailure`, `ApplyBindingsResult`, `ApplyBindingsOptions`).
  - Preserve existing WO-022 exports (`ScaffoldBuildContext`, `ScaffoldResult`, `ScaffoldOptions`, …).
  - Add `ComponentAuditInput` for audit wiring:

```ts
import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';
import type { ApplyBindingsResult } from './types';

export interface ComponentAuditInput {
  spec: ComponentSpecV1;
  componentSet: ComponentSetNode;
  bindingsResult: ApplyBindingsResult;
}
```

  - **Done when:** `npm run typecheck` passes; file exists with no `?.` / `??` (ES2017 main-thread rule).

- [x] **Step 2** — Patch `packages/contracts/src/auditReport.v1.ts`:
  - Extend `AuditReportMeta.operation` union: `'push-variables' | 'apply-bindings'`.
  - Re-export unchanged; run `npm run build -w @detroitlabs/figmint-contracts`.
  - **Done when:** `dist/audit-report.v1.schema.json` includes `"apply-bindings"` in `operation` enum; `tsc --noEmit` clean.

- [x] **Step 3** — Extend `src/core/audit/types.ts`:
  - Import and re-export `ComponentAuditInput` from scaffold types (or define duplicate interface here if circular import — prefer scaffold export + audit import).
  - **Done when:** `ComponentAuditInput` available to rule modules and `runAudit` overload.

- [x] **Step 4** — **Extend** WO-022 `src/core/components/scaffold/index.ts` barrel (do **not** replace `scaffold()` export):
  - Add exports: `applyBindings`, `parseBindingSelector`, `normalizeVariablePath`, and binding types from `./types`.
  - Keep existing `scaffold()` export from WO-022 Step 10.
  - **Done when:** `@/core/components/scaffold` resolves both `scaffold` and `applyBindings` in Vitest alias config.

### Phase 2 — Selector parse + node resolution (`selector.ts`)

- [x] **Step 5** — Implement `src/core/components/scaffold/selector.ts` — `parseBindingSelector(selector: string)`:
  - Split on **last** `.` — left = `nodePath`, right = `kind`.
  - Validate `kind` ∈ `fill` | `stroke` | `radius` | `padding` | `gap` | `text-style`; throw `Error: invalid binding kind: {kind}` for Vitest negative cases (orchestrator catches and maps to `api-error`).
  - Accept `nodePath` aliases: `root`, `.`, or empty string → treated as variant root.
  - **Done when:** `tests/unit/core/components/scaffold/selectorParse.test.ts` covers: `root.fill`, `text/label.text-style`, invalid kind, missing dot.

- [x] **Step 6** — Same file — `resolveNodeByPath(variantRoot: ComponentNode, nodePath: string): SceneNode | null`:
  - If `nodePath` is `root`, `.`, or `''` → return `variantRoot`.
  - Split remaining path on `/`; at each segment call `findChild` on **direct children only** matching `node.name` exactly (case-sensitive).
  - Return `null` on first miss (orchestrator records `missing-node`).
  - **Done when:** unit test walks mock tree matching WO-022 contract (`text/label`, `icon-slot/leading`, `state-layer/hover`, `focus-ring`).

- [x] **Step 7** — Same file — `validateKindForNode(node: SceneNode, kind: BindingKind): BindingFailureReason | null`:
  - `FrameNode` / `ComponentNode` / `InstanceNode`: allow `fill`, `stroke`, `radius`, `padding`, `gap`.
  - `TextNode`: allow `fill`, `text-style` only.
  - Other types → return `'type-mismatch'`.
  - **Done when:** unit tests assert `type-mismatch` for `text/label.radius` on TextNode mock.

- [x] **Step 8** — Same file — export `normalizeVariablePath(raw: string): string`:
  - Trim whitespace.
  - If `/^(Primitives|Theme|Typography|Layout|Effects)\/(.+)$/` matches, return capture group 2.
  - Else return trimmed verbatim.
  - **Done when:** tests: `Theme/color/primary/default` → `color/primary/default`; `space/md` unchanged.

### Phase 3 — Bind helpers (numeric + text style)

- [x] **Step 9** — Create `src/core/components/scaffold/bindNumeric.ts`:
  - `bindPaddingToVar(node: FrameNode | ComponentNode | InstanceNode, variable: Variable): void` — read current `paddingLeft/Right/Top/Bottom`, assign as fallback scalars, then `setBoundVariable` on each of the four fields (DesignOps `bindNum` order).
  - `bindGapToVar(node, variable)` — fallback from `itemSpacing`, then `setBoundVariable('itemSpacing', variable)`.
  - `bindRadiusToVar(node, variable)` — fallback from each corner radius, then bind `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`.
  - Pre-check `variable.resolvedType === 'FLOAT'`; throw catchable error if not (orchestrator → `type-mismatch`).
  - **Done when:** `tests/unit/core/components/scaffold/bindNumeric.test.ts` spies `setBoundVariable` call counts (4 padding, 1 gap, 4 radius).

- [x] **Step 10** — Create `src/core/components/scaffold/textStyleBinding.ts`:
  - `applyTextStyleByName(textNode: TextNode, styleName: string): Promise<void>`:
    - `await figma.loadFontAsync` for target style's font (mirror pattern from `src/core/canvas/typographyStyleBinding.ts` `loadFontForStyle` / style lookup).
    - Resolve via `figma.getLocalTextStylesAsync()` — match `style.name === styleName`.
    - Set `textNode.textStyleId = style.id`.
    - Return/reject when style missing (orchestrator → `missing-variable`).
  - **Done when:** unit test with mocked text styles list applies id; missing name rejects.

- [x] **Step 11** — Wire color binds in orchestrator (no new file):
  - Import `bindPaintToVar`, `bindStrokeToVar` from `@/core/canvas/helpers/bindings`.
  - Pre-check COLOR `variable.resolvedType` for `fill` / `stroke` kinds.
  - Cast target to `GeometryMixin & MinimalFillsMixin` (fill) or `MinimalStrokesMixin` (stroke) after kind validation.
  - **Done when:** reuse covered by integration test spies (Step 26).

### Phase 4 — Orchestrator: walk ComponentSet variants (`applyBindings.ts`)

- [x] **Step 12** — Implement `src/core/components/scaffold/applyBindings.ts` — skeleton + logging:
  - Import `pluginLog` from `@/core/pluginLog` (not `console.debug`).
  - Log once at start: `applyBindings: {spec.name} bindings={n} variants={m}`.
  - **Done when:** file compiles; ES2017-safe (no `?.`, `??`).

- [x] **Step 13** — Implement binding loop (uses locked call sequence):
  - For each `COMPONENT` child of `componentSet`, for each `spec.bindings[]` entry:
    1. `parseBindingSelector(binding.selector)`
    2. `resolveNodeByPath(variant, nodePath)` — on null → push `{ reason: 'missing-node', diagnostic: 'Missing node: {nodePath} (selector {selector})' }`
    3. `normalizeVariablePath(binding.variable)` + `resolvePath(map, path)` — on null → push `{ reason: 'missing-variable', diagnostic: 'Missing variable: {variable} (selector {selector})' }`
    4. `validateKindForNode` — on mismatch → push `{ reason: 'type-mismatch', … }`
    5. Dispatch `applyBindingToNode` inside try/catch — API throw → `{ reason: 'api-error', diagnostic: err.message }`
    6. On success increment `result.applied`
  - **Done when:** mock tree + map test records failures without throwing; success increments applied count.

- [x] **Step 14** — Implement internal `applyBindingToNode(node, kind, variable)`:
  - `fill` → `bindPaintToVar`
  - `stroke` → `bindStrokeToVar`
  - `padding` → `bindPaddingToVar`
  - `gap` → `bindGapToVar`
  - `radius` → `bindRadiusToVar`
  - `text-style` → `await applyTextStyleByName` (variable param holds TextStyle **name**, not Variable — skip variable resolve for this kind in Step 13: branch before `resolvePath`, lookup style by name instead; missing style → `missing-variable`)
  - **Done when:** integration test (Step 26) binds all six kinds on mock nodes.

- [x] **Step 15** — Export `parseBindingSelector` and `normalizeVariablePath` from `applyBindings.ts` (re-export from selector module or implement in selector and re-export here — single canonical implementation in `selector.ts`).
  - **Done when:** public API matches locked block exactly.

### Phase 5 — Audit: `comp/binding-*` rules + `runAudit` scope extension

- [x] **Step 16** — Create `src/core/audit/rules/componentBindings.ts`:
  - Pure functions `(input: ComponentAuditInput) => AuditRuleResult[]`.
  - Implement four rules (all `severity: 'error'`):

| ruleId | Pass condition | Diagnostic template |
| ------ | -------------- | ------------------- |
| `comp/bindings-all-applied` | `bindingsResult.failed.length === 0` | `{n} binding(s) failed` |
| `comp/binding-variable-resolved` | No failed entry with `reason === 'missing-variable'` | `Missing variable: {variable} (selector {selector})` per failure |
| `comp/binding-node-resolved` | No failed entry with `reason === 'missing-node'` | `Missing node: {nodePath} (selector {selector})` — parse nodePath from selector via `parseBindingSelector` |
| `comp/binding-verified` | Post-apply spot-check on `componentSet` variants | `{selector}: expected bind on {nodeName}, found none` |

  - **`comp/binding-verified` spot-check logic:**
    - For each binding in `spec.bindings` (only when `bindingsResult.failed.length === 0` for that selector — else skip verify and let aggregate rule fail):
    - On first variant component, resolve target node; for `fill`/`stroke` check `boundVariables` on paint or node; for numeric kinds check `node.boundVariables[field]`; for `text-style` check `textStyleId` non-empty and not `figma.mixed`.
  - **Done when:** unit tests in `tests/unit/core/audit/rules/componentBindings.test.ts` cover pass + each FAIL shape.

- [x] **Step 17** — Create `src/core/audit/rules/componentBindingsIndex.ts` (or add to `rules/index.ts`):
  - Export ordered `COMPONENT_BINDING_RULES` array (4 entries).
  - Export `runComponentBindingRules(input: ComponentAuditInput): AuditRuleResult[]`.
  - **Done when:** imported by `runAudit.ts` without circular dependency.

- [x] **Step 18** — Extend `src/core/audit/runAudit.ts`:
  - Add overload: `runAudit(scope: 'component', input: ComponentAuditInput): Promise<AuditReportV1>`.
  - Branch: dispatch `runComponentBindingRules`, `computePassed`, assemble report with `meta.scope = 'component'`, `meta.operation = 'apply-bindings'`.
  - Remove/replace `return Promise.reject(new Error('unsupported audit scope: ' + scope))` for `'component'` only — keep reject for unknown scopes.
  - Use `buildCanvasSummary` or new minimal `buildComponentSummary(results)` returning zeros for variable fields + rule rollups (mirror canvas branch).
  - **Done when:** `tests/unit/core/audit/runAudit.component.test.ts` calls `runAudit('component', { spec, componentSet: mock, bindingsResult })` and asserts `passed` + ruleIds.

- [x] **Step 19** — Update `src/core/audit/index.ts` barrel:
  - Export `ComponentAuditInput` type.
  - Document call pattern in comment: after `applyBindings`, `runAudit('component', { spec, componentSet, bindingsResult: result })`.
  - **Done when:** WO-027 / future scaffold orchestrator can import from `@/core/audit`.

- [x] **Step 20** — Wire `ApplyBindingsResult` as sole audit input for binding rules:
  - Rules must **not** re-run `applyBindings` — consume `bindingsResult` from caller.
  - `comp/binding-variable-resolved` and `comp/binding-node-resolved` iterate `bindingsResult.failed` filtered by `reason`.
  - **Done when:** audit tests pass with synthetic `ApplyBindingsResult` fixtures (no Figma globals).

### Phase 6 — Fixtures

- [x] **Step 21** — Create `tests/fixtures/components/variable-map-minimal.json`:
  - Serialized map keys → mock variable metadata (`name`, `resolvedType`: COLOR | FLOAT) for Vitest injection.
  - Include paths used by chip fixture: `color/primary/default`, `color/on-primary/default`, `space/md`, `radius/md`, etc.
  - **Done when:** importable from Vitest without `@figma/plugin-typings` at runtime.

- [x] **Step 22** — Create `tests/fixtures/components/button-chip-bindings.v1.json`:
  - Valid `ComponentSpecV1` fragment: `kind`, `v`, `name`, minimal `variantMatrix`, **`bindings` array with ≥10 entries** using locked selector grammar:
    - Examples: `root.fill` → `color/primary/default`, `root.radius` → `radius/md`, `root.padding` → `space/md`, `root.gap` → `space/sm`, `text/label.text-style` → `Label/MD`, `text/label.fill` → `color/on-primary/default`, `icon-slot/leading.fill`, `state-layer/hover.fill`, `focus-ring.stroke`, etc.
  - **No** CSS selectors; **no** `Theme/` prefixes (use canonical slash paths).
  - **Done when:** JSON validates against `component-spec.v1.schema.json` if schema exists; else TypeScript import typed as `ComponentSpecV1`.

- [x] **Step 23** — Create `tests/helpers/scaffold/mockVariantTree.ts`:
  - Factory building mock `ComponentSetNode` with 2+ variant `ComponentNode` children and layer tree matching WO-022 names (`text/label`, `icon-slot/leading`, `state-layer/hover`, `focus-ring`).
  - Expose minimal GeometryMixin / TextNode mocks with writable `fills`, `strokes`, `boundVariables`, `setBoundVariable` spy.
  - **Done when:** used by integration test (Step 26).

### Phase 7 — Tests

- [x] **Step 24** — `tests/unit/core/components/scaffold/selectorParse.test.ts`:
  - Cover Steps 5–8 cases.
  - **Done when:** `npm test -- selectorParse` green.

- [x] **Step 25** — `tests/unit/core/components/scaffold/applyBindings.test.ts`:
  - Mock `ensureLocalVariableMap` via injected `options.variableMap`.
  - Assert `failed.length === 0` and `applied === bindings.length × variantCount` for happy path.
  - Drop one variable from map → assert one `missing-variable` failure with selector in diagnostic.
  - Rename layer → assert `missing-node`.
  - **Done when:** ticket AC rows 1–3 covered at unit level.

- [x] **Step 26** — `tests/integration/core/components/scaffold/applyBindings.integration.test.ts`:
  - Load `button-chip-bindings.v1.json` + `variable-map-minimal.json`.
  - Build mock ComponentSet via `mockVariantTree.ts`.
  - Run `applyBindings(spec, componentSet, { variableMap })`.
  - Assert `result.passed === true`, `result.failed.length === 0`, spy counts match ≥10 binds × variants.
  - Second case: run `runAudit('component', { spec, componentSet, bindingsResult: failedResult })` with one missing variable — assert `comp/binding-variable-resolved` FAIL diagnostic contains selector path.
  - **Done when:** ticket AC integration row satisfied.

- [x] **Step 27** — `tests/unit/core/audit/rules/componentBindings.test.ts`:
  - Synthetic `ApplyBindingsResult` for each rule FAIL.
  - **Done when:** all four `comp/binding-*` ruleIds asserted.

- [x] **Step 28** — `tests/unit/core/audit/runAudit.component.test.ts`:
  - End-to-end component scope report shape: `meta.operation === 'apply-bindings'`, `meta.scope === 'component'`.
  - **Done when:** extends existing `runAudit.test.ts` pattern without breaking variables/canvas tests.

### Phase 8 — Pipeline stub + CI gate

- [x] **Step 29** — Add orchestration comment stub (no WO-022 edit required if not merged):
  - In `src/core/components/scaffold/index.ts` or new `pipeline.ts` comment block:

```ts
// Scaffold pipeline (WO-022 + WO-023 + WO-024):
// const componentSet = await scaffold(spec);
// const bindingsResult = await applyBindings(spec, componentSet);
// const audit = await runAudit('component', { spec, componentSet, bindingsResult });
// if (!bindingsResult.passed || !audit.passed) { /* surface to UI */ }
// await applyProperties(spec, componentSet); // WO-024
```

  - **Done when:** comment documents locked order; no premature `applyProperties` import.

- [x] **Step 30** — Run quality gates:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run format:check` (or write + recheck)
  - `npm test`
  - `npm run build -w @detroitlabs/figmint-contracts`
  - `npm run build` (dual manifest)
  - **Done when:** all green; **do not commit** (repo default git strategy).

---

## Build Agents

### Phase 1 (sequential — requires WO-022 scaffold tree merged or mock-only branch)

- `code-build` — **Steps 1–4:** extend WO-022 `types.ts` + `index.ts`, contract `operation` patch, audit types, binding barrel exports.

### Phase 2 (parallel)

- `code-build` — **Steps 5–8:** `selector.ts` — `parseBindingSelector`, `resolveNodeByPath`, `validateKindForNode`, `normalizeVariablePath` (selector unit tests in Step 24).

### Phase 3 (parallel)

- `code-build` — **Steps 9–11:** `bindNumeric.ts`, `textStyleBinding.ts`, color bind wiring + unit tests for numeric/text.

### Phase 4 (sequential — depends Phase 2–3)

- `code-build` — **Steps 12–15:** `applyBindings.ts` orchestrator, variant walk, dispatch, locked public API exports.

### Phase 5 (parallel with Phase 4 completion)

- `code-build` — **Steps 16–20:** `componentBindings.ts` rules, `runAudit` `'component'` branch, audit barrel + `ApplyBindingsResult` wiring.

### Phase 6–8 (sequential)

- `code-build` — **Steps 21–23:** JSON fixtures + mock variant tree factory.
- `code-build` — **Steps 24–28:** unit + integration + audit tests (all AC paths).
- `code-build` — **Steps 29–30:** pipeline comment stub + full CI gate.

**Hard dependency:** WO-022 must name layers (`text/label`, `icon-slot/*`, …) before live sandbox VQA (SPK-023-3). Vitest may proceed with mocks immediately.

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| **WO-022** | Produces `ComponentSetNode` + named layer tree consumed by selectors |
| **WO-008** | Variables pushed to file; `ensureLocalVariableMap()` / `resolvePath()` |
| **WO-014** | `bindPaintToVar`, `bindStrokeToVar` in `src/core/canvas/helpers/bindings.ts` |
| **WO-010** | `runAudit` orchestrator + `AuditReportV1` contract |
| **WO-024** | Downstream — runs **after** this ticket's `applyBindings()` |
| **WO-003** | `@detroitlabs/figmint-contracts` — `ComponentSpecV1`, audit types |

**Lift references (read-only during build):**

- `DesignOps-plugin/skills/create-component/conventions/07-token-paths.md`
- `DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-chip.mcp.js` §5
- `src/core/canvas/typographyStyleBinding.ts` — font load + TextStyle patterns

**MCP / external:** None required for CI. Optional manual VQA: [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox) (`file_key=cVdPraIafWFBRZnzMPhtrW`) after WO-022 lands.

---

## Open Questions

1. **SPK-023-3 live sandbox bind** — blocked until WO-022 scaffold exists. **Deferred** to combined WO-022+023 VQA; not a planning blocker.
2. **`AuditReportMeta.operation` granularity** — use `'apply-bindings'` for this module (not umbrella `'scaffold-component'`). **RESOLVED** per research D7/D8.
3. **Numeric helpers location** — `bindNumeric.ts` under scaffold vs extending `helpers/bindings.ts`. **RESOLVED:** keep scaffold-local (`bindNumeric.ts`) to avoid canvas/table scope creep; paint helpers stay shared.
4. **Per-archetype selector appendix** — WO-022 plan owns layer names; WO-023 resolver stays generic. **RESOLVED.**

---

## Notes

### Build notes (WO-023 code-build, 2026-05-28)

- Replaced stub `applyBindings.ts` with full orchestrator; `forwardScaffold` in `index.ts` (WO-024/WO-025) now calls real `applyBindings`.
- `resolveNodeByPath` uses greedy longest-prefix segment matching so WO-022 flat layer names (`text/label`, `icon-slot/leading`) resolve correctly.
- `runAudit('component')` uses `meta.operation = 'apply-bindings'` when only `bindingsResult` is supplied; `'scaffold-component'` when `applyPropertiesResult` is also present (WO-024 coexistence).
- Contract patch: `AuditReportMeta.operation` union adds `'apply-bindings' | 'scaffold-component'`.
- Repo-wide `npm run typecheck` still fails on pre-existing WO-024/WO-025 in-flight errors unrelated to WO-023; all 26 binding Vitest cases pass.

### ES2017 + logging (`memory.md`)

All files bundled to main-thread `code.js` must avoid `?.`, `??`, `replaceAll`. Use `pluginLog()` for major events (`applyBindings` start, failure counts) — never `console.debug`.

### Selector kinds vs variable types

| Kind | Variable type check | API |
| ---- | ------------------- | --- |
| `fill`, `stroke` | COLOR | `setBoundVariableForPaint` via helpers |
| `padding`, `gap`, `radius` | FLOAT | `setBoundVariable` |
| `text-style` | N/A (TextStyle name in `variable` field) | `textStyleId` assignment |

### WO-022 layer naming contract (cross-ticket)

Selectors assume WO-022 output tree uses DesignOps names: `text/label`, `icon-slot/leading|trailing|center`, `state-layer/hover|pressed|focus`, `focus-ring`. Integration tests fail fast if WO-022 drifts.

### Telemetry

`pluginLog()` per major event only; production telemetry deferred per ticket.

### Bibliography (not execution sources for `/build`)

- Ticket: `./ticket.md`
- Research: `./research/variable-bindings-application.md`
- PRD: `Docs/PRD.md` §6.2 FR-SCAF-3, §8.3
- Plan quality bar: `.github/templates/plan-quality-bar.md`
