---
type: work-order
github_issue: 33
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JSY
---

## Goal

Same 3-way classification as WO-029, but for components. Compares current Figma ComponentSets against repo `.figmint-registry.json` and per-component specs in the connected repo, using the snapshot as common ancestor.

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

1. `src/core/drift/components.ts` — `detectComponentDrift(repoSpecs, figmaComponents, snapshot): ComponentDrift[]`.
2. Detects: new variants in Figma, removed variants, changed bindings, prop additions, prop removals.
3. Classification rules same as WO-029.
4. Each drift entry includes the granular diff (which variant / which binding / which prop).

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-028, WO-022

---

## Acceptance criteria *(definition of done)*

- [ ] Test fixture: Button with `loading` variant added in Figma → push drift detected with correct granular delta.
- [ ] Test fixture: Button with new prop in repo spec → pull drift detected.
- [ ] Both-sides-changed → conflict.
- [ ] Performance: 20-component file <2s.

## Out of scope

- Code-side spec validation (assume repo specs are well-formed).
- Auto-resolution suggestions.

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

- Dependencies: WO-028, WO-022.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.4 FR-DRIFT-2..3
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
