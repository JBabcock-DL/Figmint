---
type: work-order
github_issue: 17
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JAc
---

## Goal

Encode the auto-layout gotchas + invariants from DesignOps-plugin's convention shards as a typed helper library in `src/core/canvas/helpers/`. Every canvas builder uses these helpers so the gotchas (e.g. `resize()` resetting sizing modes, matrix specimen counter-axis AUTO) disappear from prompt rules and become unit-tested functions.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-7.

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

1. `src/core/canvas/helpers/autoLayout.ts` — `resizeWithAutoLayout(node, w, h, sizing)` that calls `resize` then sets sizing modes correctly per `00-gotchas.md` §0.10.
2. `src/core/canvas/helpers/matrixSpecimen.ts` — counter-axis AUTO + minHeight per `03-auto-layout-invariants.md` §10–10.2.
3. `src/core/canvas/helpers/columnSpec.ts` — column widths + cell recipes from `10-column-spec.md`.
4. `src/core/canvas/helpers/buildOrder.ts` — table build-order rules from `11-cells-12-bindings-13-build-order.md`.
5. Every helper has unit tests asserting the rules.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/00-gotchas.md` §0.10 — resize/sizing ordering
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/08-hierarchy-and-09-autolayout.md` — counter-axis AUTO rules
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/10-column-spec.md`, `11-cells-12-bindings-13-build-order.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/03-auto-layout-invariants.md` §10–10.2 — matrix specimen rules
- **Dependencies:** WO-002

---

## Acceptance criteria _(definition of done)_

- [ ] Every canvas builder (WO-011, WO-012, WO-013) imports from these helpers — no inline `resize()` calls.
- [ ] Unit tests cover the resize-then-sizing ordering, counter-axis AUTO assertion, no-1px-masters rule.
- [ ] `tsc --noEmit` clean.

## Out of scope

- Component-specific auto-layout (Sprint 5 reuses these helpers).
- UI thread helpers (these are plugin-thread Figma API helpers only).

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

- Dependencies: WO-002.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-7
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/00-gotchas.md` §0.10 — resize/sizing ordering
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/08-hierarchy-and-09-autolayout.md` — counter-axis AUTO rules
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/10-column-spec.md`, `11-cells-12-bindings-13-build-order.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/03-auto-layout-invariants.md` §10–10.2 — matrix specimen rules
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
