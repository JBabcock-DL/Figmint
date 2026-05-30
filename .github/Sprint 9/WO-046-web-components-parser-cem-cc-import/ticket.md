---
type: work-order
github_issue: 49
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jfw
---

## Goal

Add Web Components support: parser reads Custom Elements Manifest (`custom-elements.json` per CEM spec), Code Connect stub generator, ImportTemplate.

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

1. `src/core/import/templates/webcomponents.ts` + `templates/webcomponents/` — CEM **2.1.0** primary path (`custom-elements.json` / `package.json` `"customElements"` discovery order per research).
2. `src/core/codeconnect/templates/webcomponents.ts` — WC stub via **`@figma/code-connect/html`** with custom element tag in example; **`{Component}.figma.ts`** output.
3. **`customElements.define`** fallback scan when CEM missing (best-effort, `confidence: low`; error `cem-not-found` when both fail).
4. Extend **`ImportTemplateContext`** with optional `cemManifestText` / `cemManifestPath`; reuse **`ImportParseExecMessage.framework`** from WO-045.
5. Register `wc` in registries; enable Web Components in **`FrameworkPicker`**.
6. Fixtures: **`tests/fixtures/wc/custom-elements.json`** + Lit-style **`ds-button.ts`** → spec; stub validates with **`figma connect validate`** (SPK-046-2).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-039, WO-040, WO-041, WO-042

---

## Acceptance criteria _(definition of done)_

- [ ] Parse a sample Lit component + CEM → ComponentSpecV1.
- [ ] Generate WC Code Connect stub passing validation.
- [ ] End-to-end WC import + CC PR works.

## Out of scope

- Auto-generating missing CEM (out of scope; assume CEM exists).

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
- [Web Components + CEM research](research/web-components-parser-cem-code-connect.md)
- [Sprint 9 research index](../research/sprint-9-research-index.md)
- CEM spec: https://github.com/webcomponents/custom-elements-manifest (schema 2.1.0)
- Figma Code Connect HTML: https://developers.figma.com/docs/code-connect/html/
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
