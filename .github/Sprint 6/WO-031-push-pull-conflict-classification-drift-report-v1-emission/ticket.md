---
type: work-order
github_issue: 34
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JTY
---

## Goal

Aggregate variable + component drift into a `DriftReportV1` document with the push/pull/conflict classification and granular per-drift entries. Emit via WO-020 export sheet (download / clipboard / Output page / pluginData / GitHub PR).

PRD anchors: `Docs/PRD.md` §6.4 FR-DRIFT-3..4, §8.4.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. **`src/core/drift/report.ts`** — `buildDriftReport({ variableDrifts, componentDrifts, meta, syncedCount }): DriftReportV1`.
2. Summary fields: `push`, `pull`, `conflict`, `synced` — invariant: first three match `drifts[]` filter; `synced` count only.
3. Sort `drifts[]` by `id` ascending for deterministic output.
4. Markdown rendering via **existing** WO-019 `renderDriftReportMarkdown` — sections `## ↑ Push (N)`, `## ↓ Pull (N)`, `## ⚠ Conflicts (N)`.
5. JSON validates against `DriftReportV1` in `@detroitlabs/fighub-contracts` (WO-003).
6. **Main message:** `drift/build-report` orchestrates WO-029 + WO-030 → report → optional sink.
7. **PR emission:** extend PR title pattern `DesignOps drift: N push, M pull, K conflicts`; body = rendered markdown; files `docs/fighub/drift-{date}.{json,md}` via WO-018 sink.
8. Wire `detect-drift` op from `opsProgram.v1` in `main.ts`.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-029, WO-030, WO-019, WO-020, WO-003

---

## Acceptance criteria _(definition of done)_

- [ ] End-to-end: drift detected on a sample file produces a `drift-report.v1.json` AND `drift-report.v1.md` with correct counts.
- [ ] Markdown renders cleanly in GitHub PR preview.
- [ ] JSON validates against `DriftReportV1` schema.

## Out of scope

- Resolution UI (WO-032).

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

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-029, WO-030, WO-019, WO-020, WO-003.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.4 FR-DRIFT-3..4, §8.4
- [Drift report emission research](research/drift-report-v1-emission.md)
- [Sprint 6 research index](../research/sprint-6-drift-sync-research-index.md)
- Existing: `src/io/formats/markdown/driftReport.ts`, `src/io/formats/__fixtures__/drift-report-ac.json`
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
