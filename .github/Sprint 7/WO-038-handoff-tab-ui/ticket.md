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

Handoff tab UI mock lives in the FigHub design file.

---

## Requirements

### Functional

1. `src/ui/tabs/Handoff.tsx` — full tab UI.
2. Selection-aware button (disabled with no selection).
3. Preview pane shows markdown rendering.
4. Export sheet defaults to clipboard.

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

**Figma source (filled before `/vqa` runs):**

| Field           | Value                                                |
| --------------- | ---------------------------------------------------- |
| `file_key`      | `<!-- filled during /plan or /vqa -->`               |
| `node_id`       | `<!-- filled during /plan or /vqa -->`               |
| Figma deep link | `<!-- filled -->`                                    |
| Frame / scope   | `<!-- e.g. FigHub plugin window — Bootstrap tab -->` |
| Captured at     | `<!-- ISO date -->`                                  |

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

- Dependencies: WO-037.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.6, §12 Phase 3 exit
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
