---
type: work-order
github_issue: 26
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JLk
---

## Goal

Apply variable bindings to scaffolded components per the spec — `setBoundVariable` / `setBoundVariableForPaint` per the binding definitions in `ComponentSpecV1.bindings`. Implements FR-SCAF-3.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-3.

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

1. `src/core/components/scaffold/applyBindings.ts` — applies all bindings from a spec to the scaffolded component tree.
2. Supports: fill, stroke, radius, padding, gap, text-style bindings.
3. Resolves variable references by name → Variable node via `figma.variables.getLocalVariablesAsync()` (or equivalent).
4. Unbound selectors flagged in audit, not silent-failed.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/07-token-paths.md` — binding paths convention
- **Dependencies:** WO-022, WO-008

---

## Acceptance criteria _(definition of done)_

- [ ] A spec with 10 bindings applied to a scaffolded component leaves every selector bound to its variable.
- [ ] Missing variable references surface in audit as FAIL with the selector path.
- [ ] Integration test against a sample shadcn component spec.

## Out of scope

- Property definitions (WO-024).
- Token resolution from CSS classes (Sprint 8 token resolver).

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

- Dependencies: WO-022, WO-008.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-3
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/07-token-paths.md` — binding paths convention
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
