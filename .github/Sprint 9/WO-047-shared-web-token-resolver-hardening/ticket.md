---
type: work-order
github_issue: 50
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jg0
---

## Goal

Generalize WO-042's token resolver beyond React: handle Vue scoped styles, Web Components Shadow DOM, and any future web-family quirks. Single resolver instance serves all web frameworks.

PRD anchors: `Docs/PRD.md` §6.9 FR-CONF-*.

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

1. Extract shared resolver logic into `src/core/import/shared/webTokenResolver.ts`.
2. Handle Vue `<style scoped>` blocks.
3. Handle WC Shadow DOM CSS.
4. Configuration override per-framework if needed.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-042, WO-045, WO-046

---

## Acceptance criteria *(definition of done)*

- [ ] Vue component using scoped styles resolves tokens correctly.
- [ ] WC component using Shadow DOM CSS resolves tokens correctly.
- [ ] React import (WO-041) still passes after refactor.

## Out of scope

- Native platform resolvers (Sprint 10 separate).

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

- Dependencies: WO-042, WO-045, WO-046.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.9 FR-CONF-*
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
