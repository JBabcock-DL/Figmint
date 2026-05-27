---
type: work-order
github_issue: 42
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jaw
---

## Goal

Define the two shared TypeScript interfaces every per-framework generator + parser implements: `MappingTemplate` (Figma → code mapping stub generator) and `ImportTemplate` (code → component-spec parser). All Sprint 8/9/10 frameworks plug into these two interfaces.

PRD anchors: `Docs/PRD.md` §6.3, §6.7, §12 Phase 4a.

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

1. `src/core/codeconnect/MappingTemplate.ts` — interface for stub generators.
2. `src/core/import/ImportTemplate.ts` — interface for code parsers.
3. Shared utilities: `propTypeMapper`, `layoutInferrer`, `dependencyScanner` skeletons in `src/core/import/shared/`.
4. Registry-driven framework dispatch.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-003

---

## Acceptance criteria _(definition of done)_

- [ ] Both interfaces compile and have at least one stub implementation (React) referenced.
- [ ] Per-framework template factories return implementations.
- [ ] Unit tests for the shared utilities.

## Out of scope

- Per-framework implementations (WO-040+).

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

- Dependencies: WO-003.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.3, §6.7, §12 Phase 4a
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
