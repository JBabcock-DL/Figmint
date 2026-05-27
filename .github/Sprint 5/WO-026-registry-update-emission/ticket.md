---
type: work-order
github_issue: 29
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JOI
---

## Goal

After each successful scaffold, emit an updated `.figmint-registry.json` (or stage one for emission via export sheet) so the consumer repo stays in sync with what exists in Figma. Implements FR-SCAF-6.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-6, §8.6.

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

1. `src/core/components/registry.ts` — read existing registry (if any from connected repo), merge in new component metadata, return the updated registry document.
2. New entry includes: name, archetype, variant matrix, props, Figma node id, optional Code Connect mapping URL.
3. Output via WO-020 unified export sheet — defaulting to GitHub PR for Org builds, download for Community.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/registry.schema.json` — existing registry shape reference
- **Dependencies:** WO-022, WO-003, WO-020

---

## Acceptance criteria _(definition of done)_

- [ ] Scaffolding a new Button updates the registry with a new entry referencing the Figma ComponentSet's node id.
- [ ] Re-scaffolding the same Button updates (not duplicates) the entry.
- [ ] Registry document validates against `RegistryV1` schema (WO-003).

## Out of scope

- Removing entries on component delete (Sprint 6 drift detection handles).
- Multi-file registry support.

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

- Dependencies: WO-022, WO-003, WO-020.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-6, §8.6
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/registry.schema.json` — existing registry shape reference
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
