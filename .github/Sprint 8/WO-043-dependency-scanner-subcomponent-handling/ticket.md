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

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. **`scanDependencies(sourceText, registryKeys)`** — TS AST light pass (imports + JSX tags).
2. Output **`DependencyTree`** per WO-039 types; statuses `registered` | `unknown` | `circular`.
3. Registry keys from canvas snapshot + `.fighub-registry.json` (WO-026).
4. Wire into import pipeline before WO-041 full parse; WO-044 renders tree UI.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-039, WO-026

---

## Acceptance criteria _(definition of done)_

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
- Research: [Dependency scanner](research/dependency-scanner-subcomponent-handling.md)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
