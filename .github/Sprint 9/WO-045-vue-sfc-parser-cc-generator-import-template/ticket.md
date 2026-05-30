---
type: work-order
github_issue: 48
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JfM
---

## Goal

Add Vue Single File Component support: parser (template + script setup + style block), Code Connect stub generator, ImportTemplate. Re-use the shared web token resolver (WO-042).

PRD anchors: `Docs/PRD.md` §12 Phase 4b.

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

1. `src/core/import/templates/vue.ts` + `templates/vue/` pipeline — `VueImportTemplate` mirroring React pass order (SFC parse → props → variants → dependencies → class tokens → bindings → layout → confidence).
2. `src/core/codeconnect/templates/vue.ts` — Vue Code Connect stub via **`@figma/code-connect/html`**, output **`{Component}.figma.ts`** (not `.figma.tsx`).
3. Add **`@vue/compiler-sfc`** + **`@vue/compiler-dom`**; parse in **UI iframe** only (extend `runImportParseExec` + add **`framework`** to `ImportParseExecMessage`).
4. Register `vue` in import + mapping registries; enable Vue in **`FrameworkPicker`** (`PHASE_4B_ENABLED`).
5. Canonical fixture **`tests/fixtures/vue/Button.vue`** (defineProps + tailwind classes) → `ComponentSpecV1` with bindings from shared token resolver.
6. Generated stub passes **`npx figma connect validate`** in consumer fixture (SPK-045-2); PR body documents `figma.config.json` **`parser: "html"`**.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-039, WO-040, WO-041, WO-042

---

## Acceptance criteria _(definition of done)_

- [ ] Parse a sample Vue Button.vue → ComponentSpecV1.
- [ ] Generate Vue Code Connect stub passing `npx figma connect validate`.
- [ ] End-to-end Vue import + CC PR works.

## Out of scope

- Vue Composition API quirks beyond standard patterns.

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

- Dependencies: WO-039, WO-040, WO-041, WO-042.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §12 Phase 4b
- [Vue SFC parser + Code Connect research](research/vue-sfc-parser-code-connect-import-template.md)
- [Sprint 9 research index](../research/sprint-9-research-index.md)
- Figma Code Connect HTML: https://developers.figma.com/docs/code-connect/html/
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
