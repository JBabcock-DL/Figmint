---
type: work-order
github_issue: 35
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JUE
---

## Goal

Build the resolution UX: list of drifts with filter chips (All / Push / Pull / Conflict), per-row Push/Pull/Skip actions, bulk Push / Pull buttons (disabled while any conflict is unresolved), and a 3-column conflict resolver (Last synced / Figma / Repo) for conflicts.

PRD anchors: `Docs/PRD.md` §6.5.

---

## Problem story

*Derived from Goal — see ticket-level scope.*

## User stories

- [ ] *See Requirements section below.*

## Design reference *(when UI work applies)*

Sync tab resolution UI mock lives in the Figmint design file.

---

## Requirements

### Functional

1. `src/ui/components/DriftList.tsx` — list + chips + filters.
2. `src/ui/components/ConflictResolver.tsx` — 3-column compare + 'Keep Figma' / 'Keep Repo' / 'Custom value' / 'Skip' actions.
3. Per-row actions update an in-memory `resolutions` map keyed by drift id.
4. Bulk actions: 'Push selected → PR' (invokes WO-018 PR sink), 'Pull selected → apply' (invokes WO-008 push engine or component scaffold with the repo values).
5. Snapshot updates per-resolved drift (WO-028).

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-031, WO-008, WO-018, WO-028

---

## Acceptance criteria *(definition of done)*

- [ ] Designer can resolve a 10-drift report (4 push, 3 pull, 3 conflict) end-to-end without leaving the plugin.
- [ ] Bulk Push action opens a single PR with all push-resolutions committed.
- [ ] Bulk Pull action applies all pull-resolutions to Figma and updates snapshots.
- [ ] Conflict row stays disabled in bulk until explicitly resolved.

## Out of scope

- Undo of applied resolutions (use Figma's native undo).
- Saving partial resolution state across plugin sessions.

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

- Dependencies: WO-031, WO-008, WO-018, WO-028.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.5
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
