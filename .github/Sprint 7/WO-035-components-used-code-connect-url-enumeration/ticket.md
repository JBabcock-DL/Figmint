---
type: work-order
github_issue: 38
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JXY
---

## Goal

Walk the selected frame's subtree, enumerate every component instance, and include the Code Connect URL when one is mapped (via Figma's mapping API).

PRD anchors: `Docs/PRD.md` §6.6 FR-HAND-2.

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

1. `src/core/handoff/components.ts` — `enumerateComponents(node: SceneNode): ComponentUsage[]`.
2. Each usage: `{ name: string, instances: number, codeConnectUrl: string | null }`.
3. Walks Component / Instance nodes; aggregates by Component name.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-034

---

## Acceptance criteria *(definition of done)*

- [ ] A frame with 4 Button instances + 2 Card instances returns `[{ name: 'Button', instances: 4, ... }, { name: 'Card', instances: 2, ... }]`.
- [ ] Code Connect URLs included where mapped.
- [ ] Unit + integration tests against fixture frames.

## Out of scope

- Code Connect creation (Sprint 8).

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

- Dependencies: WO-034.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.6 FR-HAND-2
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
