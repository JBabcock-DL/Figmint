---
type: work-order
github_issue: 54
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JjA
---

## Goal

Execute the hard-delete portion of the DesignOps-plugin sunset plan (PRD §17). Removes the MCP transport machinery that has no purpose in the plugin-sandbox world.

PRD anchors: `Docs/PRD.md` §17.2.

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

1. Delete `skills/canvas-bundle-runner/` (entire skill folder).
2. Delete `scripts/check-payload.mjs`, `check-use-figma-mcp-args.mjs`, `probe-parent-transport.mjs`.
3. Delete `scripts/sync-cache.sh`, `scripts/measure-sigma.mjs`.
4. Delete `canvas-templates/bundles/*.min.mcp.js` files (keep `.mcp.js` source).
5. Remove `AGENTS.md` MCP anti-spiral section (most of it).
6. Single PR with all deletions; descriptive PR body explaining the sunset.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-027, WO-038

---

## Acceptance criteria _(definition of done)_

- [ ] PR opened in DesignOps-plugin repo with all hard-sunset deletions.
- [ ] Repo still builds / verify scripts pass after deletions.
- [ ] PR description links to Figmint PRD §17 and this ticket.

## Out of scope

- Skill rewrites (WO-052).
- Meta-doc updates (WO-053).

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

- Dependencies: WO-027, WO-038.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §17.2
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
