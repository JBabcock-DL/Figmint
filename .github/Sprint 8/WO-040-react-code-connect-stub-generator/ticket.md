---
type: work-order
github_issue: 43
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jbk
---

## Goal

Implement the React `MappingTemplate` — generates `.figma.tsx` Code Connect stub files for unmapped Figma components. Stubs include Figma node ids + component prop metadata. Engineer reviews + fills implementation references; CI publishes.

PRD anchors: `Docs/PRD.md` §6.7 FR-CC-\*.

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

1. **`src/core/codeconnect/templates/react.ts`** — full `MappingTemplate` (replaces WO-039 stub).
2. **`src/core/codeconnect/detectUnmapped.ts`** — canvas/repo diff for components without `.figma.tsx`.
3. **`src/core/codeconnect/emitCodeConnectPR.ts`** — batch stub generation + `executeGithubPRSink` (WO-018).
4. Stub output: `@figma/code-connect` `figma.connect()` with node URL, prop metadata, placeholder `example`.
5. Branch pattern: `fighub/code-connect-stubs-{date}`; one PR for entire batch (FR-CC-3).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/05-code-connect.md` — Code Connect conventions
- **Dependencies:** WO-039, WO-018

---

## Acceptance criteria _(definition of done)_

- [ ] Detect 5 unmapped React components on canvas → generate 5 `.figma.tsx` stubs → open a single PR.
- [ ] Stubs follow `figma.connect()` API correctly.
- [ ] Integration test: generated stubs pass `npx figma connect validate`.

## Out of scope

- Other frameworks (WO-045+).
- Auto-implementation-reference filling (engineer's job).

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

- Dependencies: WO-039, WO-018.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.7 FR-CC-\*
- Research: [React Code Connect stub generator](research/react-code-connect-stub-generator.md)
- WO-039 interfaces research
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/05-code-connect.md` — Code Connect conventions
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
