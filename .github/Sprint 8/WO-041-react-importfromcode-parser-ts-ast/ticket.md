---
type: work-order
github_issue: 44
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jcc
---

## Goal

Implement the React `ImportTemplate` — parses a `.tsx` component file via TypeScript compiler AST, extracts props/variants/bindings, produces a `ComponentSpecV1` ready for scaffolding (WO-022).

PRD anchors: `Docs/PRD.md` §6.3 FR-IMP-*.

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

1. `src/core/import/templates/react.ts` — implements `ImportTemplate`.
2. Uses `typescript` compiler API to parse `.tsx` source.
3. Extracts: prop interface, default values, variant-typed props, layout hints from JSX, className-derived bindings.
4. Reads existing `.figma.tsx` mapping if present for higher-fidelity prop mapping.
5. Token resolution via WO-042 token resolver.
6. Confidence flags on uncertain layout inferences (per PRD FR-IMP-7 'never silent-apply').

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-039, WO-042

---

## Acceptance criteria *(definition of done)*

- [ ] Parse a sample shadcn Button.tsx → `ComponentSpecV1` with correct variant matrix + props + bindings.
- [ ] Unresolvable className (e.g. `bg-muted/40` without resolver match) flagged as confidence: low.
- [ ] Round-trip: parse → scaffold (WO-022) produces a valid ComponentSet.

## Out of scope

- Other frameworks.
- Auto-resolution of low-confidence flags (designer must accept in preview).

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

- Dependencies: WO-039, WO-042.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.3 FR-IMP-*
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
