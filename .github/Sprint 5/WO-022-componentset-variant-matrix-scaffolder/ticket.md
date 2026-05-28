---
type: work-order
github_issue: 25
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JKg
blocked_by: WO-057
note: In-Figma /vqa Ship is gated on WO-057 doc-pipeline parity (2026-05-28 architectural lock).
---

## Goal

Implement the core component-scaffold engine: given a `ComponentSpecV1`, create a ComponentSet on the canvas with the full variant matrix (cross-product of variant axes). Port the multi-call canvas dance from DesignOps-plugin into a single deterministic function.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-1..2.

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

1. **`src/core/components/scaffold/index.ts`** — entry point: `scaffold(spec: ComponentSpecV1, target: PageNode, options?: ScaffoldOptions): Promise<ScaffoldResult>`. Single Plugin API orchestration replacing DesignOps five-call Step 6 (`cc-scaffold` → `cc-component-*` only — no doc-frame sections).
2. **`src/core/components/scaffold/variantMatrix.ts`** — expand `spec.variantMatrix` to full cross-product; Figma variant names = sorted axis keys as comma-separated `key=value` pairs (booleans → `"true"` / `"false"`).
3. **`src/core/components/scaffold/archetypes/`** — one module per `ComponentSpecLayoutArchetype`: `chip`, `container`, `control`, `field`, `rowItem`, `surfaceStack`, `tiny`, plus **`composed.ts`** when `spec.composes[]` is non-empty (not a layout enum). Port from `cc-arch-*.js` + chip inline `buildVariant` in `component-chip.mcp.js`; shared helpers in `archetypes/shared.ts`.
4. **Variant pipeline** — archetype builder per combo → hidden staging frame → `figma.combineAsVariants` → ComponentSet named `{spec.name} — ComponentSet` with HORIZONTAL+WRAP grid layout (legacy §6.6B order: resize then sizing modes).
5. **Layer naming contract** — inner nodes use DesignOps paths (`text/label`, `icon-slot/leading`, `state-layer/*`, `focus-ring`) for WO-023 selector grammar.
6. **Idempotency** — re-run with same spec replaces existing ComponentSet (match `pluginData` scaffold id or name); no duplicate sets.
7. **Hex fallback geometry only** — no variable binding in WO-022 (WO-023); optional `RegistryV1` read for composed child instances.
8. Uses **WO-014** helpers (`resizeThenApplySizing`, `createHugFrame`, `assertValidAxisAlign`, `assertNoOnePxMaster`).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-chip.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-composed.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-container.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-control.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-field.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-row-item.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-surface-stack.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-tiny.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/02-archetype-routing.md` — archetype dispatch logic
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/EXECUTOR.md` — step-by-step build pipeline
- **Dependencies:** WO-008, WO-014, WO-003

---

## Acceptance criteria _(definition of done)_

- [ ] A spec with 3 variant axes (3 × 2 × 2) produces a ComponentSet with 12 component children, correctly named per Figma convention.
- [ ] Each archetype passes its own integration test against a sample spec.
- [ ] Re-running with the same spec is idempotent.
- [ ] Audit (WO-010 / component-scaffold mode) reports cleanly.

## Out of scope

- Variable bindings (WO-023).
- Property definitions (WO-024).
- Usage frame (WO-025).
- Registry write (WO-026).

---

## Testing & verification

### Functional QA

- Vitest unit + integration tests cover the acceptance criteria above.

### Visual / design QA

- See ticket-level scope; most subsystem tickets have visual QA in their UI counterpart.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- Console.debug per major event; production telemetry deferred.

---

## Open bugs — integrated VQA _(2026-05-28; BUG-S5-002 resolved in code WO-057)_

**Register:** [designops-canvas-parity-bug-register.md](../research/designops-canvas-parity-bug-register.md)

| Bug ID | Summary |
| ------ | ------- |
| **BUG-S5-002** | **Resolved in code (WO-057)** — `assertNoCollapsedAxis` + `comp/doc-section-width` |
| **BUG-S5-007** | ComponentSet `finalizeComponentSet` default width 320 vs DesignOps 1640 WRAP grid |
| **BUG-S5-008** | Hidden staging `holder.resize(1,1)` — verify no leak |

Subsystem Figma VQA remains N/A, but **integrated forward-scaffold VQA fails** until geometry + audit fixes land (WO-025 / WO-027).

**Research spike:** **SPK-S5-AUD-1** — extend `comp/scaffold-one-px-master` to width axis + doc section probes.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket). **Integrated VQA:** see WO-027 + register BUG-S5-001..003.

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-008, WO-014, WO-003.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-1..2
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-chip.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-composed.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-container.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-control.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-field.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-row-item.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-surface-stack.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-tiny.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/02-archetype-routing.md` — archetype dispatch logic
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/EXECUTOR.md` — step-by-step build pipeline
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
- Research: [Component scaffold engine](research/component-scaffold-engine.md)
