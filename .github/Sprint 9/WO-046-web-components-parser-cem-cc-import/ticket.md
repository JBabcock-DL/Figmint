---
type: work-order
github_issue: 49
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jfw
---

## Goal

Add Web Components support: parser reads Custom Elements Manifest (`custom-elements.json` per CEM spec), Code Connect stub generator, ImportTemplate.

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

1. `src/core/import/templates/webcomponents.ts` — implements `ImportTemplate` reading CEM data.
2. `src/core/codeconnect/templates/webcomponents.ts` — WC Code Connect stub generator.
3. Detects `customElements.define` in source files when no CEM available.
4. Extends framework picker to enable Web Components.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-039, WO-040, WO-041, WO-042

---

## Acceptance criteria *(definition of done)*

- [ ] Parse a sample Lit component + CEM → ComponentSpecV1.
- [ ] Generate WC Code Connect stub passing validation.
- [ ] End-to-end WC import + CC PR works.

## Out of scope

- Auto-generating missing CEM (out of scope; assume CEM exists).

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
