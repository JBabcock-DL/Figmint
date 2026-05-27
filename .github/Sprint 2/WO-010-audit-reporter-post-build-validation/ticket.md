---
type: work-order
github_issue: 13
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5I80
---

## Goal

Implement the audit pass that runs after every variable push (and later, every canvas build and component scaffold). Reports counts, drift, and rule violations inline so designers see failures immediately rather than silently passing.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-8.

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

1. `src/core/audit/runAudit.ts` — accepts an audit scope (`variables` | `canvas` | `component`) + the post-operation Figma state, returns `AuditReport` JSON.
2. Audit rules encoded as code (not prompt rules) — port from DesignOps-plugin convention shards.
3. Each rule returns pass/fail + a one-line diagnostic.
4. Audit is called from `push.ts` (WO-008) and surfaces results back to the caller.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/14-audit.md` — audit checklist + rule set to port as code
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/06-audit-checklist.md` — component-scaffold audit rules (reused in Sprint 5)
- **Dependencies:** WO-008

---

## Acceptance criteria *(definition of done)*

- [ ] After a variable push, audit returns at minimum: total variables created/updated, mode coverage per collection, codeSyntax coverage per platform.
- [ ] A simulated rule failure (e.g. missing mode value) shows up as FAIL with diagnostic.
- [ ] Audit output serializes via the standard JSON+Markdown formatter (Sprint 4 WO-019).
- [ ] `tsc --noEmit` clean.

## Out of scope

- Component-scaffold audit (Sprint 5 WO-022..WO-027 reuses this engine).
- Canvas audit (Sprint 3 reuses this).
- Realtime audit while building — runs only at the end of an operation.

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

- Dependencies: WO-008.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-8
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/14-audit.md` — audit checklist + rule set to port as code
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/06-audit-checklist.md` — component-scaffold audit rules (reused in Sprint 5)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
