# Plan — WO-032: Resolution UI (per-drift + bulk conflict resolver)

> **Ticket:** `.github/Sprint 6/WO-032-resolution-ui-per-drift-bulk-conflict-resolver/ticket.md`
> **Research:** `research/resolution-ui-per-drift-bulk-conflict-resolver.md`
> **Depends on:** WO-031 report, WO-008 push, WO-018 PR, WO-058 snapshot updates

---

## Approach

Build the **drift resolution UX** as an expandable panel on the Settings repo card (WO-033 absorbed — no Sync tab): filter chips, per-row Push/Pull/Skip, bulk Push→PR and Pull→apply, and inline **ConflictResolver** with 3-column compare. State lives in `resolutionReducer.ts` (session-only `Map<driftId, ResolutionAction>`). Bulk actions call new main-thread handlers that stage multi-file PRs (WO-018) or apply repo values to Figma (WO-008 variables + surgical component patch / re-scaffold). Successful resolutions update canvas snapshot via `updateSnapshotKeys` (pull immediately; push on PR open success per D-032-2).

**Phased delivery:** Phase 1 ships read-only DriftList + detect hook (depends on WO-031). Phase 2 adds per-row + conflict resolver. Phase 3 adds bulk push/pull + snapshot updates (partial WO-058 Phase 2 repo card host — stub repo card section if WO-058 Phase 2 not merged).

**Out of scope:** cross-session resolution persistence, undo beyond Figma native undo.

---

## AC traceability

| AC / Req | Plan step(s) |
| -------- | ------------ |
| Req 1 DriftList.tsx | Steps 4–6 |
| Req 2 ConflictResolver.tsx | Steps 7–9 |
| Req 3 resolutionReducer | Steps 2–3 |
| Req 4 Settings host (not Sync tab) | Steps 10–11 |
| Req 5 bulk Push → PR | Steps 12–14 |
| Req 6 bulk Pull → apply | Steps 15–17 |
| Req 7 bulk disabled on unresolved conflicts | Step 3, 6 |
| Req 8 snapshot updateSnapshotKeys | Steps 14, 17 |
| Req 9 drift messages | Steps 1, 12–17 |
| AC 10-drift E2E | Step 20 |
| AC bulk Push single PR | Step 19 |
| AC bulk Pull applies Figma | Step 19 |
| AC conflict blocks bulk | Step 18 |

---

## Steps

### Phase A — Message contracts + reducer

- [x] **Step 1** — Expand `src/io/messages/drift.ts` with resolution types:
  ```typescript
  export type ResolutionAction =
    | { type: 'push' }
    | { type: 'pull' }
    | { type: 'skip' }
    | { type: 'custom'; value: unknown };

  export interface DriftDetectQuickMessage {
    type: 'drift/detect-quick';
    requestId: string;
    repoUrl: string;
    repoTokens: TokensV1;
    repoSpecs: Array<{ name: string; spec: ComponentSpecV1 }>;
  }

  export interface DriftDetectQuickResultMessage {
    type: 'drift/detect-quick/result';
    requestId: string;
    ok: boolean;
    summary?: DriftReportSummary;
    report?: DriftReportV1;
    error?: string;
  }

  export interface ResolutionBulkPushMessage {
    type: 'resolution/bulk-push';
    requestId: string;
    repoUrl: string;
    report: DriftReportV1;
    resolutions: Record<string, ResolutionAction>;
    driftIds: string[];
  }

  export interface ResolutionBulkPullMessage {
    type: 'resolution/bulk-pull';
    requestId: string;
    report: DriftReportV1;
    resolutions: Record<string, ResolutionAction>;
    driftIds: string[];
  }

  export interface ResolutionBulkResultMessage {
    type: 'resolution/bulk-result';
    requestId: string;
    ok: boolean;
    prUrl?: string;
    appliedCount?: number;
    error?: string;
  }
  ```
  - Type guards for each message type.
  **Done when:** `tests/unit/io/messages/drift.resolution.test.ts`.

