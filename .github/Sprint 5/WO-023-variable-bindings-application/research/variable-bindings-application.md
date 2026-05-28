# Variable bindings application — WO-023 research

> **Status:** ✅ Research complete — selector grammar, `applyBindings` API, audit rules, and WO-022 tree contract locked for `/plan`.
> **Date:** 2026-05-28
> **Owner:** WO-023 (Sprint 5)
> **PRD anchors:** §6.2 FR-SCAF-3, §8.3 `component-spec.v1` (`bindings[]`)
> **Primary lift:** `DesignOps-plugin/skills/create-component/conventions/07-token-paths.md` + draw-engine `bindColor` / `bindNum` (§5 in `component-*.mcp.js`)
> **Upstream:** WO-022 (scaffold tree + node names), WO-008 (variables pushed), WO-010 (audit reporter), WO-014 (`bindPaintToVar` helpers)

---

## Summary

WO-023 adds a **post-scaffold pass** that reads `ComponentSpecV1.bindings[]` and applies Figma variable bindings to every variant inside a `ComponentSetNode`. The pass is **deterministic, non-silent, and audit-backed**: missing variables or unresolvable selectors become **`AuditReportV1` FAIL rows** with the selector path — never hex fallbacks (DesignOps §7.6 banned strategy; FigHub PRD §11.4 preview/confirm culture extends to “no silent unbound chrome”).

**Locked recommendation:** implement `src/core/components/scaffold/applyBindings.ts` as a pure orchestrator that (1) builds a `VariablePathMap` once via `ensureLocalVariableMap()`, (2) walks **each variant `ComponentNode`** under the scaffolded `ComponentSetNode`, (3) parses selectors as `{nodePath}.{kind}`, (4) dispatches to shared canvas helpers for paint/number binds, and (5) returns `ApplyBindingsResult` consumed by a new **`scope: 'component'`** audit branch (WO-010 extension — rules locked below, implementation owned by WO-023 `/plan` Phase 1).

**Selector grammar** uses **slash-separated layer names** aligned with DesignOps archetype builders (`text/label`, `icon-slot/leading`, `state-layer/hover`, `root` = variant component frame). **Variable paths** are Figma variable **`name` strings** (`color/primary/default`, `space/md`, `radius/md`) per `07-token-paths.md` §7.1 — not CSS vars, not Tailwind classes, not collection-prefixed paths like `Theme/color/...` (normalize by stripping an optional `{Collection}/` prefix during resolve).

**Pipeline order (WO-022 → WO-023 → WO-024):** scaffold geometry first (`scaffold()`), then **`applyBindings()`**, then properties (`applyProperties()` — WO-024). Bindings must run **before** property wiring so text nodes exist but may run **after** combine-as-variants (bindings target variant components inside the set).

---

## Key Findings

### 1. Contract shape — `ComponentSpecBinding` is intentionally minimal

**Evidence:** `packages/contracts/src/componentSpec.v1.ts` L12–15:

```ts
export interface ComponentSpecBinding {
  selector: string;
  variable: string;
}
```

There is **no separate `kind` or `property` field**. The selector string must encode **both** the target node and the binding kind (`root.fill`, `text/label.text-style`). `/plan` must not add contract fields without a `componentSpec.v2` bump.

**PRD drift:** `Docs/PRD.md` §8.3 example uses `{ "selector": "root.fill", "variable": "Theme/Primary" }` and `{ "selector": "label.text", "variable": "Typography/Body/medium" }`. Those paths **violate** `07-token-paths.md` (collection prefixes + non-canonical Theme tiers). Canonical examples:

| Stale PRD example | Locked FigHub path |
| ----------------- | ------------------- |
| `Theme/Primary` | `color/primary/default` |
| `Typography/Body/medium` | TextStyle name `Body/MD` for `.text-style` kind, or `Body/MD/font-size` only if future sub-kinds added |

