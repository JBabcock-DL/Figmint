---
type: work-order
github_issue: 56
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jkc
---

## Goal

Update `CLAUDE.md`, `memory.md`, and `AGENTS.md` in DesignOps-plugin to reflect its new role as the **agent-side companion** to Figmint — orchestration + ticket workflows + Claude-side decisioning, no more Figma MCP / canvas-build code paths.

PRD anchors: `Docs/PRD.md` §17.

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

1. Rewrite `CLAUDE.md` to point at Figmint as the canvas authority.
2. Trim `memory.md` of MCP / payload / canvas-bundle entries.
3. Trim `AGENTS.md` to keep only host-specific notes + ticket-workflow conventions.
4. Add a top-of-repo banner: 'This repo is the agent-side companion to Figmint. Canvas work lives in Figmint.'

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-051, WO-052

---

## Acceptance criteria *(definition of done)*

- [ ] Meta docs read coherently as agent-side companion role.
- [ ] No remaining references to canvas-bundle-runner or MCP payload budgets.
- [ ] Figmint repo + PRD linked prominently.

## Out of scope

- Skill rewrites (WO-052 owns).

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

- Dependencies: WO-051, WO-052.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §17
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
