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

Sync tab resolution UI mock lives in the FigHub design file.

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

**Figma source — panel-only VQA (no design mock exists):**

There is **no Figma mock of the resolution / drift UI** — this UI was built directly from PRD §6.5 into React, never drawn in Figma first (confirmed by repo-wide search 2026-05-28; the "mock lives in the FigHub design file" line was boilerplate, same as WO-027). VQA is therefore **panel-only**: the implemented plugin panel rendered in the locked Plugin Sandbox, asserted against PRD intent + implementation, not against a comp. Design-fidelity rows that require a comp are `N/A`.

| Field           | Value                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| `file_key`      | `cVdPraIafWFBRZnzMPhtrW` (Plugin Sandbox — runs the implemented panel) |
| `node_id`       | N/A — panel-only code VQA (no design mock to link)                     |
| Figma deep link | `https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox`   |
| Frame / scope   | FigHub plugin window — Settings → Repository sync → Drift panel        |
| Captured at     | 2026-05-28                                                             |

**Assertions** _(panel-only: `Design (Figma)` = PRD intent / N/A where a comp is required; `Build` = implemented values):_

| #   | Category      | Property                    | Design (Figma)            | Build (implemented)                                                                                   | Result |
| --- | ------------- | --------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| 1   | Layout        | Frame width × height        | N/A — no mock             | Plugin iframe ~420×520 (Vite UI)                                                                      | N/A    |
| 2   | Layout        | Auto-layout direction / gap | Column list of drift rows | `DriftList` `flexDirection: column`, `gap: 8px`; rows `gap: 6px`                                      | PASS   |
| 3   | Layout        | Padding (T/R/B/L)           | N/A — no mock             | Card `padding: 10px`; rows `8px`; resolver `8px`                                                      | N/A    |
| 4   | Typography    | Font family / size / weight | N/A — no mock             | 11px body, 13px card heading, 600/700 active chip, 9–10px resolver                                    | N/A    |
| 5   | Color         | Background fill (token)     | N/A — no mock             | `#fff` row, `#f7fbff` selected, `#fafafa` conflict panel (raw hex — plugin UI uses no DS tokens)      | N/A    |
| 6   | Color         | Foreground fill (token)     | N/A — no mock             | `#666` muted, `#0a0` resolved, `#888` hint (raw hex)                                                  | N/A    |
| 7   | Spacing       | Margin / gap tokens         | N/A — no mock             | 6–10px inline gaps (no DS tokens in plugin UI by design)                                              | N/A    |
| 8   | Effects       | Border radius / shadow      | N/A — no mock             | `borderRadius: 6px`, `1px solid #ddd`/`#ccc`, no shadow                                               | N/A    |
| 9   | Accessibility | Contrast ratio              | WCAG AA intent            | `#666` on `#fff` = 5.7:1 PASS; hint darkened `#888`→`#767676` = 4.54:1 PASS (fixed during this VQA)   | PASS   |
| 10  | Accessibility | Focus ring + hit target     | 44×44 intent              | Filter chips `minHeight/minWidth: 44px` PASS; row/resolver buttons `minHeight: 32px` (≥24px AA 2.5.8) | PASS   |

**Per-row deviations:**

- Rows 1, 3–8 — `N/A`: no Figma comp exists to compare against; values captured for the record. Plugin UI intentionally uses raw hex, not DS tokens (panel chrome, not canvas output).
- **Row 9 — FIXED:** `#888` hint text on white was ~3.5:1 (below AA's 4.5:1 for <18px text). Darkened to `#767676` (4.54:1) in `src/ui/components/RepoSyncCard.tsx` during this VQA pass. Now PASS.
- Row 10 — PASS: primary filter chips meet 44×44; secondary action buttons are 32px tall (meets WCAG 2.1 AA 2.5.8 ≥24px; below the 44px AAA target). Note, not a fail.

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
