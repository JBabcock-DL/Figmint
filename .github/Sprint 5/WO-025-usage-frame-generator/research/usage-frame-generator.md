# Usage frame generator — WO-025 research

> **Status:** ✅ Research complete — FR-SCAF-5 scoped as instance gallery (not legacy Do/Don't cards); curation algorithm, pipeline placement, and lift corrections locked for `/plan`.
> **Date:** 2026-05-28
> **Owner:** WO-025 (Sprint 5)
> **Topic slug:** `usage-frame-generator`
> **PRD anchors:** §6.2 FR-SCAF-5, §6.2 FR-SCAF-7 (auto-layout via WO-014)
> **Primary lift:** DesignOps `matrix.mcp.js` instance cell pattern (`createInstance` + optional `setProperties`); **not** `_usage-runner.fragment.js` (Do/Don't doc only)

---

## Summary

WO-025 implements **FR-SCAF-5**: after the forward scaffold pipeline produces a `ComponentSetNode`, add a **compact usage frame** beside it containing **curated `InstanceNode` examples** — one per selected variant combination — each labeled with its **variant tuple**. This is **not** the legacy `cc-usage` / `buildUsageNotes()` Do/Don't documentation row (`usage.mcp.js` §6.8); that doc slice is out of scope for this ticket and remains a future doc-pipeline / Foundations-page concern.

**Locked recommendation:** add `src/core/components/scaffold/usageFrame.ts` with (1) **`curateVariantCombos(spec.variantMatrix, maxInstances)`** — deterministic greedy coverage capped at **6**; (2) **`buildUsageFrame(componentSet, spec, ctx)`** — vertical auto-layout column of labeled instance cells, placed in a **horizontal wrapper** next to the ComponentSet on the target page; (3) **`UsageFrameResult`** returned to the orchestrator (WO-027) with `instanceCount`, `combos`, `auditRows`. Reuse WO-014 **`createHugFrame`**, **`createHorizontalUsageRow`**, **`reassertHug`**, **`assertNoOnePxMaster`** from `src/core/canvas/helpers/autoLayout.ts` and `matrixSpecimen.ts`. Instances are created via **`componentSet.createInstance()`** then **`instance.setProperties(...)`** using **VARIANT axis keys** aligned with WO-022 naming (sorted axis keys, boolean values as `"true"` / `"false"` strings). Non-variant props from WO-024 are **not** toggled in v1 unless they appear in the curated combo map.

**Pipeline order (locked):** `scaffold()` (WO-022) → `applyBindings()` (WO-023) → `applyProperties()` (WO-024) → **`buildUsageFrame()`** (WO-025) → registry (WO-026). WO-025 **consumes** `ScaffoldResult.componentSet` + `ApplyPropertiesResult` (optional, for future boolean demo on instances).

**Lift correction:** `ticket.md` cites `_usage-runner.fragment.js` — that file is **17 lines** and only calls `__ccDocAppendUsage()` (Do/Don't cards). The **instance** pattern to port is **`matrix.mcp.js` L676–691** (`componentNode.createInstance()` inside a centered cell) plus **`04-doc-pipeline-contract.md` §3** step 4 (`setProperties` for variant coordinates).

---

## Key Findings

### 1. Naming collision — legacy "usage" ≠ Figmint FR-SCAF-5

| Term | Legacy DesignOps | Figmint WO-025 |
| ---- | ---------------- | -------------- |
| `cc-usage` bundle step | Fifth MCP call; fills `doc/component/{name}/usage` Do/Don't cards | **Not ported** in v1 |
| `_usage-runner.fragment.js` | Doc-only runner tail: find `docRoot` → `buildUsageNotes()` | **Misleading lift pointer** — no instance gallery |
| `buildUsageNotes()` | HORIZONTAL row, two 805px cards, `CONFIG.usageDo` / `usageDont` | Out of scope (ticket Out of scope: designer-customizable examples) |
| FR-SCAF-5 / ticket AC | (no single legacy equivalent) | **Instance gallery** beside ComponentSet, 4–6 curated combos |

**Evidence:** `usage.mcp.js` L550–581 — only Do/Don't `card()` builders; zero `createInstance` calls. `component-chip.mcp.js` L882–883 — scaffold placeholder caption "Do / Don't usage (slice 5)".

**Implication for `/plan`:** do not call `buildUsageFrame` `buildUsageNotes`; frame name **`{spec.name}/usage-examples`** (or `{spec.name}/usage`) to avoid clashing with future Foundations doc tree `doc/component/{name}/usage`.

### 2. Closest legacy pattern — matrix specimen cells, not usage bundle

**Evidence:** `matrix.mcp.js` L684–691:

```js
const componentNode = variantByKey[key];
if (componentNode) {
  const instance = componentNode.createInstance();
  if (typeof CONFIG.applyStateOverride === 'function') {
    CONFIG.applyStateOverride(instance, st.key, { variant, size, componentNode });
  }
  cell.appendChild(instance);
}
```

Legacy matrix creates instances from **variant master `ComponentNode`**, not from the set root. WO-025 should prefer **`componentSet.createInstance()`** then **`setProperties`** so one code path works for all axes without maintaining `variantByKey` — WO-022 already returns `variantByKey` in `ScaffoldResult` as fallback if `setProperties` fails on a partial set.

**State simulation (hover/pressed):** matrix uses `applyStateOverride` opacity/state-layer toggles (`01-config-schema.md` §`applyStateOverride`). **Out of scope for WO-025** — usage frame shows **variant matrix coordinates only**, not M3 state columns. State gallery remains future doc-matrix work.

### 3. WO-022 variant naming ↔ `setProperties` keys

**Evidence:** WO-022 research §2 — axis keys sorted **alphabetically**; child name `disabled=false, size=sm, variant=default`.

**Figma behavior (retrieved 2026-05-28):** [InstanceNode.setProperties](https://developers.figma.com/docs/plugins/api/instancenode/#setproperties) accepts a map of **component property names** to values. VARIANT properties use **string** values; boolean axes encoded as variant properties use **`"true"` / `"false"`** strings (WO-024 §6).

**Locked `setProperties` builder:**

```ts
function comboToSetProperties(
  combo: Record<string, string | boolean>,
  axes: string[],
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < axes.length; i++) {
    const axis = axes[i];
    const val = combo[axis];
    out[axis] = typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val);
  }
  return out;
}
```

**BOOLEAN/TEXT props from WO-024:** v1 usage frame **does not** set `loading#id` keys unless a later ticket extends curation with `defaultProps` on spec — ticket out of scope.

### 4. Curation algorithm — deterministic greedy coverage (max 6)

**Requirement trace:** ticket AC — Button `variant × size × disabled` (3×2×2 = **12** combos) → show **4–6** representative instances, not all 12.

**Constants:**

| Constant | Value | Rationale |
| -------- | ----- | --------- |
| `MAX_USAGE_INSTANCES` | `6` | Upper bound from AC "4–6"; use 6 so small matrices show all |
| `MIN_USAGE_INSTANCES` | `1` | Degenerate 1×1 matrix |
| Default value per axis | **First element** of `variantMatrix[axis]` | Matches shadcn/CVA default ordering in registry fixtures; same as "baseline" row in matrix docs |

**Algorithm (`curateVariantCombos`) — normative pseudocode:**

```text
INPUT: variantMatrix, maxCount (default 6)
1. axes ← sorted Object.keys(variantMatrix)     // MUST match WO-022 expandVariantMatrix order
2. combos ← full cartesian product of axis value arrays (same order as WO-022)
3. IF combos.length ≤ maxCount → RETURN combos
4. baseline ← { axis[i]: variantMatrix[axis[i]][0] for each axis }
5. picked ← [baseline]; covered ← { axis:value pairs in baseline }
6. remaining ← combos \ { baseline } (stable sort — lexicographic on axes order)
7. WHILE picked.length < maxCount AND remaining not empty:
     best ← argmax_{c ∈ remaining} |{ (axis, c[axis]) : not in covered }|
     tie-break: lexicographically smallest combo (axis order, then value index in matrix array)
     picked.append(best); merge c's pairs into covered; remove best from remaining
8. RETURN picked
```

**Worked example — ticket AC matrix** `{ variant: [a,b,c], size: [sm, md], disabled: [false, true] }` (3×2×2 = 12), `maxCount = 6`:

| Step | Combo (alphabetical axis order: `disabled`, `size`, `variant`) | New coverage |
| ---- | -------------------------------------------------------------- | ------------ |
| baseline | `false, sm, a` | all first values |
| greedy 1 | `false, sm, b` | new `variant=b` |
| greedy 2 | `false, md, a` | new `size=md` |
| greedy 3 | `true, sm, a` | new `disabled=true` |
| greedy 4 | `false, sm, c` | new `variant=c` |
| greedy 5 | `false, lg, a` if size had lg — *for 2 sizes, next might be `true, md, b`* | fills cross-axis |

Exact output is **deterministic** — unit tests must snapshot the 12→6 pick list for the Button fixture used in AC.

**Properties:**

- **Coverage-first:** every axis's first value appears in baseline; greedy steps maximize **count of newly seen (axis, value)** pairs.
- **Not** uniform random — reproducible idempotent rescaffold.
- **Small matrices:** if product ≤ 6, show **all** combos (no curation).
- **Single-axis:** 4 values → 4 instances (≤6).

**Rejected alternatives:**

| Alternative | Why rejected |
| ----------- | ------------ |
| Hand-coded Button-only 6-tuple | Breaks FR-SCAF-5 for other components |
| Random sample | Violates determinism / audit |
| Only "default" combo | Fails AC "representative" |
| Full cross-product always | Fails AC "not all 12"; layout overflow |

### 5. Frame layout — beside ComponentSet using WO-014 helpers

**Evidence:** `src/core/canvas/helpers/autoLayout.ts` — `createHugFrame`, `resizeThenApplySizing`, `reassertHug`, `assertNoOnePxMaster`. `matrixSpecimen.ts` L24–29 — `createHorizontalUsageRow` for HORIZONTAL rows with counter AUTO (§10.2 Do/Don't row — **geometry reuse only**, not Do/Don't content).

**Locked node tree:**

```text
{spec.name}/forward-scaffold          HORIZONTAL · hug height · itemSpacing 48 · pad 0
├── {spec.name} — ComponentSet        (existing WO-022 node — reparent, do not clone)
└── {spec.name}/usage-examples        VERTICAL · width ~360–480 · hug height
    ├── usage-examples/title          TEXT Doc/Caption or plain "Usage examples"
    └── usage-examples/row            HORIZONTAL · createHorizontalUsageRow(440)
        └── usage-examples/cell/{hash}   VERTICAL · hug · itemSpacing 8 · pad 16
            ├── instance               InstanceNode (centered)
            └── label                  TEXT — human tuple e.g. "disabled=false, size=sm, variant=default"
```

**Placement:** WO-022 D6 places ComponentSet on `target: PageNode`. WO-025 **reparents** ComponentSet into `forward-scaffold` wrapper (create wrapper, append compSet, append usage frame, append wrapper to page). If wrapper already exists (idempotent rescaffold), **`remove()`** prior `usage-examples` subtree only, rebuild instances.

**Sizing invariants (FR-SCAF-7):**

- Call `reassertHug` on `usage-examples/row` after each `appendChild` (§0.1 collapse guard).
- Never `resize(instance, w, 1)` — instances hug intrinsically.
- Run `assertNoOnePxMaster` on each **cell** frame, not on instance.

**Labels:** `formatVariantTupleLabel(combo, axes)` → comma-separated `axis=value`, booleans lowercase `true`/`false`, keys in **sorted axis order** (matches ComponentSet child names).

### 6. Auto-layout import path correction

**Ticket requirement** cites `src/core/canvas/autoLayout.ts` — **file does not exist**. Actual path: **`src/core/canvas/helpers/autoLayout.ts`** (WO-014 shipped). `/plan` must fix all references.

### 7. Audit — new `comp/usage-*` rules (inline v1)

**Evidence:** `runAudit.ts` — only `variables` | `canvas` scopes today; WO-022 defers full `component` scope.

**WO-025 locked inline checks** (returned in `UsageFrameResult.auditRows`):

| Rule ID | Pass |
| ------- | ---- |
| `comp/usage-instance-count` | `instances.length === min(crossProduct, MAX_USAGE_INSTANCES)` |
| `comp/usage-label-present` | Every cell has non-empty label TEXT child |
| `comp/usage-setproperties` | No `setProperties` throw logged during build (catch → FAIL row) |
| `comp/usage-one-px-cell` | `assertNoOnePxMaster(cell) === null` for each cell |

Ticket AC "Frame passes audit" — satisfied by aggregate `auditRows` all PASS; wiring `runAudit('component')` optional Phase 2 (same split as WO-022).

### 8. Contract gap — `usageDo` / `usageDont` not on `ComponentSpecV1`

**Evidence:** `packages/contracts/src/componentSpec.v1.ts` — no `usageDo`/`usageDont` fields. Legacy `shadcn-props.schema.json` includes them for Do/Don't cards.

**Impact:** WO-025 does **not** need contract extension. If Do/Don't returns in a later WO, add optional `usageDo?: string[]` / `usageDont?: string[]` to v2 spec — **out of scope**.

### 9. Testing strategy

| Layer | File | Assert |
| ----- | ---- | ------ |
| Unit | `tests/unit/core/components/scaffold/curateVariantCombos.test.ts` | 12→6 Button-like matrix; 3×2×2; single-axis; full≤6 |
| Unit | `tests/unit/core/components/scaffold/usageFrame.test.ts` | Label format; `comboToSetProperties` booleans |
| Integration | mock `figma` harness | `createInstance` + `setProperties` called per curated combo |
| Sandbox | SPK-025-1 | Real ComponentSet after WO-022 chip scaffold |

---

## Validated evidence

### Repo inventory

| Path | Role | Status |
| ---- | ---- | ------ |
| `src/core/canvas/helpers/autoLayout.ts` | WO-014 helpers (FR-SCAF-7) | ✅ Exists |
| `src/core/canvas/helpers/matrixSpecimen.ts` | `createHorizontalUsageRow`, matrix cells | ✅ Exists |
| `tests/unit/core/canvas/autoLayout.test.ts` | Helper regression tests | ✅ Exists |
| `packages/contracts/src/componentSpec.v1.ts` | `variantMatrix` input | ✅ Exists |
| `src/core/components/scaffold/**` | Scaffold engine | ❌ Greenfield WO-022 |
| `src/core/components/scaffold/usageFrame.ts` | This ticket | ❌ Greenfield |
| `src/core/audit/runAudit.ts` | No `component` scope yet | ✅ Exists — partial |

### DesignOps bundle headers (grep — preamble only)

All `component-*.mcp.js` bundles share the same header shape (example `component-chip.mcp.js` L1–12):

- `CONFIG = ctx`
- `REGISTRY_COMPONENTS`, `usesComposes`, `variantByKey = {}`
- Page navigation §1, variable resolution §2, font load §4
- Doc pipeline §6.6–6.8 inlined at ~L366+ (`buildPropertiesTable`, `buildMatrix`, `buildUsageNotes`)

**Instance creation** appears in **`buildMatrix()`** body (matrix bundle L676+), not in chip archetype `buildVariant`.

### Official API / platform facts

| API | WO-025 usage | Doc (retrieved 2026-05-28) |
| --- | ------------ | -------------------------- |
| `ComponentSetNode.createInstance()` | Default instance, then override props | [ComponentSetNode](https://developers.figma.com/docs/plugins/api/componentsetnode/) |
| `InstanceNode.setProperties()` | Apply curated VARIANT combo | [InstanceNode.setProperties](https://developers.figma.com/docs/plugins/api/instancenode/#setproperties) |
| `figma.loadFontAsync()` | Before label `characters` | Required before text mutation |
| `node.setPluginData()` | Optional `figmint:usageFrame:v1:…` idempotency | 100 kB/key limit |

**ES2017:** no `?.`, `??`, `replaceAll` in `usageFrame.ts` (main thread).

### Cross-ticket matrix

| Ticket | Interface | WO-025 consumes / produces |
| ------ | --------- | -------------------------- |
| WO-014 | `autoLayout.ts`, `matrixSpecimen.ts` | **Consumes** helpers |
| WO-022 | `ScaffoldResult` (`componentSet`, `variantByKey`) | **Consumes** set + optional per-variant fallback |
| WO-023 | Bound paints on variant masters | **Consumes** visual result (no API) |
| WO-024 | `ApplyPropertiesResult` suffixed keys | **Consumes** optionally; v1 gallery VARIANT-only |
| WO-026 | Registry write | **Produces** usage frame node id? (optional metadata — defer) |
| WO-027 | Forward-flow UI | **Consumes** `buildUsageFrame` in ops program |

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | --------------------- |
| D1 | Instance gallery, not Do/Don't cards | FR-SCAF-5 + ticket AC | Port `buildUsageNotes` verbatim |
| D2 | `curateVariantCombos` greedy coverage, max 6 | Deterministic + AC "4–6" | Show all 12; random subset |
| D3 | `componentSet.createInstance()` + `setProperties` | Single path for all axes | Only `variantByKey` masters |
| D4 | Reparent into `{name}/forward-scaffold` HORIZONTAL | "Next to" ComponentSet | Absolute x/y positioning |
| D5 | Frame name `{name}/usage-examples` | Avoid doc `doc/component/.../usage` clash | Reuse doc path |
| D6 | VARIANT-only props on instances in v1 | WO-024 keys optional | Demo all boolean props |
| D7 | No `applyStateOverride` / hover columns | Matrix state out of scope | Simulate hover in gallery |
| D8 | Import helpers from `helpers/autoLayout.ts` | Actual WO-014 path | `src/core/canvas/autoLayout.ts` |
| D9 | Inline `comp/usage-*` audit rows | `runAudit('component')` not ready | Block on WO-010 scope extension |
| D10 | Alphabetical axis sort shared with WO-022 | Label/setProperties consistency | Insertion-order keys |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-025-1 | Sandbox: after WO-022+024 scaffold Button 3×2×2, call `buildUsageFrame` | 6 instances visible; labels match tuple; no 1px cells | ☐ pending — `/plan` or build Phase 0 |
| SPK-025-2 | `setProperties` on boolean axis `disabled` | Instance visually disabled vs default | ☐ pending |
| SPK-025-3 | Idempotent rescaffold | Second run replaces usage cells, same combo set | ☐ pending |

**Research-complete gate:** SPK-025-1 required before `/build` VQA; SPK-025-2/3 may run in VQA if unit tests cover curation.

---

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| Lift reference points agents at Do/Don't bundle | Medium | High | Corrected in this doc + ticket References |
| `setProperties` key mismatch vs Figma defs | High | Medium | Use axis keys from `componentPropertyDefinitions`; unit test + SPK-025-1 |
| Wrapper reparent breaks designer selection | Low | Medium | Document in plan; preserve ComponentSet node id |
| 6 wide instances overflow narrow page | Low | Low | `layoutWrap` on row or reduce max to 4 when width > threshold |
| Composed archetype instances huge | Medium | Low | Same curation; cell hugs height |
| Missing `loadFontAsync` before labels | Medium | Medium | Reuse scaffold context font preload |

---

## Recommendations

1. **`/plan` modules** — `usageFrame.ts` + `curateVariantCombos.ts` (or same file if <120 lines) + `types.ts` exports `UsageFrameResult`.
2. **Orchestration** — extend forward scaffold op in WO-027 plan to call `buildUsageFrame` after WO-024; WO-022 plan adds hook stub.
3. **Fix ticket paths** — `helpers/autoLayout.ts`; clarify lift = `matrix.mcp.js` instance cells.
4. **Golden tests** — snapshot curated combos for AC matrix and for `component-spec-button.json` matrix (3×3 = 9 → 6).
5. **Do not port** — `usage.mcp.js`, `_usage-runner.fragment.js`, `buildUsageNotes`, `__ccDocAppendUsage`.
6. **Contract** — no `usageDo`/`usageDont` in v1; optional v2 if Do/Don't ticket added.

---

## Open questions

| # | Question | Owner | Status |
| - | -------- | ----- | ------ |
| OQ-1 | Export usage frame `nodeId` in registry (WO-026)? | WO-026 plan | **OPEN** — defer v1 |
| OQ-2 | Reduce `MAX_USAGE_INSTANCES` to 4 for `icon` size axis components? | `/plan` | **OPEN** — default 6 unless overflow in SPK-025-1 |
| OQ-3 | Include `usageDo` bullets under gallery as subtitle? | Product | **RESOLVED** — out of scope per ticket |

---

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-5, §6.2 FR-SCAF-7
- Lift map: `Docs/lift-sources.md` §Component pipeline bundles, §`03-auto-layout-invariants.md`
- WO-022: `.github/Sprint 5/WO-022-componentset-variant-matrix-scaffolder/research/component-scaffold-engine.md`
- WO-024: `.github/Sprint 5/WO-024-component-property-definitions/research/component-property-definitions.md`
- Legacy matrix instances: `DesignOps-plugin/skills/create-component/canvas-templates/bundles/matrix.mcp.js` L676–691
- Legacy Do/Don't (out of scope): `bundles/usage.mcp.js` L550–581, `_usage-runner.fragment.js`
- Legacy doc contract: `DesignOps-plugin/skills/create-component/conventions/04-doc-pipeline-contract.md` §3, §6
- Helpers: `src/core/canvas/helpers/autoLayout.ts`, `src/core/canvas/helpers/matrixSpecimen.ts`
- Figma API: [InstanceNode.setProperties](https://developers.figma.com/docs/plugins/api/instancenode/#setproperties) (2026-05-28)
