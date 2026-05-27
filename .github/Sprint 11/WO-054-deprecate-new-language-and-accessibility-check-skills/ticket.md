---
type: work-order
github_issue: 57
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JlI
---

## Goal

Mark the `new-language` and `accessibility-check` skills as deprecated; redirect users to Figma Agent which now handles translation and a11y on-canvas.

PRD anchors: `Docs/PRD.md` §3.2 N1-N3, §17.1.

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

1. Add deprecation banner to `skills/new-language/SKILL.md` pointing to Figma Agent for translation.
2. Add deprecation banner to `skills/accessibility-check/SKILL.md` pointing to Figma Agent for a11y audits.
3. Update `README.md` in DesignOps-plugin to reflect deprecations.
4. Leave skill folders in place for at least 1 release cycle; remove in a follow-up cleanup.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-053

---

## Acceptance criteria *(definition of done)*

- [ ] Both skill SKILL.md files show clear deprecation notice + Figma Agent pointer.
- [ ] Designers running `/new-language` or `/accessibility-check` see the redirect prominently.
- [ ] DesignOps-plugin README acknowledges the deprecations.

## Out of scope

- Hard-deletion of the skill folders (later cleanup).
- Migration tooling (Figma Agent handles directly).

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

- Dependencies: WO-053.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §3.2 N1-N3, §17.1
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
