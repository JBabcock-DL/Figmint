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

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

Sync tab resolution UI mock lives in the Figmint design file.

---

## Requirements

### Functional

1. **`src/ui/components/DriftList.tsx`** — filter chips (All / Push ↑ / Pull ↓ / Conflict ⚠) + per-row Push / Pull / Skip.
2. **`src/ui/components/ConflictResolver.tsx`** — 3-column compare (Last synced / Figma / Repo) + Keep Figma / Keep Repo / Custom value / Skip.
3. **`src/ui/drift/resolutionReducer.ts`** — in-memory `resolutions: Map<driftId, ResolutionAction>` (session only).
4. **Host surface:** expandable drift panel on **Settings repo card** (WO-058) — **not** a separate Sync tab (WO-033 absorbed).
5. Bulk **Push selected → PR** — aggregates push resolutions → WO-018 PR sink (single PR, multi-file).
6. Bulk **Pull selected → apply** — variables via WO-008 push engine; components via surgical props/bindings patch OR full re-scaffold when matrix hash changes.
7. Bulk actions **disabled** while any selected conflict row is unresolved (FR-RES-3).
8. Snapshot updates via WO-058 `updateSnapshotKey(s)` after successful Pull; after PR open success for Push.
9. **`src/io/messages/drift.ts`** — typed UI↔main resolution messages.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-031, WO-008, WO-018, WO-058 (snapshot updates)

---

## Acceptance criteria _(definition of done)_

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

- Dependencies: WO-031, WO-008, WO-018, WO-028.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.5
- [Resolution UI research](research/resolution-ui-per-drift-bulk-conflict-resolver.md)
- [Sync tab UX (absorbed WO-033)](../WO-033-sync-tab-ui-on-open-badge/research/sync-tab-ui-on-open-badge.md)
- [Sprint 6 research index](../research/sprint-6-drift-sync-research-index.md)
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
