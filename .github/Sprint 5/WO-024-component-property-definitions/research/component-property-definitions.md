# Component property definitions — WO-024 research

> **Status:** ✅ Research complete — prop type mapping, `applyProperties` API, binding conventions, and pipeline order locked for `/plan`.
> **Date:** 2026-05-28
> **Owner:** WO-024 (Sprint 5)
> **PRD anchors:** §6.2 FR-SCAF-4, §8.3 `component-spec.v1` (`props[]`, `variantMatrix`)
> **Primary lift:** `DesignOps-plugin/skills/create-component/conventions/01-config-schema.md` §3.3 + `shadcn-props.schema.json` / `shadcn-props/button.json`
> **Upstream:** WO-022 (ComponentSet + variant matrix), WO-023 (bindings before props — pipeline order)

---

## Summary

WO-024 adds a **post-bindings pass** that materializes Figma **component property definitions** on a scaffolded `ComponentSetNode` from `ComponentSpecV1.props[]`, plus **implicit element properties** derived from archetype flags (`componentProps`, `iconSlots`). Variant-axis properties (`VARIANT`) are **not authored here** — they are created automatically when WO-022 calls `figma.combineAsVariants` with `axis=value` variant names. WO-024 **validates** those VARIANT definitions against `spec.variantMatrix` and adds the remaining BOOLEAN / TEXT / INSTANCE_SWAP properties.

**Locked recommendation:** implement `src/core/components/scaffold/applyProperties.ts` as a deterministic orchestrator that (1) receives a `ComponentSetNode` + `ComponentSpecV1`, (2) **filters** `props[]` to exclude doc-only and matrix-duplicated entries, (3) **iterates every variant `ComponentNode`** under the set and calls `addComponentProperty` with identical display names (Figma merges them into set-level definitions — legacy-proven pattern), (4) sets `componentPropertyReferences` on named layers when a binding convention matches, and (5) returns `ApplyPropertiesResult` for component-scope audit (extend WO-010 rules S9.5–S9.9).

**Critical API fact (retrieved 2026-05-28):** `addComponentProperty` returns a suffixed key (`"Label#4:0"`) that must be stored and used in `componentPropertyReferences` and `setProperties` — never the bare display name. BOOLEAN / TEXT / INSTANCE_SWAP property names in `componentPropertyDefinitions` include the `#id` suffix; VARIANT properties do not.

**Pipeline order:** `scaffold()` (WO-022) → `applyBindings()` (WO-023) → **`applyProperties()` (WO-024)** → usage frame (WO-025). Properties run after bindings so text nodes and icon slots exist for reference wiring.

---

## Key Findings

### 1. Contract — `ComponentSpecProp` vs legacy `properties[]` tuples

**Evidence:** `packages/contracts/src/componentSpec.v1.ts` L3–10:

```ts
export type ComponentSpecPropType = 'string' | 'number' | 'boolean' | 'enum' | 'node';

export interface ComponentSpecProp {
  name: string;
  type: ComponentSpecPropType;
  default?: string | number | boolean;
  enum?: (string | number | boolean)[];
}
```

**Legacy lift:** `shadcn-props.schema.json` `$defs/componentEntry.properties` is an **untyped array** (doc-table rows). Per-component JSON (e.g. `shadcn-props/button.json`) stores **5-tuples** `[name, type, default, required, description]` for the Properties + Types doc table — not Figma API calls directly.

| Legacy tuple column | FigHub contract field | Notes |
| ------------------- | ---------------------- | ----- |
| `[0]` name | `name` | kebab-case or camelCase preserved |
| `[1]` type | `type` | legacy allows `"enum"`, `"boolean"`, `"string"`, union strings like `"button" \| "submit"` |
| `[2]` default | `default` | legacy uses JSON-ish strings (`"false"`, `"\"default\""`) — normalize at apply time |
| `[3]` required | *(absent)* | doc-only; defer |
| `[4]` description | *(absent)* | ticket out-of-scope |

**Importer rule (FR-IMP-4):** enum props become variant matrix axes; booleans become boolean props. WO-024 consumes the **normalized** contract, not raw tuples.

