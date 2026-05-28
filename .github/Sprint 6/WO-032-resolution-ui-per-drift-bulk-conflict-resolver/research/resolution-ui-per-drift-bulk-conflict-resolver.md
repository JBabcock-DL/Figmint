# WO-032 — Resolution UI (per-drift + bulk conflict resolver)

---

## Summary

Build the **drift resolution UX**: filter chips (All / Push / Pull / Conflict), per-row Push/Pull/Skip actions, bulk Push→PR and Pull→apply, and a **3-column conflict resolver** (Last synced / Figma / Repo) with Keep Figma / Keep Repo / Custom / Skip (PRD §6.5 FR-RES-1..5).

**Locked recommendation:** Implement `DriftList.tsx` + `ConflictResolver.tsx` as **Settings-embedded drift panel** (WO-033 absorbed — no separate Sync tab). State: in-memory `resolutions: Map<driftId, ResolutionAction>` for current session only (ticket out of scope: no cross-session persistence). Bulk Push invokes WO-018 PR sink with aggregated file changes; bulk Pull invokes WO-008 variable push + component surgical update; successful resolutions call WO-058 snapshot `updateSnapshotKey`.

---

## Key Findings

### 1. UX surface (post WO-033 absorption)

| Was (WO-033) | Now (WO-058 + WO-032) |
| ------------ | --------------------- |
| Dedicated Sync tab in nav | Settings repo card **Drift** section expandable |
| Tab badge `Sync · 4↑ 2↓` | Badge on Settings nav or repo card header |
| On-open detect | Fetch/Pull refreshes drift cache; mount hook on Settings |

`src/ui/App.tsx` tabs today: bootstrap, components, export, settings — **no Sync tab** (lines 13–20). Add drift UI inside `Settings.tsx` below repo card.

### 2. Component architecture

```
Settings.tsx
  └── RepoCard (WO-058)
        ├── Fetch / Pull / Push
        └── DriftPanel (WO-032)
              ├── DriftSummaryBadge (counts)
              ├── DriftList.tsx
              │     ├── FilterChips (all | push | pull | conflict)
              │     └── DriftRow (id, kind, direction, actions)
              └── ConflictResolver.tsx (modal or inline expand)
                    ├── ThreeColumnCompare
                    └── Actions: Keep Figma | Keep Repo | Custom | Skip
```

### 3. State model

```typescript
type ResolutionAction =
  | { type: 'push' }
  | { type: 'pull' }
  | { type: 'skip' }
  | { type: 'custom'; value: unknown };

interface ResolutionState {
  report: DriftReportV1;
  resolutions: Map<string, ResolutionAction>;
  filter: 'all' | 'push' | 'pull' | 'conflict';
}
```

**Bulk rules (FR-RES-3):**

- Bulk Push enabled when ≥1 push row selected AND zero selected conflicts unresolved
- Bulk Pull same for pull rows
- Conflict rows excluded from bulk until `Keep Figma` / `Keep Repo` / `Custom` sets resolution

### 4. Per-action side effects

| Action | Variable drift | Component drift | Snapshot |
| ------ | -------------- | --------------- | -------- |
| Push | Stage repo file diff for PR | Stage spec JSON update | update on PR merge confirmation OR optimistic on push commit |
| Pull | WO-008 `pushVariables(repoValues)` | Re-scaffold or patch bindings/props | update after apply success |
| Skip | none | none | none |
| Custom (conflict) | Write chosen value to both? → Push OR Pull based on choice | Same | update with chosen value |

**Pull apply component strategy (OQ-S6-4):**

- Matrix hash change → full re-scaffold (`scaffold()` pipeline)
- Props/bindings only → surgical API calls (WO-024 applyProperties, WO-023 applyBindings)

### 5. Bulk Push → PR

Reuse `src/io/github/createPullRequestFlow.ts`:

1. Collect all push resolutions
2. Build multi-file commit (tokens.json patches + component spec patches)
3. Single PR via WO-018 sink
4. Title from WO-031 pattern

**Message flow:** UI `resolution/bulk-push` → main aggregates → `github/create-pr`.

### 6. Bulk Pull → Figma

1. Partition pull resolutions by kind
2. Variables: batch canonical tokens → WO-008 push engine (inverse direction — apply repo to Figma)
3. Components: sequential scaffold/patch (avoid Figma API race)
4. On success: batch `updateSnapshotKeys`

### 7. Accessibility (ticket)

- Filter chips: `role="tablist"` pattern (mirror App.tsx nav)
- Hit targets ≥44×44 pt
- Conflict columns: keyboard navigable radio group for Keep Figma/Repo
- Live region announces count changes on re-detect

### 8. Testing strategy

| Layer | Coverage |
| ----- | -------- |
| Unit | DriftList filter logic, bulk enable rules, resolution reducer |
| Integration | Mock report 10 drifts (4 push, 3 pull, 3 conflict) — ticket AC |
| E2E manual | Designer resolves without leaving plugin |

