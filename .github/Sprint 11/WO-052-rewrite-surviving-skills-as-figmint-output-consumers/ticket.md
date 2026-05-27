---
type: work-order
github_issue: 55
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jjo
---

## Goal

Rewrite the DesignOps-plugin skills that survive sunset (`sync-design-system`, `dev-handoff`) as thin Claude-side companions that consume Figmint's output JSON/markdown documents — no more Figma MCP calls in those flows.

PRD anchors: `Docs/PRD.md` §17.1.

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

1. Rewrite `skills/sync-design-system/SKILL.md` to: consume `drift-report.v1.md` from the plugin → run `AskUserQuestion` for conflicts → guide the user to apply via Figmint plugin.
2. Rewrite `skills/dev-handoff/SKILL.md` to: consume `handoff-context.v1.md` from the plugin → create the ticket via `gh` or Atlassian MCP.
3. Mark other agent-side skills with deprecation pointers as needed.
4. Add a redirect note in `skills/new-project/`, `skills/create-design-system/`, `skills/create-component/`, `skills/code-connect/` pointing to Figmint.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-027, WO-031, WO-037, WO-051

---

## Acceptance criteria _(definition of done)_

- [ ] Both rewritten skills work end-to-end against a Figmint-generated document.
- [ ] Old MCP-heavy paths removed from those skills.
- [ ] Redirect pointers in the obsoleted skills.

## Out of scope

- Deleting the old skill folders (kept for redirect; explicit deletion later when adoption is universal).

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

- Dependencies: WO-027, WO-031, WO-037, WO-051.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §17.1
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
