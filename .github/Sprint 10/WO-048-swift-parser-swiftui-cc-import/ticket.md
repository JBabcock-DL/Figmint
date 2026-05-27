---
type: work-order
github_issue: 51
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JhY
---

## Goal

Add SwiftUI support: parser walks Swift sources for `View` declarations, extracts props (initializer parameters), generates SwiftUI Code Connect stubs, imports as ComponentSpecV1.

PRD anchors: `Docs/PRD.md` §12 Phase 4c.

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

1. `src/core/import/templates/swiftui.ts` — implements `ImportTemplate`.
2. `src/core/codeconnect/templates/swiftui.ts` — SwiftUI Code Connect stubs.
3. Lightweight Swift parser (regex + structural detection — full Swift AST not required for prop extraction).
4. Native asset catalog resolver via WO-050.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-039, WO-040, WO-041, WO-050

---

## Acceptance criteria *(definition of done)*

- [ ] Parse a sample SwiftUI Button view → ComponentSpecV1.
- [ ] Generate SwiftUI Code Connect stub.
- [ ] End-to-end SwiftUI import + CC PR works.

## Out of scope

- Full Swift AST (use lightweight parsing).
- Combine / state property mapping (out of scope for v1).

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

- Dependencies: WO-039, WO-040, WO-041, WO-050.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §12 Phase 4c
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
