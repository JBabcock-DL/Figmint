---
type: work-order
github_issue: 27
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JMY
---

## Goal

Add component property definitions to the scaffolded ComponentSet per the spec's `props` field — Boolean, Text, Variant, and InstanceSwap types. Implements FR-SCAF-4.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-4.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. **`src/core/components/scaffold/applyProperties.ts`** — post-bindings pass: accepts `ComponentSpecV1` + scaffolded `ComponentSetNode`; iterates each variant `ComponentNode` and calls `addComponentProperty` with mapped Figma types; returns `ApplyPropertiesResult` with suffixed prop keys.
2. **VARIANT properties** — auto-created by WO-022 `combineAsVariants` from `variantMatrix` axes; WO-024 **validates** `componentPropertyDefinitions` match matrix keys/options (does not re-add VARIANT props).
3. **Explicit `props[]`** — after filter (dedupe matrix axes, skip doc-only names like `className`/`asChild`, skip `number` v1): map `boolean` → `BOOLEAN`, `string` → `TEXT`, `node` → `INSTANCE_SWAP`; apply defaults from spec.
4. **Implicit element props** — when `componentProps` / `iconSlots` flags set on spec: create `Label` (TEXT), `Leading icon` / `Trailing icon` (BOOLEAN), optional INSTANCE_SWAP on icon slots per legacy §3.3.2.
5. **Binding** — set `componentPropertyReferences` on named layers (`text/label`, `icon-slot/*`) via convention map; unbound booleans (e.g. `loading`) still satisfy AC.
6. **Pipeline order** — caller runs `scaffold()` → `applyBindings()` (WO-023) → **`applyProperties()`** → usage frame (WO-025).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/01-config-schema.md` — §3.3 element component properties
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/shadcn-props.schema.json` — archetype + `componentProps` shape
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-composed.mcp.js` L425–489 — reference `addComponentProperty` sequence
- **Dependencies:** WO-022 (ComponentSet + layer tree), WO-023 (bindings before props)
- **Audit:** extend WO-010 component scope — rules S9.5–S9.9 + variant-matrix validation (see research decision log)

---

## Acceptance criteria _(definition of done)_

- [ ] A spec with `props: [{ name: 'loading', type: 'boolean', default: false }]` results in a Boolean component property on the ComponentSet with default false.
- [ ] Variant matrix axes appear as Variant properties (auto-derived by WO-022; validated by WO-024).
- [ ] Integration test against canonical chip Button fixture (`component-spec-button-chip.v1.json` per research) including implicit Label + icon BOOLEAN props when flags set.
- [ ] `ApplyPropertiesResult` surfaces failures for audit; soft-fail per variant matches legacy §3.3.3.

## Out of scope

- Instance-level prop overrides (designer authors those manually).
- Property descriptions (cosmetic; defer).
- `SLOT` type properties (API exists; defer until compose slots ticket).
- Doc-only props (`className`, `type`, `asChild`, …) — no Figma property created.
- `number` spec props → Figma properties (no API type v1).

---

## Testing & verification

### Functional QA

- Vitest unit tests: prop type mapper, filter/dedupe, binding convention resolver, variant validation.
- Integration tests with mock `ComponentSetNode` trees cover acceptance criteria above.

### Visual / design QA

- See ticket-level scope; most subsystem tickets have visual QA in their UI counterpart.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- `pluginLog()` per major event (not `console.debug` on main thread); production telemetry deferred.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- ✅ Complete — see [component-property-definitions.md](research/component-property-definitions.md)

## 📋 Ready for `/plan`

- Dependencies: WO-022, WO-023.
- Research locks API, type mapping, pipeline order, and audit rules — `/plan` should produce ≥200-line execution contract.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-4, §8.3
- Research: [Component property definitions](research/component-property-definitions.md)
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/01-config-schema.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/shadcn-props.schema.json` — source of prop shapes
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-composed.mcp.js` — `addComponentProperty` reference
- Upstream research: `.github/Sprint 5/WO-023-variable-bindings-application/research/variable-bindings-application.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
