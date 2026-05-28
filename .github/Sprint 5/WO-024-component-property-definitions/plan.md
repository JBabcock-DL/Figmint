# Plan — WO-024: Component property definitions

## Approach

WO-024 implements FR-SCAF-4: a **post-bindings pass** that materializes Figma **component property definitions** on a scaffolded `ComponentSetNode` from `ComponentSpecV1.props[]` and **implicit element properties** derived from archetype flags (`componentProps`, `iconSlots`). The pass runs **after** WO-023 `applyBindings()` so text nodes and icon slots exist for `componentPropertyReferences` wiring.

**VARIANT properties are owned exclusively by WO-022.** When WO-022 calls `figma.combineAsVariants`, Figma auto-creates VARIANT definitions from variant component names (`axis=value` pairs). WO-024 **must not** call `addComponentProperty(..., 'VARIANT', ...)`. WO-024 **validates** that `componentPropertyDefinitions` axes and `variantOptions` match `spec.variantMatrix`.

**Per-variant `addComponentProperty` pattern (locked D1):** the public API accepts `ComponentSetNode`, but implementation **iterates every variant `ComponentNode`** in `componentSet.children` (type `COMPONENT`) and calls `addComponentProperty` on each with identical display names. Figma merges identical definitions into set-level `componentPropertyDefinitions`. Legacy lift: `DesignOps-plugin/.../component-composed.mcp.js` L425–489.

**Pipeline order (locked):** `scaffold()` (WO-022) → `applyBindings()` (WO-023) → **`applyProperties()` (WO-024)** → usage frame (WO-025). Wire the caller in scaffold orchestration only after WO-022 + WO-023 modules exist.

**Out of scope (do not implement):** instance-level prop overrides; property descriptions; `SLOT` type; doc-only props (`className`, `asChild`, `type`, …); `number` spec props → Figma properties; re-adding VARIANT props; usage frame `setProperties` (WO-025).

---

## AC traceability

| Ticket acceptance criterion | Plan step(s) |
| --------------------------- | ------------ |
| `props: [{ name: 'loading', type: 'boolean', default: false }]` → Boolean property default false | Steps 4, 6, 14, 16 |
| Variant matrix axes appear as VARIANT properties (WO-022 creates; WO-024 validates) | Steps 5, 13, 16 |
| Integration test: chip Button fixture with implicit Label + icon BOOLEAN props | Steps 1, 12, 16 |
| `ApplyPropertiesResult` surfaces failures; soft-fail per variant matches legacy §3.3.3 | Steps 4, 7, 15, 16 |

| Ticket requirement | Plan step(s) |
| ------------------ | ------------ |
| `applyProperties.ts` post-bindings pass | Steps 4, 8 |
| VARIANT from matrix only — validate, do not re-add | Steps 5, 13 |
| Explicit `props[]` filter + map boolean/string/node | Steps 2, 3, 6 |
| Implicit element props from `componentProps` / `iconSlots` | Steps 4, 6, 7 |
| `componentPropertyReferences` binding via convention map | Steps 7, 14 |
| Pipeline: scaffold → applyBindings → applyProperties | Step 8 |
| Audit S9.5–S9.9 + variant-matrix validation | Steps 9, 15 |

---

## Prop type mapping table (contract → Figma)

| `ComponentSpecPropType` | Figma `ComponentPropertyType` | Default coercion | Create property? | Binding convention | Notes |
| ----------------------- | ------------------------------- | ---------------- | ---------------- | -------------------- | ----- |
| `boolean` | `BOOLEAN` | `default !== undefined ? Boolean(default) : false` | ✅ Always | Optional via `PROP_NODE_BINDINGS[name]`; unbound allowed (AC: `loading`) | Exact `props[].name` as display name |
| `string` | `TEXT` | `default !== undefined ? String(default) : ''` | ✅ Always | `label`→`text/label.characters`, `title`→`text/title`, `placeholder`→`text/placeholder`, `helper`→`text/helper` | Create even when bind target missing (soft WARN) |
| `enum` | `VARIANT` | — | ❌ if axis key ∈ `variantMatrix` | N/A | WO-022 owns VARIANT; dedupe filter skips |
| `enum` | — | — | ❌ if axis ∉ matrix | N/A | Doc-only v1 |
| `node` | `INSTANCE_SWAP` | component node id string when registry resolves | ✅ If default resolvable | `icon`→`icon-slot/center.mainComponent`; leading/trailing via implicit flags | Skip + WARN when no default component |
| `number` | — | — | ❌ v1 | — | Ticket out-of-scope |