**Fixture drift:** `src/io/formats/__fixtures__/component-spec-button.json` uses CSS-like selectors (`.button`) and collection-prefixed variables — treat as **markdown export sample only**, not scaffold input. Integration tests must use locked selector grammar.

### 2. Variable resolution — reuse canvas variable map (WO-008 / WO-014)

**Evidence:** `src/core/canvas/lib/variables.ts` — `ensureLocalVariableMap()` calls `figma.variables.getLocalVariablesAsync()` and indexes by `variable.name`. `resolvePath(map, path)` returns `Variable | null`.

**Locked behavior for `applyBindings`:**

1. Call `ensureLocalVariableMap()` once per apply pass (or accept injected map for Vitest).
2. Normalize `binding.variable`:
   - Trim whitespace.
   - If value matches `/^(Primitives|Theme|Typography|Layout|Effects)\/(.+)$/`, use capture group 2 as the lookup key (compat shim for agent-authored specs).
   - Else use verbatim string as Figma variable name.
3. On miss → record `status: 'missing-variable'`, **do not** apply hex fallback (`07-token-paths.md` §7.6).

**Out of scope (ticket):** CSS class → token resolution (`resolver/resolve-classes.mjs`) — Sprint 8 token resolver.

### 3. Binding mechanics — color vs numeric vs text style

**Lift source:** `component-composed.mcp.js` §5 (`bindColor`, `bindNum`) + comment at L95: **Do NOT use `setBoundVariable` for color** — use paint binding.

| Kind | Plugin API | Helper to reuse | Variable type |
| ---- | ---------- | --------------- | ------------- |
| `fill` | `figma.variables.setBoundVariableForPaint` → assign `fills[]` | `bindPaintToVar` (`src/core/canvas/helpers/bindings.ts`) | COLOR |
| `stroke` | same on `strokes[]` | `bindStrokeToVar` | COLOR |
| `padding` | `node.setBoundVariable('paddingLeft' \| …, variable)` ×4 | new `bindPaddingToVar` in `applyBindings.ts` or `helpers/bindings.ts` | FLOAT |
| `gap` | `node.setBoundVariable('itemSpacing', variable)` | new `bindGapToVar` | FLOAT |
| `radius` | `setBoundVariable` on `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius` | new `bindRadiusToVar` (mirrors DesignOps `bindNum` loop) | FLOAT |
| `text-style` | `textNode.textStyleId = style.id` when `variable` matches a **published TextStyle name** | new `applyTextStyleByName` (async font load pattern from `typographyStyleBinding.ts`) | N/A (style reference) |

**Official API (retrieved 2026-05-28):**

