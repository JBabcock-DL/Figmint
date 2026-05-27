---
type: work-order
github_issue: 32
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JRQ
---

## Goal

Implement variable drift detection: pull current repo `tokens.json`, walk current Figma local variables, compare both against the snapshot (common ancestor). Classify each diff as push / pull / conflict / synced.

PRD anchors: `Docs/PRD.md` §6.4 FR-DRIFT-2..3.

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

1. `src/core/drift/variables.ts` — `detectVariableDrift(repoTokens, figmaVars, snapshot): VariableDrift[]`.
2. Per-token classification:
3.   - Figma ≠ snapshot, repo = snapshot → **push**
4.   - Repo ≠ snapshot, Figma = snapshot → **pull**
5.   - Both ≠ snapshot and disagree → **conflict**
6.   - Both = snapshot OR both ≠ snapshot but agree → **synced**
7. Output integrates into `drift-report.v1` (WO-031).

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-028, WO-008

---

## Acceptance criteria *(definition of done)*

- [ ] Test fixture: 10 variables, 3 pushed in Figma, 2 pulled in repo, 1 conflict — detector classifies all 10 correctly.
- [ ] Performance: 400-variable comparison <2s.
- [ ] Integration test against a sample repo + Figma file.

## Out of scope

- Component drift (WO-030).
- Resolution UI (WO-032).
- PR emission (WO-031).

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

- Dependencies: WO-028, WO-008.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.4 FR-DRIFT-2..3
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
