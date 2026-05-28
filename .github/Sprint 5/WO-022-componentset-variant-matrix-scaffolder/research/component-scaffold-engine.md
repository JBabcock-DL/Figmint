# Component scaffold engine — WO-022 research

> **Status:** ✅ Research complete — archetype dispatch, variant-matrix expansion, lift map, and WO-022/WO-023/WO-024 pipeline boundaries locked for `/plan`.
> **Date:** 2026-05-28
> **Owner:** WO-022 (Sprint 5)
> **Topic slug:** `component-scaffold-engine`
> **PRD anchors:** §6.2 FR-SCAF-1..2, §8.3 `component-spec.v1`, §6.2 FR-SCAF-7 (auto-layout invariants via WO-014)
> **Primary lift:** `DesignOps-plugin/skills/create-component/` — `EXECUTOR.md`, `conventions/02-archetype-routing.md`, `conventions/03-auto-layout-invariants.md`, modular `canvas-templates/cc-arch-*.js`, bundled `component-*.mcp.js` (headers + variant-plane only)

---

## Summary

WO-022 implements the **forward-path scaffold core**: given a validated `ComponentSpecV1`, produce a **`ComponentSetNode` on a target `PageNode`** whose children are the full **cross-product** of `variantMatrix` axes, with geometry drawn by the correct **layout archetype builder**. This replaces DesignOps's five sequential MCP `use_figma` calls (`cc-scaffold` → `cc-properties` → `cc-component-*` → `cc-matrix` → `cc-usage`) with **one deterministic Plugin API function** — `scaffold(spec, target)`.

**Locked recommendation:** build `src/core/components/scaffold/` as a three-layer module — (1) **`variantMatrix.ts`** expands axes → Figma variant names; (2) **`archetypes/*.ts`** ports one builder per layout enum (plus a **`composed.ts`** path when `composes[]` is non-empty); (3) **`index.ts`** orchestrates idempotent find-or-create, hidden variant staging frame, `figma.combineAsVariants`, ComponentSet auto-layout grid config, and returns **`ScaffoldResult`** for downstream WO-023..026. **Do not** port doc-frame sections (properties table, specimen matrix, usage cards) — those are WO-024..025 scope. **Do not** bind variables in WO-022 — use legacy hex fallbacks for paint/spacing during geometry; WO-023 applies `bindings[]`.

**Dependencies satisfied:** WO-003 (`ComponentSpecV1` contract), WO-008 (variables exist in sandbox for optional smoke), WO-014 (`autoLayout.ts`, `matrixSpecimen.ts`, `bindings.ts` helpers). **Upstream consumers:** WO-023 (bindings), WO-024 (properties), WO-025 (usage frame), WO-026 (registry), WO-027 (Components tab UI).

---

## Key Findings

### 1. Legacy pipeline is an MCP budget artifact — Figmint collapses to one call

**Evidence:** `DesignOps-plugin/skills/create-component/EXECUTOR.md` §0 — fixed order `cc-scaffold` → `cc-properties` → `cc-component-*` → `cc-matrix` → `cc-usage`; `Docs/lift-sources.md` §Component archetype bundles — "The 5-call sequence is an MCP-payload-budget artifact — Figmint executes the full pipeline in one Plugin API call."

Each legacy bundle repeats ~300 lines of preamble (page nav, variable lookup, `bindColor`/`bindNum`, font load). Figmint factors shared preamble into `src/core/components/scaffold/context.ts` (new) reusing `ensureLocalVariableMap()` from `src/core/canvas/lib/variables.ts` where needed, but **WO-022 geometry uses hex fallbacks** until WO-023 binds.

**WO-022 in-scope slice:** archetype variant builders + `combineAsVariants` + ComponentSet grid styling (from `buildComponentSetSection` in bundles, lines ~902–971 in `component-chip.mcp.js`). **Out of scope:** `buildPropertiesTable`, `buildMatrix`, `buildUsageNotes` (doc pipeline §§6.6–6.8).

### 2. `ComponentSpecV1.variantMatrix` maps to Figma variant naming — not legacy `CONFIG.variants` + `CONFIG.sizes`

**Evidence:** `packages/contracts/src/componentSpec.v1.ts` L104 — `variantMatrix: Record<string, (string | boolean)[]>`. Legacy `01-config-schema.md` splits `variants: string[]` and `sizes: string[]` as **two** axes with hard-coded naming (`variant=${v}, size=${s}`).