Fixture: extend `drift-report-ac.json` to 10 entries for AC scenario.

---

## Validated evidence

### Repo inventory

| Exists | Path | Role |
| ------ | ---- | ---- |
| ✅ | `src/ui/components/ExportSheet.tsx` | Sink orchestration pattern |
| ✅ | `src/ui/tabs/Settings.tsx` | Host surface |
| ✅ | `src/io/github/createPullRequestFlow.ts` | Bulk PR |
| ✅ | `src/core/variables/push.ts` | Pull-apply variables |
| ✅ | `src/core/components/scaffold/pipeline.ts` | Re-scaffold |
| ❌ | `src/ui/components/DriftList.tsx` | Greenfield |
| ❌ | `src/ui/components/ConflictResolver.tsx` | Greenfield |
| ❌ | Resolution message types | Greenfield |

### Cross-ticket matrix

| Ticket | Role |
| ------ | ---- |
| WO-031 | DriftReport input |
| WO-008 | Variable pull apply |
| WO-018 | PR emission |
| WO-028/058 | Snapshot updates |
| WO-033 | Badge/on-open (absorbed into Settings) |

---

## Decision log

| ID | Decision | Rationale | Rejected |
| -- | -------- | --------- | -------- |
| D-032-1 | Settings-embedded panel | WO-033 absorption | Standalone Sync tab |
| D-032-2 | Session-only resolutions | Ticket out of scope | clientStorage persist |
| D-032-3 | Optimistic snapshot on pull | Immediate UX | Wait for PR merge on push only |
| D-032-4 | Surgical patch for props/bindings | Faster than full scaffold | Always re-scaffold |
| D-032-5 | Custom value JSON editor | Power users for conflicts | Skip-only conflicts |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-032-1 | Storybook-style: mock 10-drift report + resolve all | All actions set; bulk enabled correctly | ☐ pending |
| SPK-032-2 | Bulk push 2 variable drifts → test PR | Single PR, 2 files | ☐ deferred OAuth |
| SPK-032-3 | Bulk pull 2 variable drifts → sandbox | Figma values match repo | ☐ sandbox VQA |
| SPK-032-4 | 3 conflicts unresolved → bulk disabled | Buttons disabled | ☐ unit test |

---

## Risk register

| Risk | Sev | Lik | Mitigation |
| ---- | --- | --- | ---------- |
| Partial pull failure mid-batch | High | Med | Transaction log; rollback message; Figma undo |
| Push PR fails after snapshot update | Med | Low | Snapshot update only after PR success for push |
| Component patch vs scaffold wrong | Med | Med | Hash gate from WO-030 |
| UI overload 100+ drifts | Med | Low | Virtualize list; paginate |

---

## Recommendations

1. Add `src/ui/drift/resolutionReducer.ts` — pure state machine for resolutions.
2. Add `src/io/messages/drift.ts` — typed UI↔main messages.
3. Implement DriftList + ConflictResolver with existing FigHub token styles (inline styles like App.tsx).
4. Wire Settings repo card to show drift counts from cached report.
5. Figma VQA: capture plugin iframe screenshots for filter chips + conflict columns (fill ticket checklist during `/vqa`).

---

## Open questions

| ID | Question | Status |
| -- | -------- | ------ |
| OQ-032-1 | Custom value editor: raw JSON or typed form? | **Default:** typed by kind (color picker vs number); JSON fallback |
| OQ-032-2 | Push snapshot update timing | **RESOLVED:** on PR open success (not merge) — designer can revert via Skip next detect |

---

## Appendix A — Resolution message contract

```typescript
// src/io/messages/drift.ts (proposed)
type DriftDetectQuickRequest = { type: 'drift/detect-quick'; repoUrl: string };
type DriftDetectQuickResponse = {
  type: 'drift/detect-quick/result';
  summary: { push: number; pull: number; conflict: number };
  report?: DriftReportV1; // full report when panel open
};

type ResolutionBulkPushRequest = {
  type: 'resolution/bulk-push';
  driftIds: string[];
  resolutions: Record<string, ResolutionAction>;
};

type ResolutionBulkPullRequest = {
  type: 'resolution/bulk-pull';
  driftIds: string[];
  resolutions: Record<string, ResolutionAction>;
};
```

---

## Appendix B — Bulk enable rules (unit-test table)

| Selected rows | Any conflict unresolved? | Bulk Push | Bulk Pull |
| ------------- | ------------------------ | --------- | --------- |
| 4 push, 0 pull | no | enabled | disabled |
| 0 push, 3 pull | no | disabled | enabled |
| 2 push, 1 conflict (unresolved) | yes | disabled | disabled |
| 2 push, 1 conflict (resolved) | no | enabled | disabled |
| 0 selected | no | disabled | disabled |