---

## Wrong vs correct (lift drift guard)

| Wrong | Correct |
| ----- | ------- |
| Call `addComponentProperty(..., 'VARIANT', ...)` after `combineAsVariants` | VARIANT axes owned by WO-022; WO-024 **validates** only via `variantPropsValidate.ts` |
| Add properties on ComponentSet root only | Iterate every variant `ComponentNode` in `componentSet.children` (legacy composed.mcp.js L425–489) |
| Lift full `component-*.mcp.js` doc pipeline | Port property loop only — no usage cards, no matrix specimen |
| Re-run `combineAsVariants` to fix matrix drift | Audit FAIL `comp/variant-matrix-match`; do not repair by re-scaffolding |
| Use bare prop name in `componentPropertyReferences` | Use suffixed key returned from `addComponentProperty` (e.g. `"loading#4:0"`) |
| Import bindings from WO-023 before merge | Prefer `resolveBindingTarget` export from WO-023; local duplicate only if WO-023 not merged |

---

**Implicit archetype props (Title Case display names — legacy §3.3.2):**

| Flag condition | Figma display name | Type | Default | Bind target |
| -------------- | ------------------ | ---- | ------- | ----------- |
| `componentProps.label === true` | `Label` | `TEXT` | first `text/label` characters in variant | `text/label.characters` |
| `componentProps.leadingIcon === true` && `iconSlots.leading === true` | `Leading icon` | `BOOLEAN` | `true` | `icon-slot/leading.visible` |
| `componentProps.trailingIcon === true` && `iconSlots.trailing === true` | `Trailing icon` | `BOOLEAN` | `false` | `icon-slot/trailing.visible` |
| icon registry default resolved | *(slot-specific INSTANCE_SWAP)* | `INSTANCE_SWAP` | resolved component id | `icon-slot/{leading\|trailing\|center}.mainComponent` |

**Doc-only skip list (`DOC_ONLY_PROP_NAMES`):** `className`, `class`, `style`, `asChild`, `type`, `ref`, `key`, `children` — no `addComponentProperty` call.

**Matrix dedupe rule:** if `props[].name` equals any key in `spec.variantMatrix`, skip that prop entry (VARIANT already exists from WO-022).

---

## Module tree (greenfield)

```
src/core/components/scaffold/
├── index.ts                    # re-export scaffold pipeline (WO-022 wires applyProperties after applyBindings)
├── types.ts                    # ApplyPropertiesResult, PropApplyFailure, VariantValidationResult
├── applyProperties.ts          # orchestrator — WO-024 entry
├── propFilter.ts               # filterPropsForApply, buildImplicitPropPlan
├── propTypeMap.ts              # mapSpecPropToFigma, coerceDefault
├── propBindings.ts             # PROP_NODE_BINDINGS + wireComponentPropertyReferences
├── variantPropsValidate.ts     # validateVariantProperties
├── resolveBindingTarget.ts     # shared with WO-023 (import or co-locate)
├── listVariantComponents.ts    # shared helper — children filter type COMPONENT
└── __fixtures__/
    └── component-spec-button-chip.v1.json
tests/unit/core/components/scaffold/
├── propFilter.test.ts
├── propTypeMap.test.ts
├── propBindings.test.ts
├── variantPropsValidate.test.ts
└── applyProperties.test.ts
tests/integration/core/components/scaffold/
└── applyProperties.integration.test.ts
src/core/audit/rules/
└── componentRules.ts           # S9.5–S9.9 + comp/variant-matrix-match
```

---

## Lift map (DesignOps → Figmint)

| Legacy source | Figmint target | Action |
| ------------- | -------------- | ------ |
| `create-component/conventions/01-config-schema.md` §3.3 | `propFilter.ts`, `propBindings.ts` | Port element prop semantics + soft-fail |
| `create-component/shadcn-props.schema.json` | `propFilter.ts` | Reference prop shapes; consume normalized contract only |
| `create-component/shadcn-props/button.json` | `__fixtures__/component-spec-button-chip.v1.json` | Chip button fixture — **not** CSS-selector fixture |
| `canvas-templates/bundles/component-composed.mcp.js` L425–489 | `applyProperties.ts` | Per-variant `addComponentProperty` + references sequence |
| `create-component/conventions/06-audit-checklist.md` S9.5–S9.9 | `componentRules.ts` | Audit rules for component scope |