**Locked expansion algorithm (`variantMatrix.ts`):**

1. Collect axis keys from `Object.keys(spec.variantMatrix)`.
2. **Sort keys alphabetically** for deterministic cross-product order (stable across re-runs and idempotency hash).
3. Cartesian product of all axis value arrays.
4. Name each `ComponentNode`: comma-separated `key=value` pairs, booleans as lowercase `"true"` / `"false"` strings (Figma property string convention).
5. Example: `{ variant: ['a','b'], size: ['sm','md'], disabled: [false, true] }` → 8 components, e.g. `disabled=false, size=sm, variant=a` (keys sorted: `disabled`, `size`, `variant`).

**Acceptance criterion trace:** ticket AC "3 × 2 × 2 = 12 children" — any three axes with those cardinalities satisfy FR-SCAF-2; axis **names are not fixed** to `variant/size/disabled`.

**Internal build context:** `/plan` should introduce `ScaffoldBuildContext` (not a contract type) projecting spec fields into legacy-shaped inputs archetype ports expect (`style` record per variant key, `padH`, `labelStyle`, etc.) derived from spec archetype config objects (`surface`, `field`, `control`, …).

### 3. Archetype dispatch — seven layout enums + composed path (not an eighth enum)

**Evidence:** `ComponentSpecLayoutArchetype` in `componentSpec.v1.ts` L42–49 — `chip | surface-stack | field | row-item | tiny | container | control`. **No `composed` enum.** Ticket requirement listing `composed` as an archetype folder is ** imprecise** — legacy uses `buildComposedVariant` when `CONFIG.composes[]` is present (`02-archetype-routing.md` §3.05, `component-composed.mcp.js` L700+).

**Locked dispatch (`index.ts`):**

```text
if (spec.composes?.length) → archetypes/composed.ts
else switch (spec.archetype ?? inferArchetype(spec)) → archetypes/{name}.ts
else → archetypes/chip.ts + pluginLog warn (legacy fallback)
```

| Archetype | Legacy builder | Modular lift source | Figmint file |
| --------- | -------------- | ------------------- | ------------ |
| `chip` | `buildVariant` | `component-chip.mcp.js` L281–536 (inline; no `cc-arch-chip.js`) | `archetypes/chip.ts` |
| `surface-stack` | `buildSurfaceStackVariant` | `cc-arch-surface-stack.js` | `archetypes/surfaceStack.ts` |
| `field` | `buildFieldVariant` | `cc-arch-field.js` | `archetypes/field.ts` |
| `row-item` | `buildRowItemVariant` | `cc-arch-row-item.js` | `archetypes/rowItem.ts` |
| `tiny` | `buildTinyVariant` | `cc-arch-tiny.js` | `archetypes/tiny.ts` |
| `container` | `buildContainerVariant` | `cc-arch-container.js` | `archetypes/container.ts` |
| `control` | `buildControlVariant` | `cc-arch-control.js` | `archetypes/control.ts` |
| composed | `buildComposedVariant` | `cc-arch-composed.js` + `cc-arch-shared.js` | `archetypes/composed.ts` |

Shared dashed-slot / sample-text helpers → `archetypes/shared.ts` porting `cc-arch-shared.js`.

**Control checked-state regex (preserve verbatim):** `/checked=true|pressed=true|on/.test(variantComponentName)` — `02-archetype-routing.md` §3.1.1. Document in `control.ts` comments; boolean axis values should use `on`/`off` or explicit `checked=true` strings when checked glyph is required.

### 4. Variant build sequence mirrors legacy chip bundle §6.2a

**Evidence:** `component-chip.mcp.js` L561–604:

1. Loop cross-product → call archetype builder → `{ component: ComponentNode, … }`.
2. Stage components in hidden frame `_ccVariantBuild/{spec.name}` on target page.
3. Horizontal offset layout (`cx += width + 16`) — staging only; not designer-visible.
4. **`combineAsVariants(comps, parent)`** — parent is ComponentSet section frame in legacy; WO-022 uses **direct child of target page** or intermediate wrapper frame named `{name}/scaffold`.
5. Remove staging holder; set `compSet.name = \`${displayTitle} — ComponentSet\``.
6. Apply ComponentSet grid auto-layout: `HORIZONTAL` + `WRAP`, `resize(width, 1)`, then `primaryAxisSizingMode = 'FIXED'`, `counterAxisSizingMode = 'AUTO'` (§10.1 order — `03-auto-layout-invariants.md`).
7. Build `variantByKey` map parsing `node.name` split on `, ` / `=`.