- [x] **Step 2** — Create `src/ui/drift/resolutionReducer.ts`:
  ```typescript
  export type DriftFilter = 'all' | 'push' | 'pull' | 'conflict';

  export interface ResolutionState {
    report: DriftReportV1 | null;
    filter: DriftFilter;
    selectedIds: Set<string>;
    resolutions: Map<string, ResolutionAction>;
    loading: boolean;
    error: string | null;
  }

  export type ResolutionAction =
    | { type: 'report/loaded'; report: DriftReportV1 }
    | { type: 'filter/set'; filter: DriftFilter }
    | { type: 'row/toggle'; driftId: string }
    | { type: 'row/resolve'; driftId: string; action: ResolutionAction }
    | { type: 'bulk/select-direction'; direction: 'push' | 'pull' }
    | { type: 'detect/start' }
    | { type: 'detect/error'; message: string };

  export function reduceResolution(state: ResolutionState, action: ResolutionAction): ResolutionState
  export function createInitialResolutionState(): ResolutionState
  ```
  **Done when:** pure reducer tests — no React imports.

- [x] **Step 3** — Add selectors in `src/ui/drift/resolutionSelectors.ts`:
  ```typescript
  export function filteredDrifts(state: ResolutionState): DriftEntry[]
  export function canBulkPush(state: ResolutionState): boolean
  export function canBulkPull(state: ResolutionState): boolean
  export function unresolvedConflictSelected(state: ResolutionState): boolean
  ```
  - **Bulk rules (FR-RES-3):** bulk push enabled when ≥1 selected push row AND no selected conflict row lacks resolution `{ type: 'custom' | 'push' | 'pull' | 'skip' }` with non-skip for conflicts.
  - Implement truth table from research Appendix B as unit tests.
  **Done when:** `tests/unit/ui/drift/resolutionSelectors.test.ts` — SPK-032-4.

### Phase B — DriftList UI

- [x] **Step 4** — Create `src/ui/components/DriftList.tsx`:
  ```typescript
  export interface DriftListProps {
    drifts: DriftEntry[];
    filter: DriftFilter;
    selectedIds: Set<string>;
    resolutions: Map<string, ResolutionAction>;
    onFilterChange: (filter: DriftFilter) => void;
    onToggleSelect: (driftId: string) => void;
    onRowAction: (driftId: string, action: 'push' | 'pull' | 'skip') => void;
    onOpenConflict: (driftId: string) => void;
  }
  ```
  - Filter chips: All | Push ↑ | Pull ↓ | Conflict ⚠ — `role="tablist"`, buttons min 44×44px touch target.
  - Row: id, kind badge, direction icon, per-row Push/Pull/Skip buttons (disabled when direction mismatch).
  - Conflict rows: "Resolve…" opens ConflictResolver.
  **Done when:** `tests/unit/ui/components/DriftList.test.tsx` RTL render + chip filter.

- [x] **Step 5** — Create `src/ui/components/DriftSummaryBadge.tsx`:
  ```typescript
  export function DriftSummaryBadge(props: { summary: DriftReportSummary | null })
  ```
  - Display `4↑ 2↓ 1⚠` compact counts; `role="status"`.
  **Done when:** snapshot test or RTL assert text.

- [x] **Step 6** — Wire list + badge into panel shell `src/ui/components/DriftPanel.tsx`:
  - Props: `report`, `state`, `dispatch` from reducer.
  - Bulk action bar: Push selected → PR | Pull selected → apply — disabled via selectors.
  **Done when:** Storybook-style test with mock 10-drift report (4 push, 3 pull, 3 conflict).

### Phase C — ConflictResolver

- [x] **Step 7** — Create `src/ui/components/ConflictResolver.tsx`:
  ```typescript
  export interface ConflictResolverProps {
    drift: DriftEntry;
    onKeepFigma: () => void;
    onKeepRepo: () => void;
    onSkip: () => void;
    onCustom?: (value: unknown) => void;
    onClose: () => void;
  }
  ```
  - Three columns: Last synced | Figma | Repo — render JSON truncated (reuse truncate pattern from drift MD renderer logic or simple `JSON.stringify` preview max 200 chars).
  - Actions: Keep Figma (→ push resolution), Keep Repo (→ pull), Skip, optional Custom JSON textarea fallback (OQ-032-1).
  **Done when:** RTL test button callbacks.

- [x] **Step 8** — Accessibility:
  - Conflict action group: `role="radiogroup"` with `aria-label="Resolution choice"`.
  - Focus trap within expanded resolver panel.
  **Done when:** axe or manual checklist noted in VQA.