**Drift guard:** do **not** lift doc pipeline (`buildPropertiesTable`, matrix specimen grid, usage cards) — those belong to WO-025+. Do **not** open multiple `*.mcp.js` bundles in one session.

---

## Steps

- [x] **Step 1** — Create canonical integration fixture `src/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json`:
  - Content locked from research §8 (chip archetype, `variant` + `size` matrix, `loading`/`disabled` booleans, `componentProps` + `iconSlots` flags, empty `bindings[]`).
  - **Done when:** file exists; `JSON.parse` succeeds in a smoke test; matches research fixture byte-for-byte on required fields.

- [x] **Step 2** — Implement `src/core/components/scaffold/propFilter.ts`:
  - Export `DOC_ONLY_PROP_NAMES: readonly string[]` (names above).
  - Export `filterPropsForApply(spec: ComponentSpecV1): ComponentSpecProp[]`:
    - Remove props whose `name` is in `DOC_ONLY_PROP_NAMES`.
    - Remove props whose `name` is a key in `spec.variantMatrix`.
    - Remove props with `type === 'number'`.
    - Remove props with `type === 'enum'` (all enum → matrix or doc-only v1).
    - Dedupe by `name` (first wins).
  - Export `buildImplicitPropPlan(spec: ComponentSpecV1): ImplicitPropPlan[]` returning planned implicit props (Label, Leading icon, Trailing icon) gated on `componentProps` + `iconSlots` flags; skip implicit `Label` when explicit `props[]` already contains `name: 'label'`.
  - **Done when:** `tests/unit/core/components/scaffold/propFilter.test.ts` passes matrix dedupe, doc-only skip, number skip, implicit gating, label collision.

- [x] **Step 3** — Implement `src/core/components/scaffold/propTypeMap.ts`:
  - Export `mapSpecPropToFigma(prop: ComponentSpecProp): { figmaType: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP'; defaultValue: string | boolean } | null`.
  - Export `coerceBooleanDefault(default?: string | number | boolean): boolean` and `coerceTextDefault(...)`.
  - `node` type returns `INSTANCE_SWAP` only when caller supplies resolved component id; otherwise `null`.
  - **Done when:** `tests/unit/core/components/scaffold/propTypeMap.test.ts` covers boolean/string/node/null-number paths per mapping table.

- [x] **Step 4** — Implement `src/core/components/scaffold/types.ts` + `applyProperties.ts` orchestrator skeleton:
  - Types (ES2017-safe — no `?.` / `??` in plugin-facing modules):

```ts
export interface PropApplyFailure {
  variantName: string;
  propName: string;
  message: string;
}

export interface VariantAxisValidation {
  ok: boolean;
  expected: string[];
  actual: string[];
}

export interface ApplyPropertiesResult {
  ok: boolean;
  propKeys: Record<string, string>; // logicalName → suffixed Figma key e.g. "loading#4:0"
  variantAxes: Record<string, VariantAxisValidation>;
  failures: PropApplyFailure[];
  implicitProps: string[];
}

export function applyProperties(
  spec: ComponentSpecV1,
  componentSet: ComponentSetNode,
): ApplyPropertiesResult;
```

  - Pre-check: if `componentSet.remote === true`, return `{ ok: false, failures: [{ variantName: '*', propName: '*', message: 'read-only library component' }], ...empty }`.
  - Call `filterPropsForApply`, `buildImplicitPropPlan`, then delegate to Steps 5–7 helpers.
  - **Done when:** `applyProperties.ts` compiles; exports match signature; empty spec returns `{ ok: true }` with empty maps on mock set.

- [x] **Step 5** — Implement `src/core/components/scaffold/variantPropsValidate.ts`:
  - Export `validateVariantProperties(componentSet: ComponentSetNode, matrix: ComponentSpecV1['variantMatrix']): Record<string, VariantAxisValidation>`.
  - For each axis key in `matrix`, find VARIANT def where `def.type === 'VARIANT'` and property name (without `#` suffix) equals axis key.
  - Compare `variantOptions` to matrix values stringified (`boolean` axes → `'true'` / `'false'`).
  - **Do not** call `addComponentProperty` with type `VARIANT`.
  - **Done when:** `tests/unit/core/components/scaffold/variantPropsValidate.test.ts` passes match/mismatch/missing-axis cases.