**Official API (retrieved 2026-05-28):**

- [figma.combineAsVariants](https://developers.figma.com/docs/plugins/api/figma/#combineasvariants) — `(nodes: ComponentNode[], parent: BaseNode & ChildrenMixin, index?: number) => ComponentSetNode`. Parent must accept children. Returns new ComponentSet containing supplied components.
- Component variant property names derive from variant layer names automatically when unified across variants (legacy §3.3.2 in `01-config-schema.md`).

### 5. Auto-layout helpers — mandatory WO-014 usage

**Evidence:** `src/core/canvas/helpers/autoLayout.ts` — `resizeThenApplySizing`, `createHugFrame`, `reassertHug`, `assertValidAxisAlign`, `assertNoOnePxMaster`. WO-014 completed (Sprint 3); tests in `tests/unit/core/canvas/autoLayout.test.ts`.

**Component master rule (FR-SCAF-7):** archetype builders must call `resizeThenApplySizing` or `createHugFrame` — never `resize(w, 1)` on a COMPONENT without re-applying sizing modes (`03-auto-layout-invariants.md` §10.1, §10.2).

**Matrix specimen helpers (`matrixSpecimen.ts`)** are for WO-025 usage/matrix doc frames — import in WO-022 only if a builder internally mirrors state-cell geometry; not required for ComponentSet grid itself.

### 6. Layer naming contract — locked for WO-023 selector grammar

**Evidence:** WO-023 research (`variable-bindings-application.md`) §4 — selectors use slash paths (`text/label`, `icon-slot/leading`, `root.fill`). WO-022 **must** name inner layers identically to DesignOps builders.

**Minimum naming contract (all archetypes):**

| Layer | Node type | Notes |
| ----- | --------- | ----- |
| `text/label` | TEXT | Required when label present; legacy chip left unnamed — **Figmint fixes** |
| `icon-slot/leading` / `trailing` / `center` | FRAME or INSTANCE | When `iconSlots` config present |
| `state-layer/hover` / `pressed` / `focus` | FRAME | When M3 stateRole configured |
| `focus-ring` | FRAME | When focus ring configured |
| `switch/thumb` | FRAME | control shape switch |

Port comments from `cc-arch-*` verbatim where they document M3/state-layer behavior.

### 7. Idempotency — greenfield requirement (legacy has none)

**Evidence:** Ticket AC — "Re-running with the same spec is idempotent." Legacy EXECUTOR §0.2 step 6 — "fix payload and re-run from failing step"; no dedup.

**Locked strategy:**

1. Compute stable id: `figmint:scaffold:v1:${spec.name}:${hashVariantMatrix(spec.variantMatrix)}` (FNV-1a or SHA-256 truncated — match fixture generator pattern from WO-005).
2. On target page, `findOne` ComponentSet where `getPluginData('figmint.scaffoldId') === id` OR name matches `{spec.name} — ComponentSet`.
3. If found: **`remove()`** existing ComponentSet (and orphan staging frames matching `_ccVariantBuild/${name}`), then rebuild — **replace semantics**, not in-place patch (simpler; matches registry update story in WO-026).
4. After create: `componentSet.setPluginData('figmint.scaffoldId', id)` and `setPluginData('figmint.specVersion', '1')`.

**Plugin data limit:** 100 kB per key per node ([Plugin API — shared pluginData](https://developers.figma.com/docs/plugins/api/node-properties/#setplugindata)) — id string is well under cap.

### 8. Audit — WO-022 produces scaffold stats; full `scope: 'component'` audit split with WO-023

**Evidence:** WO-010 research — `scope: 'component'` deferred to Sprint 5; `runAudit.ts` currently supports `variables` | `canvas` only. Ticket AC references "WO-010 / component-scaffold mode."

**Locked split:**

| Rule ID | Owner | Pass criteria |
| ------- | ----- | ------------- |
| `comp/scaffold-variant-count` | WO-022 | `componentSet.children.length === expectedCrossProductCount` |
| `comp/scaffold-naming` | WO-022 | Every child name matches `key=value` grammar |
| `comp/scaffold-one-px-master` | WO-022 | `assertNoOnePxMaster` null for each variant |
| `comp/binding-*` | WO-023 | Bindings applied / missing-variable rows |

WO-022 returns `ScaffoldResult.auditRows: AuditRow[]` (or compatible partial report) so `/plan` can wire `runAudit('component', …)` extension in WO-022 Phase 2 **or** document as follow-on — **recommend WO-022 implements minimal inline validation + exports stats; WO-023 extends `runAudit` scope.**

### 9. Variable bindings and component properties — explicitly downstream

**Evidence:** Ticket out-of-scope — WO-023 bindings, WO-024 properties. Legacy adds `addComponentProperty` **before** `combineAsVariants` in chip bundle L426 — **defer to WO-024**.

WO-022 builders should **structure** nodes so WO-024 can attach property references (`componentPropertyReferences`) without renaming layers.

### 10. Composed archetype blocker — registry read required

**Evidence:** `02-archetype-routing.md` §3.05 — composed cells need `InstanceNode`s of published child ComponentSets via `.designops-registry.json`. `component-composed.mcp.js` throws if child missing in registry.

**Impact:** `archetypes/composed.ts` requires **read** access to Figmint registry (`.figmint-registry.json` shape in `packages/contracts/src/registry.v1.ts`) — **not** registry write (WO-026). Accept `RegistryV1` as optional parameter to `scaffold()`: `scaffold(spec, target, options?: { registry?: RegistryV1 })`.

**Pre-plan spike SPK-022-3** validates composed Button Group path — defer composed integration tests until child Button exists in sandbox (bootstrap or pre-scaffold).

---

## Validated evidence

### Repo inventory

| Path | Role | Status |
| ---- | ---- | ------ |
| `packages/contracts/src/componentSpec.v1.ts` | `ComponentSpecV1`, archetype enums, `composes[]` | ✅ Exists |
| `src/io/formats/__fixtures__/component-spec-button.json` | Sample spec (drifted selectors — not scaffold input) | ✅ Exists — do not use as golden fixture |
| `src/core/canvas/helpers/autoLayout.ts` | FR-SCAF-7 helpers | ✅ WO-014 shipped |
| `src/core/canvas/helpers/matrixSpecimen.ts` | Matrix state cells (WO-025) | ✅ Exists |
| `src/core/canvas/helpers/bindings.ts` | `bindPaintToVar` / `bindStrokeToVar` | ✅ Exists — WO-023 primary consumer |
| `src/core/canvas/lib/variables.ts` | `ensureLocalVariableMap`, `resolvePath` | ✅ Exists |
| `src/core/audit/runAudit.ts` | Audit orchestrator (`variables` \| `canvas`) | ✅ Exists — extend later |
| `tests/unit/core/canvas/__mocks__/figmaFrames.ts` | Frame/component mock harness | ✅ Reuse for unit tests |
| `src/core/components/scaffold/**` | Scaffold engine | ❌ Greenfield (WO-022 creates) |
| `src/core/components/scaffold/archetypes/*.ts` | Eight builder modules | ❌ Greenfield |

### Patterns to mirror

| Pattern | Source | Figmint target |
| ------- | ------ | -------------- |
| Hidden variant staging frame | `component-chip.mcp.js` L594–604 | `stageVariants()` in `index.ts` |
| `combineAsVariants` + grid layout | `component-chip.mcp.js` L902–969 | `finalizeComponentSet()` |
| Archetype builder signature | `cc-arch-control.js` `buildControlVariant(name, fillVar, fallbackFill, opts)` | Typed TS ports with `ScaffoldBuildContext` |
| Enum invariant guard | `autoLayout.ts` `assertValidAxisAlign` | Call on every auto-layout parent frame in builders |
| Cross-product variant plane | `component-chip.mcp.js` L561–593 | `expandVariantMatrix()` |

### Official API / platform facts

| API | Usage in WO-022 | Doc (retrieved 2026-05-28) |
| --- | --------------- | -------------------------- |
| `figma.createComponent()` | Each variant master | [ComponentNode](https://developers.figma.com/docs/plugins/api/componentnode/) |
| `figma.combineAsVariants()` | Merge staging components | [figma.combineAsVariants](https://developers.figma.com/docs/plugins/api/figma/#combineasvariants) |
| `figma.loadFontAsync()` | Before any `text.characters` | [loadFontAsync](https://developers.figma.com/docs/plugins/api/figma/#loadfontasync) |
| `node.setPluginData()` | Idempotency key | [setPluginData](https://developers.figma.com/docs/plugins/api/node-properties/#setplugindata) — 100 kB/key limit |
| `figma.variables.getLocalVariables()` | Optional preflight only | WO-023 owns bind path |

**ES2017 constraint:** no `?.`, `??`, `replaceAll` in `src/core/components/**` main-thread code (`memory.md` — Figma QuickJS).

### Cross-ticket matrix

| Ticket | Interface / artifact | WO-022 consumes or produces |
| ------ | -------------------- | --------------------------- |
| WO-003 | `ComponentSpecV1` | **Consumes** input contract |
| WO-008 | Local variable collections in file | **Optional** — smoke only; geometry uses hex fallbacks |
| WO-014 | `autoLayout.ts`, constants | **Consumes** helpers |
| WO-010 | `AuditReportV1`, `runAudit` | **Produces** scaffold audit rows; full scope extension shared with WO-023 |
| WO-023 | Layer naming + tree | **Produces** named variant trees for `applyBindings()` |
| WO-024 | `addComponentProperty` | **Produces** ComponentSet ready for property wiring |
| WO-025 | Usage frame + matrix doc | **Produces** ComponentSet instance source |
| WO-026 | `RegistryV1` | **Consumes** (read) for composed; **Produces** node ids for registry write |
| WO-027 | Components tab UI | **Consumes** `scaffold()` via ops program |

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | --------------------- |
| D1 | Single `scaffold()` entry — no five internal "steps" | MCP sequence was transport-only (`lift-sources.md`) | Preserve cc-scaffold/cc-matrix split in TS |
| D2 | Alphabetical axis sort for cross-product | Deterministic idempotency hash + stable variant names | Preserve JSON key insertion order (fragile across serializers) |
| D3 | `composed` = `composes[]` path, not layout enum | Matches `ComponentSpecV1` + legacy routing | Add eighth `composed` enum to contract (requires v2) |
| D4 | Replace-on-rescaffold idempotency via `pluginData` | Clear semantics; avoids partial mutation bugs | In-place diff/update of variant nodes |
| D5 | Hex fallbacks in WO-022; no `bindColor` in builders | FR-SCAF-3 owned by WO-023; avoids double-bind | Port full legacy bind helpers into WO-022 |
| D6 | ComponentSet parent = target page (or `{name}/scaffold` wrapper) | Ticket API `target: PageNode`; doc frame deferred | Full `doc/component/{name}` tree (WO-025) |
| D7 | Port from `cc-arch-*.js` + chip bundle inline | Modular sources smaller than 45–65 KB `.mcp.js` bundles | Load entire `component-control.mcp.js` into repo |
| D8 | `ScaffoldResult` includes `variantByKey`, `auditRows`, `replacedExisting` | Downstream tickets need lookup without re-walking tree | Return only `ComponentSetNode` |
| D9 | Vitest unit tests for matrix + dispatch; Figma integration per archetype | AC requires archetype integration tests | Unit-only without sandbox spikes |
| D10 | `RegistryV1` optional param for composed | Composed cannot run without child node ids | Block composed entirely until WO-026 (delays Button Group) |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-022-1 | Plugin Sandbox: push bootstrap tokens (WO-008), call prototype `expandVariantMatrix` + `combineAsVariants` with 3×2×2 spec, no archetype geometry | ComponentSet with 12 children; names parseable | ☐ pending — run during `/plan` or Phase 0 build |
| SPK-022-2 | Sandbox: scaffold `chip` archetype minimal spec (1 variant, 1 size) | ComponentSet 1 child; `text/label` present; no 1px master | ☐ pending |
| SPK-022-3 | Sandbox: composed spec with pre-scaffolded child in registry | Instances resolve; no throw from missing registry | ☐ deferred — requires child ComponentSet + registry fixture; track in Open Questions |
| SPK-022-4 | Desktop plugin: measure `scaffold()` wall time for 24-variant Button-like spec | p50 < 5s on Pro sandbox (PRD G2 forward path) | ☐ pending — VQA / WO-027; not blocking `/plan` |

**Research-complete gate:** SPK-022-1 and SPK-022-2 must pass before `/build` VQA; SPK-022-3 may defer with composed archetype marked beta in plan.

---

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| Archetype port drift (1px sliver, STRETCH on parent axis) | High | Medium | WO-014 helpers + `assertValidAxisAlign` in builders; port `03-auto-layout-invariants.md` comments |
| `ComponentSpecV1` lacks legacy `CONFIG.style` per variant | High | High | `ScaffoldBuildContext` adapter synthesizes `style` from `surface`/`control`/defaults; document in plan with Button fixture |
| Composed blocked without registry read | Medium | High | Optional `registry` param; clear error `COMPOSED_CHILD_MISSING` |
| Chip port size (1,064 lines inline in bundle) | Medium | Medium | Port only `buildVariant` + helpers (~250 lines); shared.ts for dashed slots |
| Idempotent replace deletes designer edits on ComponentSet | Medium | Low | Document replace semantics; future WO may add merge mode |
| ES2017 downlevel gaps in ported JS | Low | Medium | CI lint + esbuild target es2017 |
| PRD §8.3 example paths (`Theme/Primary`) confuse agents | Low | High | Cross-link WO-023 normalization; golden fixtures under `tests/fixtures/component-spec/` |
| Audit scope creep into WO-022 | Low | Medium | Inline scaffold stats only; defer `runAudit('component')` wiring to plan Phase 2 |

---

## Recommendations

1. **`/plan` file tree** — create `src/core/components/scaffold/{index,types,variantMatrix,context,specAdapter}.ts` + `archetypes/{chip,surfaceStack,field,rowItem,tiny,container,control,composed,shared}.ts`.
2. **Define `ScaffoldResult` and `ScaffoldOptions`** in `types.ts` with fields: `componentSet`, `variantCount`, `variantByKey`, `replacedExisting`, `auditRows`, `unresolvedTokens` (empty in WO-022).
3. **Golden fixtures** — add `tests/fixtures/component-spec/chip-button-minimal.v1.json` aligned with WO-023 naming; retire misuse of `component-spec-button.json`.
4. **Phased build agents** — Phase 1: `variantMatrix` + `index` + `chip` ( proves pipeline ); Phase 2: remaining archetypes parallel; Phase 3: `composed` + registry option.
5. **Integration tests** — one Vitest file per archetype using extended `figmaFrames` mock implementing `createComponent` + `combineAsVariants`; sandbox E2E in VQA checklist.
6. **Do not port** — bundle runners, `__ccDocAppend*`, properties table, matrix specimen grid, usage cards, MCP preamble duplicate across eight bundles.
7. **Sync ticket requirement** — remove standalone `composed` archetype folder requirement; use `composes[]` dispatch (see refined Requirements in `ticket.md`).

---

## Open questions

| # | Question | Owner | Status |
| - | -------- | ----- | ------ |
| OQ-1 | Should `scaffold()` accept `displayTitle` separate from `spec.name` (legacy `CONFIG.title`)? | `/plan` | **RESOLVED** — use `spec.name` for ComponentSet name; add optional `title?: string` on spec adapter context only if shadcn display name differs (default: `spec.name`) |
| OQ-2 | Infer `archetype` when omitted — fail closed or default `chip`? | `/plan` | **RESOLVED** — default `chip` + `pluginLog` warn (legacy fallback rule) |
| OQ-3 | Where do per-variant `style` fills come from in v1 specs without Mode A extraction? | Design + `/plan` | **OPEN** — plan must define `specAdapter` defaults from archetype config blobs; spike SPK-022-2 validates |
| OQ-4 | Extend `runAudit('component')` in WO-022 or WO-023? | WO-022 + WO-023 plans | **OPEN** — lean WO-022 inline stats; WO-023 adds binding rules to shared scope |
| OQ-5 | Composed archetype GA vs beta when registry empty? | Product | **OPEN** — recommend beta with explicit error until WO-026 read path exists |

---

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-1..2, §8.3, §6.2 FR-SCAF-7
- Lift map: `Docs/lift-sources.md` §Component archetype bundles, §create-component conventions
- Contract: `packages/contracts/src/componentSpec.v1.ts`
- WO-014 helpers: `src/core/canvas/helpers/autoLayout.ts`
- WO-023 pipeline: `.github/Sprint 5/WO-023-variable-bindings-application/research/variable-bindings-application.md`
- Legacy EXECUTOR: `DesignOps-plugin/skills/create-component/EXECUTOR.md`
- Legacy routing: `DesignOps-plugin/skills/create-component/conventions/02-archetype-routing.md`
- Legacy invariants: `DesignOps-plugin/skills/create-component/conventions/03-auto-layout-invariants.md`
- Figma API: [combineAsVariants](https://developers.figma.com/docs/plugins/api/figma/#combineasvariants) (2026-05-28)
- Breakdown plan: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md` — Sprint 5 WO-022..027
