---
type: work-order
github_issue: 46
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JeE
---

## Goal

Pre-scan a component file's sub-component references; check registry for each; surface a dependency tree before any parse/scaffold work. Sub-components found in registry get instance references; unknowns prompt the designer to import dependencies first (per locked decision in plan).

PRD anchors: `Docs/PRD.md` §6.3 FR-IMP-3.

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

1. `src/core/import/shared/dependencyScanner.ts` — `scanDependencies(file: string): DependencyTree`.
2. Pre-scan via regex / lightweight AST (don't full-parse if not needed).
3. Check `.figmint-registry.json` from connected repo for each ref.
4. Returns a tree: each node = { name, status: 'registered' | 'unknown' | 'circular' }.
5. UI integration: dependency tree preview before import (WO-044).

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-039, WO-026

---

## Acceptance criteria *(definition of done)*

- [ ] Importing `Button.tsx` that uses `<Icon>` and `<Box>` → tree shows Icon (registered ✓), Box (registered ✓).
- [ ] Importing component with unknown sub-component → tree flags it with options (import first / placeholder / cancel).
- [ ] Circular dependencies surfaced as error.

## Out of scope

- Batch import of whole folders (manual one-by-one for v1).
- Auto-import sub-components without designer confirmation.

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

- Dependencies: WO-039, WO-026.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.3 FR-IMP-3
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