- [Working with Variables](https://developers.figma.com/docs/plugins/working-with-variables/) — `setBoundVariable(field, variable)` for numeric/simple fields; paints use boundVariables on paint objects via `setBoundVariableForPaint`.
- [setBoundVariable](https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/) — pass `Variable` object; `null` unbinds.

**Numeric bind order (lift):** DesignOps `bindNum` sets fallback scalar **first**, then `setBoundVariable` (L124–131). FigHub scaffold already has geometry from WO-022; still set explicit pixel fallback from current node value before bind so Figma never reads an invalid state if bind throws.

**Text-style kind locked semantics:** `variable` holds the **TextStyle name** (e.g. `Label/MD`, `Body/SM/regular`), resolved via `figma.getLocalTextStylesAsync()`. Individual Typography variable binds (`fontSize`, `fontFamily`, …) on text nodes are **not** FR-SCAF-3 v1 — they remain the style-guide publisher’s job (`typographyStyleBinding.ts`). If TextStyle missing → `missing-variable` audit row (treat as unresolved reference).

### 4. Selector grammar and node resolution

**Problem:** `ComponentSpecBinding.selector` must address nodes inside each variant component tree produced by WO-022.

**Cross-ref WO-022 scaffold output tree (locked naming contract):**

WO-022 archetype ports must name layers consistently with DesignOps builders so selectors are stable:

```
ComponentSet  "{Title} — ComponentSet"
└── Component  "variant=primary, size=md, …"   ← selector root `root` or `.`
    ├── icon-slot/leading          (optional)
    ├── text/label                 (text node — WO-022 MUST name; legacy chip bundle left unnamed)
    ├── icon-slot/trailing         (optional)
    ├── icon-slot/center           (icon-only)
    ├── state-layer/hover          (optional M3)
    ├── state-layer/pressed
    ├── state-layer/focus
    └── focus-ring
```

Surface-stack / field / control archetypes add frames (`surface/header`, `field/chrome`, `control/indicator`, …) per `archetype-builders` — WO-022 research/plan must publish a **per-archetype selector map** appendix; WO-023 resolver is **generic** (depth-first match on slash segments).

**Selector syntax (locked):**

```
selector ::= nodePath "." kind
nodePath ::= "root" | "." | segment { "/" segment }
segment  ::= <Figma layer name, literal match>
kind     ::= "fill" | "stroke" | "radius" | "padding" | "gap" | "text-style"
```

**Resolution algorithm (`resolveBindingTarget(variantRoot, nodePath)`):**

1. If `nodePath` is `root`, `.`, or empty → `variantRoot`.
2. Split `nodePath` on `/`, walk `findChild` by **exact `node.name`** (case-sensitive) depth-first among **direct children only** at each step (no CSS wildcard).
3. If any segment misses → `status: 'missing-node'`.

**Kind validation by node type:**

| Node type | Allowed kinds |
| --------- | ------------- |
| `FrameNode`, `ComponentNode`, `InstanceNode` (geometry) | fill, stroke, radius, padding, gap |
| `TextNode` | fill, text-style |
| Other | `type-mismatch` FAIL |

### 5. Execution scope — all variants in the matrix

**Evidence:** Ticket AC — “spec with 10 bindings applied to a scaffolded component leaves **every selector bound**.” FR-SCAF-2 creates full variant cross-product (WO-022).

**Locked:** `applyBindings` iterates `componentSet.children` where `child.type === 'COMPONENT'`, runs the same `spec.bindings[]` against each variant root. Bindings are **spec-global**, not per-variant overrides (variant-specific fills come from archetype code + future spec evolution, not WO-023 v1).

### 6. Audit integration — component scope rules (WO-010 pattern)

**Evidence:** WO-010 research (`post-push-audit-rules.md`) deferred `scope: 'component'` to Sprint 5 (`06-audit-checklist.md` → `src/core/components/scaffold/audit.ts` per `lift-sources.md`). `runAudit.ts` currently rejects unknown scopes except `variables` | `canvas` (L130).

**Locked component-scope rules** (new `src/core/audit/rules/componentBindings.ts` or under `src/core/components/scaffold/auditBindings.ts` — `/plan` picks one module; WO-023 owns rule bodies):

| ruleId | Pass condition | Diagnostic template |
| ------ | -------------- | ------------------- |
| `comp/bindings-all-applied` | `ApplyBindingsResult.failed.length === 0` | `{n} binding(s) failed` |
| `comp/binding-variable-resolved` | For each failed with `missing-variable` | `Missing variable: {variable} (selector {selector})` |
| `comp/binding-node-resolved` | For each failed with `missing-node` | `Missing node: {nodePath} (selector {selector})` |
| `comp/binding-verified` | Post-apply spot-check: boundVariables or textStyleId present | `{selector}: expected bind on {nodeName}, found none` |

**Audit input extension:**

```ts
export interface ComponentAuditInput {
  spec: ComponentSpecV1;
  componentSet: ComponentSetNode; // or serialized snapshot for Vitest
  bindingsResult: ApplyBindingsResult;
}
```

**Meta.operation:** extend `AuditReportMeta.operation` union in `/plan` to include `'apply-bindings'` (contract patch in WO-023 Phase 1 — mirrors `'push-variables'` pattern).

**Severity:** all rules `error` (matches Sprint 2 strictness). No warn-only binding misses.

**DesignOps checklist cross-walk:** `06-audit-checklist.md` §“Text & bindings” V-rows (chrome bound, no hard-coded hex) become **automated** via `comp/binding-verified` once selectors cover chrome nodes; visual-only rows stay VQA.

### 7. Module layout — greenfield under `src/core/components/scaffold/`

**Repo inventory (grep 2026-05-28):**

| Path | Status |
| ---- | ------ |
| `src/core/components/scaffold/` | **Does not exist** — WO-022 creates tree |
| `src/core/components/scaffold/applyBindings.ts` | **Greenfield** — this ticket |
| `src/core/canvas/helpers/bindings.ts` | **Exists** — paint binds only |
| `src/core/canvas/lib/variables.ts` | **Exists** — map + resolvePath |
| `src/core/canvas/typographyStyleBinding.ts` | **Exists** — TextStyle + variable bind patterns |
| `packages/contracts/src/componentSpec.v1.ts` | **Exists** — binding contract |
| `tests/fixtures/components/` | **Does not exist** — create `button-chip-bindings.v1.json` in `/plan` |

### 8. Testing strategy

**Vitest (repo already has harness — WO-010/WO-014):**

```
tests/
  fixtures/components/
    button-chip-bindings.v1.json     # ≥10 bindings, locked selectors
    variable-map-minimal.json        # VariablePathMap serialized ids
  unit/core/components/scaffold/
    applyBindings.test.ts            # mock figma + map injection
    selectorParse.test.ts
  integration/core/components/scaffold/
    applyBindings.integration.test.ts  # uses mock ComponentSet tree
```

**AC mapping:**

| AC | Test |
| -- | ---- |
| 10 bindings → all bound | fixture with 10 entries, assert `failed.length === 0` + spy `setBoundVariableForPaint` / `setBoundVariable` counts |
| Missing variable → audit FAIL | drop one variable from map, assert `comp/binding-variable-resolved` diagnostic contains selector |
| Sample shadcn spec | extend `component-spec-button.json` → canonical selectors or new fixture aligned with chip archetype |

**No live Figma in CI** — mock at `ensureLocalVariableMap` boundary and node tree factory (same pattern as `tests/unit/core/canvas/bindings.test.ts`).

---

## Validated evidence

### Repo inventory

| File | Role |
| ---- | ---- |
| `packages/contracts/src/componentSpec.v1.ts` | `ComponentSpecBinding` + `ComponentSpecV1.bindings[]` |
| `src/core/canvas/helpers/bindings.ts` | `bindPaintToVar`, `bindStrokeToVar` |
| `src/core/canvas/lib/variables.ts` | `ensureLocalVariableMap`, `resolvePath`, `VariablePathMap` |
| `src/core/canvas/typographyStyleBinding.ts` | `tryBind`, `loadFontForStyle`, TextStyle patterns |
| `src/core/audit/runAudit.ts` | Extensible scope dispatch — add `'component'` branch |
| `packages/contracts/src/auditReport.v1.ts` | `AuditScope` includes `'component'` |
| `tests/unit/core/canvas/bindings.test.ts` | Mock pattern for paint binds |
| `DesignOps-plugin/.../07-token-paths.md` | Authoritative token path rules |
| `DesignOps-plugin/.../component-chip.mcp.js` §5 | `bindColor` / `bindNum` reference implementation |

### Official API / platform facts

| Fact | Source |
| ---- | ------ |
| Color binds use paint `boundVariables`, not `setBoundVariable` on node fill | Figma Variables guide + DesignOps draw-engine comment |
| `setBoundVariable(field, variable \| null)` for FLOAT fields (`paddingLeft`, `itemSpacing`, corner radii) | [setBoundVariable](https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/) — retrieved 2026-05-28 |
| `figma.variables.setBoundVariableForPaint(paint, 'color', variable)` | Used in `bindings.ts` L37–38 |
| `getLocalVariablesAsync()` returns all local variables; `.name` is slash path | [Working with Variables](https://developers.figma.com/docs/plugins/working-with-variables/) — retrieved 2026-05-28 |
| Main thread: no `console.debug` — use `pluginLog()` | `memory.md` do-not-repeat |

### Cross-ticket matrix

| Ticket | Interface / artifact | WO-023 consumes or produces |
| ------ | -------------------- | --------------------------- |
| WO-022 | `scaffold()` → `ComponentSetNode` + named layer tree | **Consumes** tree; **requires** `text/label` naming contract |
| WO-008 | Pushed Theme/Layout/Typography variables | **Consumes** variables via `ensureLocalVariableMap` |
| WO-014 | `bindPaintToVar` / canvas helpers | **Consumes** paint helpers |
| WO-010 | `runAudit`, `AuditReportV1` | **Produces** component-scope rules + `ApplyBindingsResult` input |
| WO-024 | `applyProperties.ts` | **Blocks on** WO-023 ordering (bindings before props) |
| WO-025–027 | Usage frame, registry, UI | Downstream; no direct API |
| Sprint 8 | Token class resolver | Out of scope |

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | ---------------------- |
| D1 | Selector format `{nodePath}.{kind}` | Fits minimal contract; mirrors PRD `root.fill` intent | Separate `property` field (needs v2 contract); CSS selectors (fixture-only) |
| D2 | Variable key = Figma `variable.name` with optional collection-prefix strip | Matches `07-token-paths.md` §7.1 | CSS var names; Tailwind classes |
| D3 | Reuse `bindPaintToVar` / `bindStrokeToVar` | WO-014 locked helpers + tests exist | Inline duplicate bind logic in scaffold |
| D4 | No hex fallback on miss | PRD §11.4 + DesignOps §7.6 | Silent fallback (legacy draw-engine) |
| D5 | `text-style` kind uses TextStyle **name** in `variable` | Matches DesignOps `textStyleId` pattern | Single Typography variable path (ambiguous) |
| D6 | Apply bindings to **every** variant component | AC + FR-SCAF-3 global spec | Per-variant binding table (contract change) |
| D7 | `ApplyBindingsResult` + component audit rules | WO-010 pattern for push audit | Throw on first miss (no aggregate report) |
| D8 | Run after scaffold, before WO-024 properties | Bindings target raw nodes; props reference text nodes | After properties (works but harder to debug) |
| D9 | Generic slash-path walker | One resolver for all archetypes | Per-archetype binding hardcode (unmaintainable) |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-023-0 | Repo grep: confirm no existing `applyBindings` / `src/core/components/scaffold/` | Zero hits; greenfield confirmed | ✅ PASS (2026-05-28) |
| SPK-023-1 | Read DesignOps `bindColor`/`bindNum` + Figma Variables docs | Color=paint bind; numeric=setBoundVariable | ✅ PASS (2026-05-28) |
| SPK-023-2 | Validate `runAudit` scope extension point | `'component'` in contract; branch throws today | ✅ PASS — extend in WO-023 build |
| SPK-023-3 | Live sandbox bind 10 paths on scaffolded chip | All 10 selectors bound; audit clean | ☐ **Deferred to `/build` VQA** — requires WO-022 scaffold landed first |

**Research-complete gate:** SPK-023-3 deferred with WO-022 dependency (documented in Open Questions). Planning may proceed.

---

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| WO-022 ships unnamed text nodes (legacy chip) | High | Med | Lock `text/label` in WO-022 plan; integration test fails fast |
| PRD/fixture paths use collection prefixes | Med | High | Normalization shim in D2; document canonical paths |
| `setBoundVariable` throws on type mismatch | Med | Low | Pre-check `variable.resolvedType` vs kind; `type-mismatch` audit row |
| Component audit scope not wired in UI | Low | Med | WO-027 Components tab reads `audit.passed` when scaffold op completes |
| Archetype-specific nodes not in generic map | Med | Med | WO-022 appendix per archetype; open question for surface-stack paths |
| ES2017 main thread (`?.`, `??`) | Med | Low | Match WO-014 style — no optional chaining in `applyBindings.ts` |

---

## Recommendations

### For `/plan`

1. **Phase 1 — core module**
   - `src/core/components/scaffold/applyBindings.ts` — locked API below
   - `src/core/components/scaffold/selector.ts` — parse + resolve (pure functions)
   - `src/core/components/scaffold/bindNumeric.ts` — padding/gap/radius (or extend `helpers/bindings.ts`)
   - `src/core/components/scaffold/textStyleBinding.ts` — TextStyle apply + font load
   - `src/core/components/scaffold/types.ts` — `ApplyBindingsResult`, `BindingFailure`
2. **Phase 2 — audit**
   - Extend `runAudit` with `'component'` branch + rules table above
   - Patch `auditReport.v1.ts` `operation` union → `'apply-bindings'`
3. **Phase 3 — tests**
   - Fixture with 10 bindings (chip archetype)
   - Audit FAIL fixture (missing `color/primary/default`)
4. **Coordinate WO-022:** add acceptance criterion “layer names match selector map (`text/label`, `icon-slot/*`, …)”
5. **Wire scaffold pipeline:** `scaffold()` return type includes optional `applyBindings()` hook or caller orchestrates both

### Locked API — `applyBindings.ts`

```ts
import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';
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
  /** bindings.length when every entry applied cleanly */
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

**Call sequence for `/plan` steps:**

```ts
const map = options?.variableMap ?? (await ensureLocalVariableMap());
const result: ApplyBindingsResult = { applied: 0, failed: [], passed: true };
for (const variant of componentSet.children) {
  if (variant.type !== 'COMPONENT') continue;
  for (const binding of spec.bindings) {
    const { nodePath, kind } = parseBindingSelector(binding.selector);
    const path = normalizeVariablePath(binding.variable);
    const target = resolveNodeByPath(variant, nodePath);
    const variable = resolvePath(map, path);
    // dispatch + record applied/failed
  }
}
result.passed = result.failed.length === 0;
return result;
```

---

## Open questions

1. **Per-archetype selector appendix** — who publishes the full map for `surface-stack` / `field` / `control`? **RESOLVED for planning:** WO-022 `/plan` owns archetype layer names; WO-023 owns generic resolver only.
2. **SPK-023-3 live sandbox** — blocked until WO-022 scaffold exists. **Deferred** to combined WO-022+023 VQA on Plugin Sandbox (`file_key=cVdPraIafWFBRZnzMPhtrW`).
3. **`AuditReportMeta.operation` union patch** — include `'scaffold-component'` umbrella vs granular `'apply-bindings'`. **Default:** `'apply-bindings'` for this module; scaffold orchestrator may wrap later.

---

## References

- `Docs/PRD.md` §6.2 FR-SCAF-3, §8.3
- `packages/contracts/src/componentSpec.v1.ts`
- `src/core/canvas/helpers/bindings.ts`
- `src/core/canvas/lib/variables.ts`
- `src/core/canvas/typographyStyleBinding.ts`
- `.github/Sprint 2/WO-010-…/research/post-push-audit-rules.md`
- `.github/Sprint 5/WO-022-componentset-variant-matrix-scaffolder/ticket.md`
- `DesignOps-plugin/skills/create-component/conventions/07-token-paths.md`
- `DesignOps-plugin/skills/create-component/conventions/06-audit-checklist.md` §Text & bindings
- `DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-chip.mcp.js` §5
- [Figma — Working with Variables](https://developers.figma.com/docs/plugins/working-with-variables/) (retrieved 2026-05-28)
- [Figma — setBoundVariable](https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/) (retrieved 2026-05-28)