- [x] **Step 6** — Implement per-variant `addComponentProperty` in `applyProperties.ts`:
  - Add `listVariantComponents(set: ComponentSetNode): ComponentNode[]` in `listVariantComponents.ts` — filter `set.children` where `child.type === 'COMPONENT'`.
  - For **each** variant in `listVariantComponents(componentSet)`:
    - For each filtered explicit prop + each implicit prop plan entry:
      - Resolve Figma type + default via `mapSpecPropToFigma` / implicit plan.
      - `const propKey = variant.addComponentProperty(displayName, figmaType, defaultValue)` inside try/catch.
      - On throw: `pluginLog('[applyProperties] prop add failed', { variant: variant.name, prop: displayName, message })`, push to `failures`, **continue** (soft-fail per variant — legacy §3.3.3).
      - On success: store `propKeys[logicalName] = propKey` (last successful variant wins for set-level key; keys should match across variants).
  - Aggregate rule: if **all** variants fail for a given prop name, set `ok: false`.
  - **Done when:** unit test with mock `ComponentNode.addComponentProperty` verifies iteration count = `variants × props`; suffixed key captured.

- [x] **Step 7** — Implement `src/core/components/scaffold/propBindings.ts`:
  - Export `PROP_NODE_BINDINGS` map (research §5): keys `label`, `title`, `placeholder`, `helper`, `leadingIcon`, `trailingIcon`, `icon` → `{ nodePath, ref: 'characters' | 'visible' | 'mainComponent' }`.
  - Export `wireComponentPropertyReferences(variant: ComponentNode, propKey: string, binding: PropNodeBinding): { ok: boolean; reason?: string }`:
    - Resolve node via `resolveBindingTarget(variant, nodePath)` (reuse WO-023 walker or duplicate minimal ES2017-safe copy if WO-023 not merged).
    - Set `node.componentPropertyReferences = Object.assign({}, node.componentPropertyReferences || {}, { [ref]: propKey })`.
    - Missing node → return `{ ok: false }` without throwing; caller records WARN-level audit hint.
  - Wire implicit props using Title Case names; explicit props use convention map keyed by `props[].name`.
  - Unbound booleans (e.g. `loading`) — property created, no reference required for AC.
  - **Done when:** `tests/unit/core/components/scaffold/propBindings.test.ts` asserts `loading` unbound, `label` binds `characters`, icon binds `visible`.

- [x] **Step 8** — Wire pipeline caller (depends on WO-022 `scaffold()` + WO-023 `applyBindings()` landing):
  - In `src/core/components/scaffold/index.ts` (or WO-022 orchestrator), export sequence:

```ts
// After WO-022 scaffold + WO-023 applyBindings exist:
const set = scaffold(spec, options);
const bindingsResult = applyBindings(spec, set);
const propsResult = applyProperties(spec, set);
```

  - `applyProperties` **must** run only after `applyBindings` completes successfully enough that layer tree exists (bindings soft-fail is OK; missing tree is not).
  - Log via `pluginLog('[scaffold] applyProperties', { ok: propsResult.ok, propCount: Object.keys(propsResult.propKeys).length })`.
  - **Done when:** grep `applyBindings` immediately before `applyProperties` in scaffold index; no call order inversion in repo.

- [x] **Step 9** — Extend component audit scope `src/core/audit/rules/componentRules.ts`:
  - Add rules (lift S9.5–S9.9 + new matrix rule):

| ruleId | Severity | Pass condition |
| ------ | -------- | -------------- |
| `comp/prop-label-text` | error | When implicit/explicit Label planned, TEXT def exists |
| `comp/prop-leading-icon-boolean` | error | When leading icon flags set, BOOLEAN `"Leading icon"` exists |
| `comp/prop-trailing-icon-boolean` | error | When trailing icon flags set, BOOLEAN `"Trailing icon"` exists |
| `comp/prop-add-zero-failures` | error | `ApplyPropertiesResult.failures.length === 0` OR at least one prop succeeded per logical name |
| `comp/variant-matrix-match` | error | All `variantAxes[axis].ok === true` |
| `comp/prop-bind-target-missing` | warn | Binding attempted but node path missing |

  - Extend `runAudit` overload for `scope: 'component'` accepting `{ spec, componentSet, applyPropertiesResult }`.
  - **Done when:** `tests/unit/audit/runAudit.test.ts` (or new `componentRules.test.ts`) covers pass/fail for matrix mismatch + prop failures.

