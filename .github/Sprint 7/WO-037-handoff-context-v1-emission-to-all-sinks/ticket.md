---
type: work-order
github_issue: 40
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JZM
---

## Goal

Aggregate WO-034/35/36 outputs into a `HandoffContextV1` document; emit via the WO-020 export sheet with all 5 sinks. Default to clipboard (most common use case).

PRD anchors: `Docs/PRD.md` §6.6 FR-HAND-5, §8.5.

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

1. `src/core/handoff/build.ts` — combines selection capture + components + tokens + layout into `HandoffContextV1`.
2. Markdown rendering via WO-019: includes screenshot, frame URL, components used (table with Code Connect links), tokens-used list, auto-layout meta.
3. Export sheet integration.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-034, WO-035, WO-036, WO-019, WO-020, WO-003

---

## Acceptance criteria *(definition of done)*

- [ ] Capture a 'Checkout' frame → resulting markdown opens cleanly in Slack / Claude / GitHub PR.
- [ ] JSON validates against `HandoffContextV1` schema.
- [ ] Latency: capture-to-clipboard <1s.

## Out of scope

- Auto-creation of GitHub issues from handoff (manual; designer routes via clipboard or PR).

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

- Dependencies: WO-034, WO-035, WO-036, WO-019, WO-020, WO-003.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.6 FR-HAND-5, §8.5
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
