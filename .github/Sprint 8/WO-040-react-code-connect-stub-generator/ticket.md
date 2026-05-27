---
type: work-order
github_issue: 43
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jbk
---

## Goal

Implement the React `MappingTemplate` — generates `.figma.tsx` Code Connect stub files for unmapped Figma components. Stubs include Figma node ids + component prop metadata. Engineer reviews + fills implementation references; CI publishes.

PRD anchors: `Docs/PRD.md` §6.7 FR-CC-*.

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

1. `src/core/codeconnect/templates/react.ts` — implements `MappingTemplate`.
2. Output: one `.figma.tsx` per unmapped component, following the official `@figma/code-connect` package conventions.
3. PR emission via WO-018 GitHub PR sink.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/05-code-connect.md` — Code Connect conventions
- **Dependencies:** WO-039, WO-018

---

## Acceptance criteria *(definition of done)*

- [ ] Detect 5 unmapped React components on canvas → generate 5 `.figma.tsx` stubs → open a single PR.
- [ ] Stubs follow `figma.connect()` API correctly.
- [ ] Integration test: generated stubs pass `npx figma connect validate`.

## Out of scope

- Other frameworks (WO-045+).
- Auto-implementation-reference filling (engineer's job).

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

- Dependencies: WO-039, WO-018.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.7 FR-CC-*
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/05-code-connect.md` — Code Connect conventions
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
