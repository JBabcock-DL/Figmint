---
type: work-order
github_issue: 41
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JaE
---

## Goal

Wire the Handoff tab: 'Capture selection' button → runs WO-037 pipeline → preview the handoff document → export sheet. Phase 3 GA cut.

PRD anchors: `Docs/PRD.md` §6.6, §12 Phase 3 exit.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

**Panel-only code VQA** — no dedicated Figma mock. Chrome matches Bootstrap/Components tabs (`App.tsx` inline styles). Visual assertions verified via `tests/unit/ui/tabs/Handoff.test.tsx` (WO-027 precedent).

---

## Requirements

### Functional

1. `src/ui/tabs/Handoff.tsx` — Handoff tab (add to `App.tsx` tab list).
2. Main thread broadcasts `handoff/selection` on load + `selectionchange`; **Capture** disabled when selection count is 0.
3. Capture invokes WO-037 pipeline; preview pane shows returned **markdown** in scrollable `<pre>` (no new MD dependency).
4. Inline **`ExportSheet`** below preview; default **clipboard** sink selected; formats default **md**.
5. Loading state on capture; a11y: `aria-disabled`, labeled preview region.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-037

---

## Acceptance criteria _(definition of done)_

- [ ] Designer selects frame → opens Handoff tab → clicks Capture → previews handoff → clicks Export → markdown lands in clipboard.
- [ ] Phase 3 GA: end-to-end handoff <1s capture, designer-mediated routing to consumer works.

## Out of scope

- In-plugin LLM call to draft ticket description (Figma Agent territory).

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

**Figma source (panel-only code VQA — no design mock frame):**

| Field           | Value                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `file_key`      | `cVdPraIafWFBRZnzMPhtrW`                                                                             |
| `node_id`       | N/A — panel-only code VQA (no Handoff mock; Bootstrap/Components chrome parity)                      |
| Figma deep link | `https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox`                                 |
| Frame / scope   | FigHub plugin window — **Handoff** tab (Capture, preview `<pre>`, ExportSheet)                         |
| Captured at     | 2026-05-29                                                                                           |

**Precondition:** Vitest + `@testing-library/react` mock the plugin message bus (`handoff/selection`, `handoff/capture`, `handoff/capture-result`). Figma MCP design-context sweep skipped — no design mock `node_id`.

**Assertions** _(implementation + Vitest; Design column = locked chrome spec from sibling tabs):_

| #   | Category      | Property                              | Design (Figma)                          | Build (implemented)                                                                                         | Result |
| --- | ------------- | ------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Layout        | Tab nav includes **Handoff**          | Between Components and Export           | `App.tsx` — `#fighub-tab-handoff`, `'handoff'` tab state between components and export                      | PASS   |
| 2   | Layout        | Capture + preview + export stack      | Vertical stack, 12px gap                | `Handoff.tsx` — `flexDirection: column`, `gap: 12`                                                          | PASS   |
| 3   | Interaction   | Capture disabled when no selection    | Disabled + hint text                    | `aria-disabled={true}`, hint "Select one or more frames…" — `Handoff.test.tsx`                              | PASS   |
| 4   | Interaction   | Capture → markdown preview            | Preview shows `# handoff-context v1`  | Mock capture-result → `<pre aria-label="Handoff preview">` — `Handoff.test.tsx`                             | PASS   |
| 5   | Interaction   | ExportSheet after successful capture  | Inline ExportSheet, clipboard default   | `prepareHandoffExport` → `defaultSinks: ['clipboard']`, `md: true`; region `Export handoff`                 | PASS   |
| 6   | Interaction   | Export invokes clipboard sink         | Markdown copied on Export click         | `runExport` spy with `kind: 'handoff-context'` — `Handoff.test.tsx`                                         | PASS   |
| 7   | Typography    | Tab + button labels 11px semibold     | 11px, fontWeight 600                    | `App.tsx` / `Handoff.tsx` — `fontSize: 11`, `fontWeight: 600`                                             | PASS   |
| 8   | Color         | Active tab background `#f0f0f0`       | `#f0f0f0`                               | `App.tsx` active tab `background: '#f0f0f0'`                                                                | PASS   |
| 9   | Accessibility | Preview labeled; capture aria-disabled| `aria-label` on preview; disabled state | `aria-label="Handoff preview"`; `aria-disabled` when count 0 — `Handoff.test.tsx`                           | PASS   |
| 10  | Accessibility | Capture before Export tab order       | Capture then Export                     | `tabOrder.indexOf('Capture selection') < tabOrder.indexOf('Export')` — `Handoff.test.tsx`                  | PASS   |

**Per-row deviations:**

- Figma MCP design-context sweep skipped — no design mock `node_id`; panel assertions verified from implementation + Vitest (WO-027 precedent).
- End-to-end `<1s` capture latency covered by `tests/unit/core/handoff/build.latency.test.ts` (orchestration); Plugin Sandbox manual timing optional at GA.

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-037.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.6, §12 Phase 3 exit
- [Handoff tab UI research](research/handoff-tab-ui.md)
- Patterns: `ExportSandbox.tsx`, `Components.tsx`, `ExportSheet.tsx`
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
