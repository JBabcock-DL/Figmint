---
type: work-order
github_issue: 36
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JVA
---

## Goal

Wire the Sync tab: on plugin open, run lightweight drift detection, show badge `Sync · N↑ M↓` (+ `·K⚠` if conflicts) on the tab nav. Tab itself houses WO-032's resolution UI.

PRD anchors: `Docs/PRD.md` §6.4 FR-DRIFT-5.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

Sync tab + badge design lives in the Figmint design file.

---

## Requirements

### Functional

1. `src/ui/tabs/Sync.tsx` — full tab UI hosting WO-032 components.
2. On plugin mount: run quick variable + component drift check; cache result.
3. Badge shows on tab nav with counts.
4. 'Detect drift' button to re-run on demand.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-029, WO-030, WO-032

---

## Acceptance criteria _(definition of done)_

- [ ] Open plugin in a file with 4 push + 2 pull drifts → badge shows `Sync · 4↑ 2↓` within 2s.
- [ ] Open Sync tab → resolution UI populated.
- [ ] Re-detect after manual edit refreshes counts.

## Out of scope

- Continuous background detection (Figma plugins can't background; on-open only).

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

- Dependencies: WO-029, WO-030, WO-032.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.4 FR-DRIFT-5
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
