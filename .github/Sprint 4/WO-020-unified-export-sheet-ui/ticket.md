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

Export sheet design lives in the Figmint design file (file_key TBD).

---

## Requirements

### Functional

1. `src/ui/components/ExportSheet.tsx` — props: `{ document: ContractDocument, defaultSinks?: Sink[] }`.
2. Format checkboxes: JSON / Markdown / both.
3. Sink checkboxes: download / clipboard / Output page / pluginData / GitHub PR (Org only).
4. When GitHub PR selected: path input field with sensible default based on document kind.
5. Submit invokes the chosen sinks in parallel; reports per-sink success/failure.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-017, WO-018, WO-019

---

## Acceptance criteria _(definition of done)_

- [ ] Component renders in Storybook (or equivalent) with all 5 contract document kinds.
- [ ] All 5 sinks are reachable; selecting multiple sinks writes to all of them.
- [ ] GitHub PR sink hidden in Community build via feature flag.

## Out of scope

- Per-sink customization beyond path (e.g. PR labels, commit author override).
- Cancel-in-flight (assume sinks are fast enough).

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

**Figma source (filled before `/vqa` runs):**

| Field           | Value                                                 |
| --------------- | ----------------------------------------------------- |
| `file_key`      | `<!-- filled during /plan or /vqa -->`                |
| `node_id`       | `<!-- filled during /plan or /vqa -->`                |
| Figma deep link | `<!-- filled -->`                                     |
| Frame / scope   | `<!-- e.g. Figmint plugin window — Bootstrap tab -->` |
| Captured at     | `<!-- ISO date -->`                                   |

**Assertions** _(agent fills `Design (Figma)` and `Build (implemented)` columns during `/vqa`):_

| #   | Category      | Property                    | Design (Figma) | Build (implemented) | Result |
| --- | ------------- | --------------------------- | -------------- | ------------------- | ------ |
| 1   | Layout        | Frame width × height        |                |                     |        |
| 2   | Layout        | Auto-layout direction / gap |                |                     |        |
| 3   | Layout        | Padding (T/R/B/L)           |                |                     |        |
| 4   | Typography    | Font family / size / weight |                |                     |        |
| 5   | Color         | Background fill (token)     |                |                     |        |
| 6   | Color         | Foreground fill (token)     |                |                     |        |
| 7   | Spacing       | Margin / gap tokens         |                |                     |        |
| 8   | Effects       | Border radius / shadow      |                |                     |        |
| 9   | Accessibility | Contrast ratio              |                |                     |        |
| 10  | Accessibility | Focus ring + hit target     |                |                     |        |

**Per-row deviations:**

- _Filled by `/vqa` with FAIL rationale._

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

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