### 2. Two property sources — matrix VARIANT vs explicit props

| Source | Figma type | Created by | WO-024 action |
| ------ | ---------- | ---------- | ------------- |
| `variantMatrix` axis keys (`variant`, `size`, `disabled`, …) | `VARIANT` | WO-022 `combineAsVariants` naming (`variant=primary, size=md`) | **Validate** only — assert `componentPropertyDefinitions[axis].variantOptions` matches matrix values |
| `props[]` with `type: 'boolean'` | `BOOLEAN` | WO-024 `addComponentProperty` | Create + optional bind |
| `props[]` with `type: 'string'` | `TEXT` | WO-024 | Create when bind target exists; else skip or create unbound |
| `props[]` with `type: 'node'` | `INSTANCE_SWAP` | WO-024 | Create when default component id resolvable |
| `props[]` with `type: 'enum'` **matching matrix key** | `VARIANT` | Already from matrix | **Skip** — dedupe |
| `props[]` with `type: 'enum'` **not in matrix** | — | — | **Skip Figma property** (doc-only until matrix extended) |
| `props[]` with `type: 'number'` | — | — | **Skip Figma property** v1 (no numeric component property type) |
| `componentProps.label` flag (archetype) | `TEXT` `"Label"` | WO-024 implicit | Create + bind `text/label.characters` |
| `componentProps.leadingIcon` + `iconSlots.leading` | `BOOLEAN` `"Leading icon"` | WO-024 implicit | Bind `icon-slot/leading.visible` |
| `componentProps.trailingIcon` + `iconSlots.trailing` | `BOOLEAN` `"Trailing icon"` | WO-024 implicit | Bind `icon-slot/trailing.visible` |
| Icon pack / registry default | `INSTANCE_SWAP` | WO-024 implicit | Bind `icon-slot/*.mainComponent` when `DEFAULT_ICON` resolved |

**Ticket AC mapping:**

- `props: [{ name: 'loading', type: 'boolean', default: false }]` → `addComponentProperty('loading', 'BOOLEAN', false)` on each variant; **no binding required for AC** (property appears in panel; designer or WO-025 usage frame may bind later).
- Variant matrix axes → already `VARIANT` after WO-022; WO-024 integration test asserts `componentPropertyDefinitions.variant.type === 'VARIANT'`.

### 3. Figma Plugin API — `addComponentProperty` sequence

**Official docs (retrieved 2026-05-28):**

