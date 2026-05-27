---
type: work-order
github_issue: 31
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JQM
---

## Goal

Implement the per-key snapshot that serves as the 'common ancestor' for 3-way drift detection (push/pull/conflict). Stored in pluginData on a hidden node in the Figmint Output page; updated per-key after every successful push or pull.

PRD anchors: `Docs/PRD.md` §6.4 FR-DRIFT-1.

---

## Problem story

*Derived from Goal — see ticket-level scope.*

## User stories

- [ ] *See Requirements section below.*

## Design reference *(when UI work applies)*

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/core/drift/snapshot.ts` — read/write snapshot from pluginData.
2. Per-key entries: `{ key: string, value: unknown, source: 'push' | 'pull', timestamp: ISO }`.
3. API: `getSnapshot()`, `updateSnapshotKey(key, value, source)`, `clearSnapshot()`.
4. Snapshot survives across plugin re-opens and Figma file forks.
5. Stable namespace prefix (`figmint:snapshot:`).

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-002

---

## Acceptance criteria *(definition of done)*

- [ ] After a variable push, the snapshot reflects the pushed values per key.
- [ ] After a manual edit to a variable, the snapshot remains stale (correct — that's the drift signal).
- [ ] Clearing snapshot resets the 'last synced' baseline (used after rebase / migrate operations).
- [ ] Unit tests cover read/write/update.

## Out of scope

- Multi-file snapshot synchronization.
- Snapshot history / undo.

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

- Dependencies: WO-002.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.4 FR-DRIFT-1
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
