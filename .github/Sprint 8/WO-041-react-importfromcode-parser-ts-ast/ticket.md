---
type: work-order
github_issue: 44
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jcc
---

## Goal

Implement the React `ImportTemplate` — parses a `.tsx` component file via TypeScript compiler AST, extracts props/variants/bindings, produces a `ComponentSpecV1` ready for scaffolding (WO-022).

PRD anchors: `Docs/PRD.md` §6.3 FR-IMP-\*.

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

1. **`src/core/import/templates/react.ts`** — `ImportTemplate` using `typescript` compiler API (bundled dep).
2. Parse exported component + props → `ComponentSpecV1` with shadcn **variant × size** matrix (see `tests/fixtures/component-spec-button-canonical.json`).
3. **`mergeFigmaMapping.ts`** — enrich from sibling `.figma.tsx` when present (FR-IMP-6).
4. **`parseJsxLayout.ts`** + **`propTypeMapper.ts`** — layout/bindings with `confidence` flags (FR-IMP-7).
5. Integrate WO-042 `TokenResolver` + WO-043 `scanDependencies` in parse pipeline.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-039, WO-042

---

## Acceptance criteria _(definition of done)_

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

- PRD: `Docs/PRD.md` §6.3 FR-IMP-\*
- Research: [React ImportTemplate TS AST parser](research/react-importfromcode-parser-ts-ast.md)
- AC fixture: `tests/fixtures/component-spec-button-canonical.json`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