- [x] **Step 9** — Integrate resolver as inline expand below conflict row OR modal overlay (default: inline expand to avoid new portal complexity).

### Phase D — Settings host

- [x] **Step 10** — Add `src/ui/components/RepoSyncCard.tsx` stub (minimal — expanded in WO-058 Phase 2):
  - Shows repo display name, Connect status, placeholder Fetch/Pull/Push buttons (disabled until WO-058 Phase 2).
  - Embeds `<DriftPanel />` below fold with "Detect drift" button calling `requestDriftReport`.
  **Done when:** Settings renders card without breaking existing OAuth section.

- [x] **Step 11** — Update `src/ui/tabs/Settings.tsx`:
  - Replace tokens-only layout section with `RepoSyncCard` when `github.connected`.
  - Keep existing OAuth + smoke test sections below.
  - Optional: Settings nav badge count from `DriftSummaryBadge` summary (WO-033 tail).
  **Done when:** App.tsx compiles; no Sync tab added.

- [ ] **Step 12** — Add `src/ui/drift/useDriftDetect.ts` hook:
  - On mount (when repo connected): fire `drift/detect-quick` with cached tokens/specs from session OR skip until Fetch (WO-058 Phase 2).
  - Returns `{ summary, report, refresh }`.
  **Done when:** unit test mock postMessage.

### Phase E — Bulk Push (main thread)

- [x] **Step 13** — Implement `src/core/drift/applyPushResolutions.ts` (main):
  ```typescript
  export function buildPushCommitFiles(
    report: DriftReportV1,
    resolutions: Record<string, ResolutionAction>,
    driftIds: string[],
  ): Array<{ path: string; content: string; format: 'json' }>
  ```
  - Variable push rows: emit patched tokens JSON slice or full tokens file from repo canonical values.
  - Component push rows: emit updated `ComponentSpecV1` JSON under specs path convention `components/{kebab}.json`.
  **Done when:** unit test 2 variable + 1 component files staged.

- [x] **Step 14** — Implement `handleResolutionBulkPush` in `src/main.ts`:
  - Build files via Step 13.
  - Call `createPullRequestFlow` (WO-018) with title from `buildDriftReportPrTitle`.
  - On PR open success: `updateSnapshotKeys` for each pushed drift with `{ source: 'push', value: repo side }`.
  - Post `resolution/bulk-result` with `prUrl`.
  **Done when:** integration test mocks PR flow.

### Phase F — Bulk Pull (main thread)

- [x] **Step 15** — Implement `src/core/drift/applyPullResolutions.ts`:
  ```typescript
  export async function applyVariablePullDrifts(
    drifts: VariableDriftEntry[],
  ): Promise<number>

  export async function applyComponentPullDrifts(
    drifts: ComponentDriftEntry[],
  ): Promise<number>
  ```
  - Variables: map repo comparable → token push input → call `pushTokens` / internal push engine with repo values (inverse of push direction).
  - Components: if matrix hash differs → queue full `runScaffoldComponent` with repo spec; else call `applyProperties` + `applyBindings` surgical path (D-032-4).
  **Done when:** unit tests with mocked scaffold/push.

- [x] **Step 16** — Implement `handleResolutionBulkPull` in `src/main.ts`:
  - Partition selected drifts by kind; sequential component applies.
  - On success: batch `updateSnapshotKeys` with `{ source: 'pull', value: applied canonical }`.
  - Partial failure: return error with `appliedCount` (risk: document Figma undo in error message).
  **Done when:** handler test with mocks.

- [x] **Step 17** — Wire UI bulk buttons in `DriftPanel.tsx`:
  - postMessage bulk push/pull; await result; refresh detect on success.
  **Done when:** integration test UI posts correct message shape.

### Phase G — AC fixtures + VQA

- [x] **Step 18** — Extend `src/io/formats/__fixtures__/drift-report-ac.json` to 10 entries (4 push, 3 pull, 3 conflict) for AC scenario — or new `drift-report-resolution-ac.json`.

- [x] **Step 19** — Integration `tests/integration/ui/drift/resolutionFlow.integration.test.tsx`:
  - Render DriftPanel with 10-drift fixture; resolve all conflicts; assert bulk buttons enable; mock bulk push/pull handlers.
  **Done when:** ticket AC table satisfied in automated test except OAuth PR.