- [ComponentNode — addComponentProperty](https://developers.figma.com/docs/plugins/api/ComponentNode/#addcomponentproperty)
- [ComponentSetNode — addComponentProperty](https://developers.figma.com/docs/plugins/api/ComponentSetNode/#addcomponentproperty)
- [componentPropertyDefinitions](https://developers.figma.com/docs/plugins/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/)

**Supported types:** `'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT' | 'SLOT'`

**Restrictions (API):**

| Type | `defaultValue` | `options.preferredValues` | `options.description` |
| ---- | -------------- | ------------------------- | --------------------- |
| `BOOLEAN` | ✅ boolean | ❌ | ❌ |
| `TEXT` | ✅ string | ❌ | ❌ |
| `INSTANCE_SWAP` | ✅ component node id string | ✅ | ❌ |
| `VARIANT` | ❌ (options from variant names) | ❌ | ❌ |
| `SLOT` | ❌ | ✅ | ✅ |

**Copy-pasteable sequence (per variant component, before or after combine — legacy uses before):**

```ts
// 1. Add property — capture returned key
const propKey = variant.addComponentProperty('loading', 'BOOLEAN', false);

// 2. Link to child (optional but required for visible effect)
slotNode.componentPropertyReferences = {
  ...(slotNode.componentPropertyReferences || {}),
  visible: propKey,
};

// 3. After combine, read set-level defs
const defs = componentSet.componentPropertyDefinitions;
// defs['loading#12:3'].type === 'BOOLEAN'
// defs['loading#12:3'].defaultValue === false

// 4. On instances (WO-025 usage frame)
instance.setProperties({ [propKey]: true });
```

**Legacy lift evidence:** `component-composed.mcp.js` L425–489 — properties added on **each variant `ComponentNode`** inside `buildVariant`, with try/catch soft-fail (`__ccPropAddErrors`). Comments explicitly cite pre-`combineAsVariants` timing; after combine, set inherits merged definitions (L1393–1418 audit serialization).

**Ticket wording vs implementation:** ticket.md says "calls `addComponentProperty` on the ComponentSet". **Locked interpretation:** public API accepts `ComponentSetNode`; **implementation iterates `componentSet.children` (type `COMPONENT`)** and calls `addComponentProperty` on each — identical to legacy. Do **not** call only on the set root without per-variant binding passes.

**Valid `componentPropertyReferences` keys (Figma):**

| Key | Property type | Target node |
| --- | ------------- | ----------- |
| `characters` | `TEXT` | `TextNode` |
| `visible` | `BOOLEAN` | any `SceneNode` |
| `mainComponent` | `INSTANCE_SWAP` | `InstanceNode` |

### 4. Prop type mapping table (contract → Figma)

| `ComponentSpecPropType` | Figma `ComponentPropertyType` | Default coercion | Create property? | Binding convention |
| ----------------------- | ------------------------------- | ---------------- | ---------------- | ------------------ |
| `boolean` | `BOOLEAN` | `default ?? false` | ✅ Always | See §5; unbound allowed |
| `string` | `TEXT` | `String(default ?? '')` | ✅ If bind target OR name in `TEXT_PROP_NAMES` | `text/label` → `characters` when `name` is `label`, `title`, `placeholder`, `helper` |
| `enum` | `VARIANT` | — | ❌ if axis ∈ `variantMatrix` | N/A — WO-022 owns |
| `enum` | — | — | ❌ if axis ∉ matrix | Doc-only v1 |
| `node` | `INSTANCE_SWAP` | component id from registry | ✅ If resolvable | `icon-slot/leading`, `trailing`, `center` → `mainComponent` |
| `number` | — | — | ❌ v1 | Defer — no Figma numeric property |

**Implicit archetype props (from `ComponentSpecArchetypeConfig`):**

| Flag | Figma name | Type | Default | Bind |
| ---- | ---------- | ---- | ------- | ---- |
| `componentProps.label` | `Label` | `TEXT` | first label text in variant | `text/label.characters` |
| `componentProps.leadingIcon` | `Leading icon` | `BOOLEAN` | `true` | `icon-slot/leading.visible` |
| `componentProps.trailingIcon` | `Trailing icon` | `BOOLEAN` | `false` | `icon-slot/trailing.visible` |

Legacy display names use **Title Case with spaces** for element props (`"Leading icon"`) while spec `props[]` uses **exact `name`** from contract (`loading`, not `Loading`) — both patterns coexist; audit rules key off resolved definition keys.

### 5. Binding conventions — no selector field on `ComponentSpecProp`

Unlike `bindings[]` (WO-023), `props[]` has **no selector**. WO-024 uses a **fixed convention map** keyed by prop `name` + archetype layer tree (WO-022 contract):

```ts
/** Internal — not part of componentSpec.v1 */
const PROP_NODE_BINDINGS: Record<
  string,
  { nodePath: string; ref: 'characters' | 'visible' | 'mainComponent' }
> = {
  label: { nodePath: 'text/label', ref: 'characters' },
  title: { nodePath: 'text/title', ref: 'characters' },
  placeholder: { nodePath: 'text/placeholder', ref: 'characters' },
  helper: { nodePath: 'text/helper', ref: 'characters' },
  leadingIcon: { nodePath: 'icon-slot/leading', ref: 'visible' },
  trailingIcon: { nodePath: 'icon-slot/trailing', ref: 'visible' },
  icon: { nodePath: 'icon-slot/center', ref: 'mainComponent' },
};
```

**Resolution:** reuse WO-023 `resolveBindingTarget(variantRoot, nodePath)` walker (slash-separated layer names). If node missing → property still created (soft) + audit WARN `comp/prop-bind-target-missing`; if `addComponentProperty` throws → audit FAIL `comp/prop-add-failed` (legacy S9.9).

**Doc-only props (skip `addComponentProperty`):** names in `DOC_ONLY_PROP_NAMES`: `className`, `class`, `style`, `asChild`, `type`, `ref`, `key`, `children` — sourced from typical shadcn escape-hatch props in `button.json` properties table.

### 6. VARIANT validation — matrix ↔ `componentPropertyDefinitions`

After WO-022, each axis in `spec.variantMatrix` must appear as a VARIANT property:

```ts
function validateVariantProperties(
  componentSet: ComponentSetNode,
  matrix: ComponentSpecV1['variantMatrix'],
): VariantValidationResult {
  const defs = componentSet.componentPropertyDefinitions;
  // For each axis key, find def where def.type === 'VARIANT' && def.name === axis
  // variantOptions must equal matrix[axis] (stringified; boolean axes compare as 'true'/'false')
}
```

**Naming contract (WO-022):** variant component `name` = comma-separated `axis=value` pairs sorted by stable axis order from matrix key insertion order (locked in WO-022 plan). Figma derives VARIANT property options from distinct values across children.

**Boolean matrix axes** (e.g. `disabled: [false, true]`) produce VARIANT property `disabled` with options `false`, `true` — distinct from a separate BOOLEAN `props[]` entry named `disabled`. **Dedup rule:** if `disabled` ∈ `variantMatrix`, skip `props[]` entry `{ name: 'disabled', type: 'boolean' }`.

### 7. Error handling — soft vs hard (legacy)

**Lift:** `01-config-schema.md` §3.3.3 + `06-audit-checklist.md` S9.9:

- `addComponentProperty` throw → log via `pluginLog`, collect `{ variant, message }`, continue draw (legacy soft-fail).
- FigHub **default:** same soft-fail for individual variant, but **aggregate audit FAIL** if any variant failed and zero variants succeeded for that property name.
- Read-only file / library component → throw before apply; surface as op error to designer.

### 8. Testing strategy

| Test | Scope | Assert |
| ---- | ----- | ------ |
| Unit: type mapper | `mapSpecPropToFigma()` | boolean → BOOLEAN + default |
| Unit: filter | `filterPropsForApply()` | enum axis deduped; doc-only skipped |
| Unit: bind resolver | mock tree | `loading` unbound; `label` → text/label |
| Integration: loading AC | mock ComponentSet | `componentPropertyDefinitions` contains BOOLEAN default false |
| Integration: matrix AC | mock set with VARIANT defs | axes match `variantMatrix` |
| Integration: shadcn button | fixture below | Label + Leading icon + Trailing icon + variant + size |

**Canonical integration fixture** (replace `.button` CSS fixture):

```json
{
  "v": 1,
  "kind": "component-spec",
  "name": "Button",
  "framework": "react",
  "archetype": "chip",
  "variantMatrix": {
    "variant": ["default", "outline", "destructive"],
    "size": ["sm", "default", "lg"]
  },
  "props": [
    { "name": "disabled", "type": "boolean", "default": false },
    { "name": "loading", "type": "boolean", "default": false }
  ],
  "componentProps": { "label": true, "leadingIcon": true, "trailingIcon": true },
  "iconSlots": { "leading": true, "trailing": true, "size": 24 },
  "bindings": [],
  "layout": { "direction": "horizontal", "gap": "space/md", "sizing": { "horizontal": "hug", "vertical": "hug" } }
}
```

Path: `src/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json` (create in `/build`).

---

## Validated evidence

### Repo inventory

| File | Role |
| ---- | ---- |
| `packages/contracts/src/componentSpec.v1.ts` | `ComponentSpecProp`, `ComponentSpecPropType`, `variantMatrix`, `componentProps`, `iconSlots` |
| `src/io/formats/__fixtures__/component-spec-button.json` | **Not** scaffold input — CSS selectors; use new chip fixture |
| `src/core/components/scaffold/` | **Greenfield** — `applyProperties.ts`, `propBindings.ts`, `types.ts` (WO-024) |
| `src/core/components/scaffold/applyBindings.ts` | **Greenfield** WO-023 — shared node walker |
| `src/core/audit/runAudit.ts` | Extend `'component'` scope with prop rules |
| `DesignOps-plugin/.../01-config-schema.md` §3.3 | Element property semantics |
| `DesignOps-plugin/.../shadcn-props/button.json` | Reference prop names + `componentProps` flags |
| `DesignOps-plugin/.../component-composed.mcp.js` L425–489 | Reference `addComponentProperty` + references |
| `DesignOps-plugin/.../06-audit-checklist.md` S9.5–S9.9 | Audit rules to port |

### Official API / platform facts

| Fact | Source |
| ---- | ------ |
| `addComponentProperty(name, type, defaultValue, options?)` → suffixed key string | [ComponentNode](https://developers.figma.com/docs/plugins/api/ComponentNode/#addcomponentproperty) — 2026-05-28 |
| `VARIANT` properties have `variantOptions`; no defaultValue | Same + [componentPropertyDefinitions](https://developers.figma.com/docs/plugins/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/) |
| `componentPropertyReferences` required for property to affect nested layers | [Stack Overflow + Figma docs](https://stackoverflow.com/questions/77731926/figma-plugin-api-how-to-add-component-properties-to-component) — 2026-05-28 |
| Main thread: use `pluginLog()` not `console.debug` | `memory.md` |
| ES2017 target — no `?.` / `??` in `applyProperties.ts` | `memory.md` |

### Cross-ticket matrix

| Ticket | Interface / artifact | WO-024 consumes or produces |
| ------ | -------------------- | --------------------------- |
| WO-022 | `scaffold()` → `ComponentSetNode`, variant names, layer tree | **Consumes** set + tree; **requires** VARIANT axes from matrix |
| WO-023 | `applyBindings()`, node path walker | **Consumes** walker; runs **before** WO-024 |
| WO-010 | `runAudit`, `AuditReportV1` | **Produces** S9.5–S9.9 prop audit rules |
| WO-025 | Usage frame `setProperties` | **Consumes** returned prop keys |
| WO-041+ | Importers → `props[]` / `variantMatrix` | **Consumes** normalized spec |
| WO-003 | `ComponentSpecV1` contract | **Consumes** — no v2 fields |

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | ---------------------- |
| D1 | Per-variant `addComponentProperty`, not set-root only | Legacy-proven; bindings need variant child refs | Single call on `ComponentSetNode` without iteration |
| D2 | VARIANT props owned by WO-022; WO-024 validates | `combineAsVariants` creates VARIANT defs | Re-add VARIANT via API (duplicate / error) |
| D3 | Skip `props[]` enum when key ∈ `variantMatrix` | Avoid duplicate disabled/size/variant | Second VARIANT property |
| D4 | Skip doc-only prop names (`className`, `asChild`, …) | No Figma designer value | Create inert TEXT props |
| D5 | Skip `number` type for Figma v1 | No numeric component property in API | Coerce to TEXT |
| D6 | Implicit `componentProps` + `iconSlots` flags → element props | Parity with DesignOps chip/button | Require explicit props[] only |
| D7 | Exact `props[].name` as Figma display name | Matches AC (`loading`) | Title Case all names |
| D8 | Soft-fail per variant + aggregate audit | Legacy §3.3.3 + PRD no silent pass | Hard throw on first error |
| D9 | `ApplyPropertiesResult` returns `{ propKeys, variantValidation, failures }` | WO-025 + audit need keys | Void return |
| D10 | Pipeline: bindings → properties | WO-023 research D8 | Properties before bindings |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-024-0 | Repo grep: no `applyProperties` / scaffold dir | Greenfield confirmed | ✅ PASS (2026-05-28) |
| SPK-024-1 | Read Figma `addComponentProperty` + legacy composed bundle | Type list + suffixed key + references | ✅ PASS (2026-05-28) |
| SPK-024-2 | Cross-read WO-023 pipeline order | Properties after bindings | ✅ PASS |
| SPK-024-3 | Live sandbox: boolean `loading` on chip ComponentSet | Panel shows BOOLEAN default false | ☐ **Deferred to `/build` VQA** — requires WO-022 scaffold |

**Research-complete gate:** SPK-024-3 deferred until WO-022 lands (same pattern as SPK-023-3).

---

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| WO-022 variant naming ≠ matrix keys | High | Med | Shared `formatVariantName()` helper; validation in WO-024 |
| Duplicate prop: matrix axis + props[] boolean | Med | High | D3 dedup filter |
| `addComponentProperty` throws on read-only library | Med | Low | Pre-check `componentSet.remote`; fail op early |
| Implicit Label prop vs spec `label` string prop | Med | Med | Prefer explicit props[]; skip implicit if name collision |
| INSTANCE_SWAP without default component | Med | Med | Skip swap; audit WARN; placeholder slots unchanged |
| Unbound boolean props confuse designers | Low | Med | Document in usage frame (WO-025); optional bind map expansion |
| Ticket says ComponentSet-only API call | Low | High | D1 documents iteration; update ticket requirement wording |

---

## Recommendations

### For `/plan`

1. **Phase 1 — core module**
   - `src/core/components/scaffold/applyProperties.ts` — orchestrator
   - `src/core/components/scaffold/propFilter.ts` — dedupe + doc-only skip
   - `src/core/components/scaffold/propBindings.ts` — convention map + reference wiring
   - `src/core/components/scaffold/variantPropsValidate.ts` — matrix ↔ defs
   - `src/core/components/scaffold/types.ts` — `ApplyPropertiesResult`
2. **Phase 2 — audit** — extend WO-010 component rules: S9.5 Label TEXT, S9.6 icon BOOLEAN, S9.9 zero add failures, new `comp/variant-matrix-match`
3. **Phase 3 — tests** — unit mappers + integration with mock ComponentSet; chip button fixture
4. **Wire pipeline caller** (WO-022 `index.ts` or ops handler): `scaffold → applyBindings → applyProperties`
5. **Coordinate WO-022:** export `listVariantComponents(set)` helper shared with WO-023/024

### Locked API — `applyProperties.ts`

```ts
import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

export interface ApplyPropertiesResult {
  ok: boolean;
  propKeys: Record<string, string>; // logicalName → suffixed Figma key
  variantAxes: Record<string, { ok: boolean; expected: string[]; actual: string[] }>;
  failures: Array<{ variantName: string; propName: string; message: string }>;
  implicitProps: string[]; // 'Label', 'Leading icon', …
}

export function applyProperties(
  spec: ComponentSpecV1,
  componentSet: ComponentSetNode,
): ApplyPropertiesResult;
```

---

## Open questions

| # | Question | Status |
| - | -------- | ------ |
| OQ-1 | Should unbound booleans (`loading`) get a default bind target in v1? | **RESOLVED — no**; AC requires property existence only |
| OQ-2 | Title Case element props vs exact spec names for implicit flags? | **RESOLVED — legacy Title Case for implicit; exact for props[]** |
| OQ-3 | Live SPK-024-3 timing | **Deferred** until WO-022 build complete |

---

## References

- [ComponentNode — addComponentProperty](https://developers.figma.com/docs/plugins/api/ComponentNode/#addcomponentproperty) (retrieved 2026-05-28)
- [ComponentSetNode — addComponentProperty](https://developers.figma.com/docs/plugins/api/ComponentSetNode/#addcomponentproperty) (retrieved 2026-05-28)
- [componentPropertyDefinitions](https://developers.figma.com/docs/plugins/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/) (retrieved 2026-05-28)
- `Docs/PRD.md` §6.2 FR-SCAF-4, §8.3
- `DesignOps-plugin/skills/create-component/conventions/01-config-schema.md` §3.3
- `DesignOps-plugin/skills/create-component/shadcn-props.schema.json`
- `DesignOps-plugin/skills/create-component/shadcn-props/button.json`
- `.github/Sprint 5/WO-023-variable-bindings-application/research/variable-bindings-application.md` — pipeline order
- `.github/templates/research-quality-bar.md`
