---
type: work-order
github_issue: 23
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JIM
---

## Goal

A single React component that asks the designer: which format(s)? which sink(s)? what file path (when applicable)? Used by every flow that emits a contract document — drift reports, handoff, registry updates, ops-program audits, etc.

PRD anchors: `Docs/PRD.md` §6.8 FR-IO-4, §10.4.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

Export sheet design lives in the FigHub design file (file_key TBD).

---

## Requirements

### Functional

1. `src/ui/components/ExportSheet.tsx` — props: `{ document: ContractDocument, defaultSinks?: SinkId[], title?: string, onComplete?, onCancel? }`. `ContractDocument` is a discriminated union over canonical `@detroitlabs/fighub-contracts` payloads (ops-program, component-spec, drift-report, handoff-context, registry, tokens).
2. Format checkboxes: independent JSON / Markdown toggles; at least one required; default both checked. WO-019 `format()` produces bytes — ExportSheet never authors markdown directly. Registry kind disables Markdown (no WO-019 renderer).
3. Sink checkboxes: download / clipboard / Output page / pluginData / GitHub PR. **`flags.githubOAuth`** hides GitHub PR in Community builds. `defaultSinks` pre-checks per flow; intersected with available sinks on mount.
4. Path input shown when download and/or GitHub PR selected. Default basename from `ContractKind` via `src/ui/export/defaultPaths.ts` (e.g. `docs/fighub/drift-{date}` per PRD §10.4).
5. Submit serializes selected formats, then invokes sinks **in parallel** (`Promise.allSettled` for UI sinks; `export/run` postMessage for main-thread sinks). Per-sink success/failure rendered in a status list (Bootstrap step-list visual language).
6. `src/io/messages/export.ts` — typed `export/run`, `export/sink-result`, `export/complete` union; `main.ts` handler for output-page, plugin-data, github-pr sinks.
7. Extract `exportSheetReducer.ts` for form + async status state (match Bootstrap tab pattern).

### Visual / UX

- Inline styles matching `App.tsx` / `Bootstrap.tsx` (Inter, 11px body, 13px section headers, semantic colors).
- `<fieldset>` + `<legend>` for format and sink groups; Export disabled while exporting or when no format/sink selected.
- Cancel + Export actions per PRD §10.4 ASCII wireframe.

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-017, WO-018, WO-019 (WO-021 flags for GitHub gating)

---

## Acceptance criteria _(definition of done)_

- [ ] Vitest component tests (Storybook equivalent) render ExportSheet for all six `ContractDocument` variants with fixture payloads.
- [ ] All five sinks reachable when `flags.githubOAuth === true`; GitHub PR checkbox absent in Community build tests.
- [ ] Multi-sink export invokes every selected sink; partial failure surfaces per-sink errors without blocking successful sinks.
- [ ] Path input defaults match research table per contract kind.

## Out of scope

- Per-sink customization beyond path (e.g. PR labels, commit author override).
- Cancel-in-flight (assume sinks are fast enough).
- Storybook setup.

---

## Testing & verification

### Functional QA

- Vitest: `exportSheetReducer`, `defaultPaths`, `export` message guards, `ExportSheet` component tests (add `@testing-library/react` if plan approves).
- Mock `parent.postMessage` and sink modules for orchestration tests.

### Visual / design QA

- **Figma VQA deferred** — no design frame assigned yet (`file_key` TBD). Build against Bootstrap UI conventions until design lands.

### Accessibility

- Checkbox groups labeled; Export/Cancel keyboard reachable; per-sink status uses `role="status"`.

### Telemetry / observability

- Console.debug per major event; production telemetry deferred.

---

## Figma VQA Checklist

**N/A — no Figma artifact (design frame TBD; build follows Bootstrap inline conventions until design lands).**

---

## 🔍 Ready for `/research`

- ✅ [Export sheet UI patterns](research/export-sheet-ui-patterns.md) — 2026-05-27

## 📋 Ready for `/plan`

- Dependencies: WO-017, WO-018, WO-019.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.8 FR-IO-4, §10.4
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
- Research: [Export sheet UI patterns](research/export-sheet-ui-patterns.md)
- UI conventions: `src/ui/App.tsx`, `src/ui/tabs/Bootstrap.tsx`
- Upstream: WO-015 bootstrap tab orchestration research (postMessage + reducer patterns)
