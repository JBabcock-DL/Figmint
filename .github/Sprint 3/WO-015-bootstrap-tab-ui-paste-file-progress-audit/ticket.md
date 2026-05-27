---
type: work-order
github_issue: 18
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JBc
---

## Goal

Wire up the Bootstrap tab of the plugin UI: paste / file picker / clipboard sources flow into the push engine + canvas builders, with progress reporting and inline audit display. This is the first end-user-visible Sprint 1 → Sprint 3 integration.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-_, §6.8 FR-IO-_.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

Bootstrap tab UI mock — first end-user-visible Figmint surface. Design lives in the Figmint design file (file_key to be assigned during /plan).

---

## Requirements

### Functional

1. `src/ui/tabs/Bootstrap.tsx` — full tab UI.
2. Source picker invoking WO-006 sources (paste / file / clipboard).
3. Detect token format (WO-007 adapters) and preview the loaded document.
4. "Push to Figma" button orchestrates: WO-008 variable push → WO-011/12/13 canvas builders → WO-010 audit.
5. Progress bar with per-step status.
6. Audit results display: pass/fail counts, drill-down to per-rule diagnostics.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-006, WO-007, WO-008, WO-010, WO-011, WO-012, WO-013

---

## Acceptance criteria _(definition of done)_

- [ ] Designer can paste a `tokens.json` and complete a full bootstrap (5 collections + style guide canvas) in one button press.
- [ ] Progress bar updates in real-time.
- [ ] Audit failures appear inline; designer can dismiss or copy.
- [ ] Bench: full bootstrap on a 400-variable input completes <30s (PRD G1 target).

## Out of scope

- GitHub OAuth source (Sprint 4 WO-016).
- Output sinks (Sprint 4 WO-017+).
- Components / Sync / Handoff tabs.

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

- Dependencies: WO-006, WO-007, WO-008, WO-010, WO-011, WO-012, WO-013.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-_, §6.8 FR-IO-_
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