- [x] **Step 20** — Manual designer VQA script (execute during `/vqa`):
  1. Connect GitHub; open Settings drift panel.
  2. Detect drift on sandbox file with known fixture.
  3. Resolve 10 drifts without leaving plugin.
  4. Bulk Push opens single PR (OAuth sandbox).
  5. Bulk Pull updates variables in Figma.
  - Fill ticket Figma VQA checklist table.
  - **Script documented:** `research/vqa-report.md` § Manual `/vqa` script.

- [x] **Step 21** — CI gate: `npm run test:sprint6-drift` (alias for plan command).

---

## Build Agents

### Phase 1 (parallel — foundation)

- `code-build` — **Steps 1–3:** messages, reducer, selectors.

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 4–6:** DriftList, badge, DriftPanel shell.
- `code-build` — **Steps 7–9:** ConflictResolver.

### Phase 3 (after WO-031 merged)

- `code-build` — **Steps 10–12:** Settings host + detect hook.

### Phase 4 (sequential — main thread side effects)

- `code-build` — **Steps 13–14:** bulk push staging + handler.
- `code-build` — **Steps 15–17:** bulk pull apply + UI wire.

### Phase 5

- `code-build` — **Steps 18–21:** AC fixture, integration tests, CI, VQA doc.

**Cross-ticket:** WO-058 Phase 2 can replace RepoSyncCard stub (Step 10) without changing DriftPanel API.

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-031 | DriftReportV1 input |
| WO-008 `pushTokens` | Variable pull apply |
| WO-018 `createPullRequestFlow` | Bulk push PR |
| WO-058 `updateSnapshotKeys` | Post-resolution snapshot |
| WO-058 Phase 2 | Full Fetch/Pull/Push card (stub OK for Phase 1) |
| WO-030 hash gate | Component pull scaffold vs surgical |

**Tools:** Vitest + RTL; Figma desktop for manual VQA; `gh` optional for PR verify.

---

## Open Questions

| ID | Question | Status |
| -- | -------- | ------ |
| OQ-032-1 | Custom value editor UX | **Default:** Keep Figma / Keep Repo primary; JSON textarea fallback for custom |
| OQ-032-2 | Push snapshot timing | **RESOLVED:** update on PR open success |
| OQ-S6-4 | Surgical vs re-scaffold on pull | **RESOLVED:** hash change → re-scaffold; props/bindings only → surgical (Step 15) |

---

## Notes

### Thread split

| Layer | Location | Syntax |
| ----- | -------- | ------ |
| Reducer, DriftList, ConflictResolver | UI iframe | Modern TS |
| applyPush/Pull, snapshot updates | main.ts | ES2017, `pluginLog()` |

### Style tokens

Match existing Settings/App inline styles: 11px body, 13px headings, `#ccc` borders, 4px radius, 44px min button height for a11y AC.

### Wrong vs correct

| Wrong | Correct |
| ----- | ------- |
| New Sync tab in App.tsx | DriftPanel inside Settings |
| Persist resolutions to clientStorage | Session-only Map (ticket out of scope) |
| Snapshot update before PR opens on push | updateSnapshotKeys after PR open success |
| Always full re-scaffold on component pull | Hash gate from WO-030 |

### Module tree

```
src/ui/components/
  DriftList.tsx
  DriftSummaryBadge.tsx
  DriftPanel.tsx
  ConflictResolver.tsx
  RepoSyncCard.tsx
src/ui/drift/
  resolutionReducer.ts
  resolutionSelectors.ts
  useDriftDetect.ts
src/core/drift/
  applyPushResolutions.ts
  applyPullResolutions.ts
tests/unit/ui/drift/
  resolutionReducer.test.ts
  resolutionSelectors.test.ts
tests/unit/ui/components/
  DriftList.test.tsx
  ConflictResolver.test.tsx
tests/integration/ui/drift/
  resolutionFlow.integration.test.tsx
```

### Bibliography

- `research/resolution-ui-per-drift-bulk-conflict-resolver.md`
- `../WO-033-sync-tab-ui-on-open-badge/research/sync-tab-ui-on-open-badge.md`
- `../../Sprint 5/WO-058-github-desktop-style-sync/research/github-desktop-style-sync.md`
