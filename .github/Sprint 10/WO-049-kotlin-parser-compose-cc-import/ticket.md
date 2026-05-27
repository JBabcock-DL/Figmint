---
type: work-order
github_issue: 52
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JiA
---

## Goal

Add Jetpack Compose support: parser walks Kotlin sources for `@Composable` functions, extracts params (signature), generates Compose Code Connect stubs, imports as ComponentSpecV1.

PRD anchors: `Docs/PRD.md` §12 Phase 4c.

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

1. `src/core/import/templates/compose.ts` — implements `ImportTemplate`.
2. `src/core/codeconnect/templates/compose.ts` — Compose Code Connect stubs.
3. Lightweight Kotlin parser (regex + structural detection for @Composable signatures).
4. Native Android resource resolver via WO-050.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-039, WO-040, WO-041, WO-050

---

## Acceptance criteria _(definition of done)_

- [ ] Parse a sample Compose Button composable → ComponentSpecV1.
- [ ] Generate Compose Code Connect stub.
- [ ] End-to-end Compose import + CC PR works.

## Out of scope

- Full Kotlin AST.
- State / remember mapping.

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

- Dependencies: WO-039, WO-040, WO-041, WO-050.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §12 Phase 4c
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
