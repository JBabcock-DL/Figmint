---
type: work-order
github_issue: 30
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JPQ
---

## Goal

Build the Components tab UI for the forward-scaffold flow. Designer picks from the registry OR pastes a `ComponentSpecV1`; plugin scaffolds + binds + adds props + builds usage frame; registry export sheet appears. Phase 2 GA cut.

PRD anchors: `Docs/PRD.md` §6.2, §12 Phase 2 exit.

---

## Problem story

*Derived from Goal — see ticket-level scope.*

## User stories

- [ ] *See Requirements section below.*

## Design reference *(when UI work applies)*

Components tab UI mock lives in the Figmint design file.

---

## Requirements

### Functional

1. `src/ui/tabs/Components.tsx` — full tab UI.
2. Two entry paths: 'Add from registry' (browses connected repo's `.figmint-registry.json`) and 'Paste/load spec' (uses WO-006 sources).
3. Spec preview + edit (variant matrix, prop list, binding overrides) before scaffold.
4. 'Scaffold' button orchestrates WO-022 → WO-023 → WO-024 → WO-025 → WO-026 → export sheet.
5. Progress + audit display.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-006, WO-022, WO-023, WO-024, WO-025, WO-026

---

## Acceptance criteria *(definition of done)*

- [ ] Designer can scaffold a known shadcn component (e.g. Button) in <5s from registry pick.
- [ ] Designer can paste a custom spec and scaffold it.
- [ ] Phase 2 GA criteria met: component scaffold latency p50 <5s (PRD G2).

## Out of scope

- Import-from-repo flow (Sprint 8).
- Code Connect PR emission (Sprint 8).
- Bulk scaffold (one component per run).

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

| Field | Value |
| --- | --- |
| `file_key` | `<!-- filled during /plan or /vqa -->` |
| `node_id` | `<!-- filled during /plan or /vqa -->` |
| Figma deep link | `<!-- filled -->` |
| Frame / scope | `<!-- e.g. Figmint plugin window — Bootstrap tab -->` |
| Captured at | `<!-- ISO date -->` |

**Assertions** *(agent fills `Design (Figma)` and `Build (implemented)` columns during `/vqa`):*

| # | Category | Property | Design (Figma) | Build (implemented) | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Layout | Frame width × height | | | |
| 2 | Layout | Auto-layout direction / gap | | | |
| 3 | Layout | Padding (T/R/B/L) | | | |
| 4 | Typography | Font family / size / weight | | | |
| 5 | Color | Background fill (token) | | | |
| 6 | Color | Foreground fill (token) | | | |
| 7 | Spacing | Margin / gap tokens | | | |
| 8 | Effects | Border radius / shadow | | | |
| 9 | Accessibility | Contrast ratio | | | |
| 10 | Accessibility | Focus ring + hit target | | | |

**Per-row deviations:**

- *Filled by `/vqa` with FAIL rationale.*

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-006, WO-022, WO-023, WO-024, WO-025, WO-026.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.2, §12 Phase 2 exit
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
