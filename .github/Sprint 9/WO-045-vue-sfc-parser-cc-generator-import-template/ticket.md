---
type: work-order
github_issue: 48
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JfM
---

## Goal

Add Vue Single File Component support: parser (template + script setup + style block), Code Connect stub generator, ImportTemplate. Re-use the shared web token resolver (WO-042).

PRD anchors: `Docs/PRD.md` §12 Phase 4b.

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

1. `src/core/import/templates/vue.ts` — implements `ImportTemplate` for `.vue` SFCs.
2. `src/core/codeconnect/templates/vue.ts` — Vue Code Connect stub generator.
3. Uses Vue compiler (`@vue/compiler-sfc`) for AST.
4. Extends framework picker in Components tab to enable Vue.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-039, WO-040, WO-041, WO-042

---

## Acceptance criteria *(definition of done)*

- [ ] Parse a sample Vue Button.vue → ComponentSpecV1.
- [ ] Generate Vue Code Connect stub passing `npx figma connect validate`.
- [ ] End-to-end Vue import + CC PR works.

## Out of scope

- Vue Composition API quirks beyond standard patterns.

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

- Dependencies: WO-039, WO-040, WO-041, WO-042.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §12 Phase 4b
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