- [x] **Step 10** — Implement `resolveBindingTarget.ts` (if not exported by WO-023):
  - Slash-separated path walker from variant root: `text/label`, `icon-slot/leading`, etc.
  - Match WO-022 layer naming contract.
  - **Done when:** shared import from WO-023 **or** local copy passes same unit cases as WO-023 plan specifies.

- [x] **Step 11** — Mock factory for integration tests `tests/integration/core/components/scaffold/mockComponentSet.ts`:
  - Build in-memory tree: `ComponentSetNode` with N variant `ComponentNode` children, nested `text/label` TextNode, `icon-slot/leading` FrameNode.
  - Stub `addComponentProperty` returning `"${name}#mock:0"`.
  - Pre-seed VARIANT defs on set for matrix validation tests (simulating post-WO-022 state).
  - **Done when:** factory used by Steps 12–16 without Figma sandbox.

- [x] **Step 12** — Unit test `tests/unit/core/components/scaffold/applyProperties.test.ts`:
  - Case: single boolean `loading` → `propKeys.loading` suffixed; `componentPropertyDefinitions` mock receives BOOLEAN default `false`.
  - Case: soft-fail — first variant throws, second succeeds → `ok: true`, one failure logged.
  - Case: all variants throw for one prop → `ok: false`.
  - **Done when:** all cases pass under Vitest.

- [x] **Step 13** — Integration test: VARIANT validation AC:
  - Mock set with VARIANT defs `variant` + `size` matching chip fixture matrix.
  - Run `applyProperties(chipSpec, mockSet)`.
  - Assert `variantAxes.variant.ok && variantAxes.size.ok`.
  - Assert **no** `addComponentProperty` call with type `'VARIANT'`.
  - **Done when:** test passes; spy confirms zero VARIANT adds.

- [x] **Step 14** — Integration test: binding conventions:
  - Spec with `props: [{ name: 'loading', type: 'boolean', default: false }]` + implicit label/icons from chip fixture.
  - Assert BOOLEAN `loading` created without `componentPropertyReferences`.
  - Assert `Label` TEXT references `text/label.characters`.
  - Assert `Leading icon` / `Trailing icon` BOOLEAN reference `visible` on icon slots.
  - **Done when:** ticket AC #1 + integration AC satisfied in `applyProperties.integration.test.ts`.

- [x] **Step 15** — Audit integration test:
  - Feed failing `ApplyPropertiesResult` (all variants failed) into `runAudit('component', ...)`.
  - Assert `comp/prop-add-zero-failures` fails; matrix mismatch fails `comp/variant-matrix-match`.
  - **Done when:** audit `passed === false` with expected ruleIds.

- [x] **Step 16** — CI gate:
  - Run `npm run typecheck && npm run lint && npm run test -- tests/unit/core/components/scaffold tests/integration/core/components/scaffold tests/unit/audit`.
  - **Done when:** all commands exit 0; line coverage on `applyProperties.ts` ≥ core paths (filter, map, per-variant add, validate).

- [ ] **Step 17** — **Deferred (SPK-024-3):** manual Plugin Sandbox VQA not run in this build session; `forwardScaffold()` pipeline ready for `/vqa`.
  - In Plugin Sandbox (`file_key=cVdPraIafWFBRZnzMPhtrW`), run full pipeline on chip Button spec.
  - Designer panel shows BOOLEAN `loading` default false; VARIANT axes `variant` + `size`; TEXT `Label`; BOOLEAN icon toggles.
  - Record pass/fail in ticket research or VQA note.
  - **Done when:** documented PASS or explicit deferral comment in PR if WO-022 not merged at build time.

---

## Build Agents

### Phase 1 (parallel — no WO-022/WO-023 code required)

- `code-build` — Steps 1–3, 10–11: fixture, `propFilter.ts`, `propTypeMap.ts`, binding target walker, mock factory

### Phase 2 (parallel — after Phase 1)

- `code-build` — Steps 4–7, 12: `types.ts`, `applyProperties.ts` orchestrator, `variantPropsValidate.ts`, `listVariantComponents.ts`, `propBindings.ts`, unit tests

### Phase 3 (sequential — requires WO-022 scaffold + WO-023 applyBindings merged)

- `code-build` — Steps 8, 13–14: pipeline wire + integration tests against real scaffold exports

### Phase 4 (parallel — after Phase 2)

- `code-build` — Steps 9, 15: `componentRules.ts` + audit tests

### Phase 5 (after Phase 3–4)

- `code-build` — Steps 16–17: CI gate + manual VQA spike when WO-022 available

