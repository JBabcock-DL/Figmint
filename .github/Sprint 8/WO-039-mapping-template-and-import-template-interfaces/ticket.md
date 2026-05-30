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

1. **`src/core/codeconnect/types.ts`** — `MappingTemplate`, `MappingTemplateContext`, `UnmappedComponentRef`, `MappingStubFile`.
2. **`src/core/import/types.ts`** — `ImportTemplate`, `ImportTemplateContext`, `ImportTemplateResult`.
3. **`src/core/import/shared/`** — `TokenResolver` interface (impl WO-042), `dependencyScanner.ts` + `DependencyTree` types (impl WO-043), `propTypeMapper.ts` + `layoutInferrer.ts` skeletons with Vitest contracts.
4. **`getMappingTemplate(framework)`** / **`getImportTemplate(framework)`** registries — React stub implementations referenced in AC (no-op OK until WO-040/041).
5. Barrel exports: `src/core/codeconnect/index.ts`, `src/core/import/index.ts`.

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
- Research: [MappingTemplate + ImportTemplate interfaces](research/mapping-template-and-import-template-interfaces.md)
- Sprint index: [Sprint 8 research](../research/sprint-8-research-index.md)
- WO-018 [github-pr-sink-flow.md](../../Sprint%204/WO-018-github-pr-output-sink/research/github-pr-sink-flow.md)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
