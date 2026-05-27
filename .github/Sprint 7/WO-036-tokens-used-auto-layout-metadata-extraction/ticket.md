---
type: work-order
github_issue: 39
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JYg
---

## Goal

Walk the selected frame, collect every Variable referenced (via `boundVariables`), and capture auto-layout metadata (direction, gap, padding, sizing modes) for handoff context.

PRD anchors: `Docs/PRD.md` §6.6 FR-HAND-3..4.

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

1. `src/core/handoff/tokens.ts` — `enumerateTokensAndLayout(node: SceneNode): { tokens: string[], autoLayout: AutoLayoutMeta }`.
2. Walks the tree collecting unique variable names from `boundVariables`.
3. Extracts auto-layout metadata from the root frame.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-034

---

## Acceptance criteria *(definition of done)*

- [ ] A frame using `Theme/Primary` + `Layout/spacing/3` + `Typography/Body/medium` returns those three token names.
- [ ] Auto-layout metadata correctly captures vertical/horizontal + gap + padding.
- [ ] Unit + integration tests.

## Out of scope

- Token value resolution (only names matter for handoff).

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

- PRD: `Docs/PRD.md` §6.6 FR-HAND-3..4
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