---

## Dependencies & Tools

| Dependency | Role | Blocker? |
| ---------- | ---- | -------- |
| WO-022 `scaffold()` | Produces `ComponentSetNode`, variant names, layer tree, VARIANT defs via `combineAsVariants` | Phase 3 pipeline wire; SPK-024-3 VQA |
| WO-023 `applyBindings()` | Runs **before** `applyProperties`; may export `resolveBindingTarget` | Phase 3 ordering; Step 10 import |
| WO-010 `runAudit` | Extend `scope: 'component'` | Phase 4 |
| WO-003 `@detroitlabs/figmint-contracts` | `ComponentSpecV1`, `ComponentSpecProp` | Phase 1 |
| WO-025 usage frame | Consumes `ApplyPropertiesResult.propKeys` | Downstream — not built here |
| WO-027 Components tab | Imports `applyProperties` from `applyProperties.ts` (not `properties.ts`) | Downstream |

**Tools:** Vitest (unit + integration), TypeScript strict, `pluginLog()` for main-thread logging (never `console.debug` in `code.js`).

**Figma Plugin API references:**

- [ComponentNode.addComponentProperty](https://developers.figma.com/docs/plugins/api/ComponentNode/#addcomponentproperty)
- [componentPropertyDefinitions](https://developers.figma.com/docs/plugins/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/)

**MCP:** Optional Figma sandbox for Step 17 only (`plugin-figma-figma` + `/figma-use` skill).

---

## Open Questions

| # | Question | Status |
| - | -------- | ------ |
| OQ-1 | Unbound booleans default bind target in v1? | **RESOLVED — no**; AC requires property existence only |
| OQ-2 | Title Case for implicit vs exact name for `props[]`? | **RESOLVED — legacy Title Case implicit; exact spec names for explicit** |
| OQ-3 | Live SPK-024-3 timing | **Deferred** to Step 17 after WO-022 merge |
| OQ-4 | Import `resolveBindingTarget` from WO-023 vs local duplicate? | **RESOLVED — prefer WO-023 export; local copy only if WO-023 not merged at build time** |

---

## Notes

- **ES2017:** All files under `src/core/components/scaffold/` and `src/core/audit/rules/componentRules.ts` must avoid optional chaining, nullish coalescing, and `replaceAll` — Figma main-thread sandbox target (`memory.md`).
- **Suffixed keys:** Store returned key from `addComponentProperty` (e.g. `"loading#4:0"`) in `propKeys`; never use bare display name in `componentPropertyReferences` or future `setProperties` (WO-025).
- **VARIANT ownership:** WO-022 `combineAsVariants` is the sole VARIANT author. WO-024 validation failure should surface in `variantAxes` and audit `comp/variant-matrix-match` — do not attempt repair by adding VARIANT props.
- **Per-variant pattern rationale:** Set-root-only `addComponentProperty` without per-variant iteration breaks reference wiring to nested layers inside each variant master (legacy L425–489).
- **Soft-fail semantics:** Match legacy §3.3.3 — log, collect failure, continue; aggregate `ok: false` only when a property fails on every variant.
- **Research bibliography:** `research/component-property-definitions.md` — decisions D1–D10 locked; do not re-investigate during build.
- **Plan quality bar:** `.github/templates/plan-quality-bar.md`

## Notes

- **Build (2026-05-28):** Replaced WO-024 `applyProperties` stub with full orchestrator. Pipeline wired via existing `forwardScaffold()` (`applyBindings` → `applyProperties` → `buildUsageFrame`). `resolveBindingTarget` delegates to WO-023 `resolveNodeByPath`. Component audit rules merged into `runAudit('component')` alongside binding rules.
- **Tests:** 104 passed / 1 skipped in scaffold + audit scope (`npx vitest run tests/unit/core/components/scaffold tests/integration/core/components/scaffold/applyProperties.integration.test.ts tests/unit/audit/componentRules.test.ts`).
- **Step 17:** SPK-024-3 sandbox VQA deferred to `/vqa`.

## References

- Ticket: `./ticket.md`
- Research: `./research/component-property-definitions.md`
- Upstream WO-023 research: `../WO-023-variable-bindings-application/research/variable-bindings-application.md`
- PRD: `Docs/PRD.md` §6.2 FR-SCAF-4, §8.3
- Lift: `DesignOps-plugin/skills/create-component/conventions/01-config-schema.md` §3.3
- Lift: `DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-composed.mcp.js` L425–489
