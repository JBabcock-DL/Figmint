---
type: work-order
github_issue: 25
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JKg
---

## Goal

Implement the core component-scaffold engine: given a `ComponentSpecV1`, create a ComponentSet on the canvas with the full variant matrix (cross-product of variant axes). Port the multi-call canvas dance from DesignOps-plugin into a single deterministic function.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-1..2.

---

## Problem story

*Derived from Goal — see ticket-level scope.*

## User stories

- [ ] *See Requirements section below.*

## Design reference *(when UI work applies)*

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/core/components/scaffold/index.ts` — entry point: `scaffold(spec: ComponentSpecV1, target: PageNode): ScaffoldResult`.
2. `src/core/components/scaffold/archetypes/` — per-archetype implementations: chip, composed, container, control, field, row-item, surface-stack, tiny. Ports from DesignOps-plugin `component-*.mcp.js` bundles.
3. Variant matrix: cross-product of variant axes from spec; each cell is a Component child of the ComponentSet.
4. Uses auto-layout helpers (WO-014).

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

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

## Acceptance criteria *(definition of done)*

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

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

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
