# Plan — WO-031: Drift report v1 emission

> **Ticket:** `.github/Sprint 6/WO-031-push-pull-conflict-classification-drift-report-v1-emission/ticket.md`
> **Research:** `research/drift-report-v1-emission.md`
> **Depends on:** WO-029, WO-030 detectors; WO-019/020/003 already shipped

---

## Approach

This ticket is **integration-heavy**: add a thin `buildDriftReport` aggregator in `src/core/drift/report.ts`, orchestrate live detection via new `drift/build-report` main-thread handler (calls WO-029 + WO-030), and route the resulting `DriftReportV1` through the **existing** format + ExportSheet + github-pr sink pipeline. No new markdown renderer — reuse `renderDriftReportMarkdown`. PR title/body helpers extend `prBody.ts` with drift-specific patterns. Wire `detect-drift` op from `opsProgram.v1` for programmatic invocation.

**In scope:** report builder, orchestration handler, message types, PR title helper, Export tab demo hook, schema validation test, ops program handler stub.

**Out of scope:** resolution UI (WO-032), detector logic changes (WO-029/030).

---

## AC traceability

| AC / Req | Plan step(s) |
| -------- | ------------ |
| Req 1 `buildDriftReport` | Steps 1–3 |
| Req 2 summary invariants | Step 2 |
| Req 3 sort drifts by id | Step 2 |
| Req 4 existing MD renderer | Steps 6, 9 |
| Req 5 JSON schema validation | Step 4 |
| Req 6 `drift/build-report` message | Steps 5, 7–8 |
| Req 7 PR title + dual files | Steps 10–11 |
| Req 8 `detect-drift` ops op | Step 12 |
| AC E2E json+md | Steps 9, 13 |
| AC GitHub MD preview | Step 14 (manual) |
| AC schema valid | Step 4 |

---

## Steps

### Phase A — Report builder

- [x] **Step 1** — Implement `src/core/drift/report.ts`:
  ```typescript
  export interface BuildDriftReportInput {
    variableDrifts: VariableDriftEntry[];
    componentDrifts: ComponentDriftEntry[];
    meta: DriftReportMeta;
    syncedCount: number;
  }

  export function buildDriftReport(input: BuildDriftReportInput): DriftReportV1
  ```
  **Done when:** file compiles; exported from `src/core/drift/index.ts`.

- [x] **Step 2** — Implement aggregation logic in `buildDriftReport`:
  - `drifts = [...variableDrifts, ...componentDrifts].sort((a,b) => a.id.localeCompare(b.id))`.
  - `summary.push/pull/conflict` = filter counts on `drifts`.
  - `summary.synced = input.syncedCount` (not derived from drifts length).
  - Assert invariant in dev: `summary.push + summary.pull + summary.conflict === drifts.length`.
  - Return `{ v:1, kind:'drift-report', meta, summary, drifts }`.
  **Done when:** `tests/unit/core/drift/report.test.ts` matches AC fixture counts (4 push, 2 pull, 1 conflict, 410 synced).

- [x] **Step 3** — Add helper `src/core/drift/reportMeta.ts`:
  ```typescript
  export function buildDriftReportMeta(repoUrl: string): DriftReportMeta
  ```
  - `generatedAt: new Date().toISOString()`.
  - `figmaFileKey: figma.fileKey || ''` (main thread only).
  - `repoUrl` from argument.
  **Done when:** unit test empty fileKey allowed (D-031-5).

### Phase B — Validation + format wiring

- [x] **Step 4** — Add schema validation test `tests/unit/core/drift/report.schema.test.ts`:
  - Load `packages/contracts/dist/driftReport.v1.schema.json` (build contracts if missing).
  - AJV validate output of `buildDriftReport` using `src/io/formats/__fixtures__/drift-report-ac.json` shaped inputs.
  **Done when:** validate returns true; ticket AC schema gate met.

- [x] **Step 5** — Extend `src/io/messages/drift.ts`:
  ```typescript
  export interface DriftBuildReportMessage {
    type: 'drift/build-report';
    requestId: string;
    repoUrl: string;
    repoTokens: TokensV1;
    repoSpecs: Array<{ name: string; spec: ComponentSpecV1 }>;
    quickDetect?: boolean;
  }

  export interface DriftBuildReportResultMessage {
    type: 'drift/build-report/result';
    requestId: string;
    ok: boolean;
    report?: DriftReportV1;
    error?: string;
  }
  ```
  - Guards: `isDriftBuildReportMessage`, `isDriftBuildReportResultMessage`.
  **Done when:** `tests/unit/io/messages/drift.test.ts` guard coverage.

### Phase C — Orchestration handler

- [x] **Step 6** — Add `src/core/drift/runDetectDrift.ts` (main-thread orchestrator):
  ```typescript
  export async function runDetectDrift(input: {
    repoTokens: TokensV1;
    repoSpecs: Array<{ name: string; spec: ComponentSpecV1 }>;
    repoUrl: string;
    quickDetect?: boolean;
  }): Promise<DriftReportV1>
  ```
  - Call internal variable detect (figma read + snapshot + repo tokens).
  - Call internal component detect (figma scan + snapshot + repo specs).
  - Merge synced counts: `syncedCount = varResult.syncedCount + cmpResult.syncedCount`.
  - `buildDriftReport({ variableDrifts: varResult.drifts, componentDrifts: cmpResult.drifts, meta: buildDriftReportMeta(repoUrl), syncedCount })`.
  - `pluginLog('[drift] build-report', summary counts)`.
  **Done when:** unit test with mocked detect functions (inject via parameters or test-only exports).

- [x] **Step 7** — Wire `handleDriftBuildReport` in `src/main.ts`:
  - Register `isDriftBuildReportMessage` in `figma.ui.onmessage`.
  - Invoke `runDetectDrift`; post `drift/build-report/result`.
  - ES2017-safe error extraction.
  **Done when:** integration test posts message and receives report.

- [x] **Step 8** — Add UI helper `src/ui/drift/loadDriftReport.ts`:
  ```typescript
  export async function requestDriftReport(input: {
    repoUrl: string;
    repoTokens: TokensV1;
    repoSpecs: Array<{ name: string; spec: ComponentSpecV1 }>;
  }): Promise<DriftReportV1>
  ```
  - postMessage + await `drift/build-report/result` (mirror `loadRegistryFromSnapshot` pattern).
  **Done when:** unit test with mocked postMessage.

### Phase D — Export + PR emission

- [x] **Step 9** — Add `src/ui/drift/prepareDriftExport.ts`:
  ```typescript
  export function prepareDriftExport(report: DriftReportV1, options?: { defaultSinks?: SinkId[] })
  ```
  - Returns `{ document: ContractDocument, title, defaultSinks }` using `kind: 'drift-report'`.
  - Title: `'DesignOps drift: ' + push + ' push, ' + pull + ' pull, ' + conflict + ' conflicts'`.
  - Default sinks: same pattern as registry export sandbox (`download`, optional `github-pr`).
  **Done when:** `tests/unit/ui/drift/prepareDriftExport.test.tsx`.

- [x] **Step 10** — Extend `src/io/github/prBody.ts`:
  ```typescript
  export function buildDriftReportPrTitle(summary: DriftReportSummary, sprintLabel?: string): string
  ```
  - Pattern: `DesignOps drift: N push, M pull, K conflicts` (+ optional sprint suffix).
  **Done when:** unit test title string.

- [x] **Step 11** — Verify dual-file export paths in `src/ui/export/defaultPaths.ts`:
  - Confirm `drift-report` case returns `docs/fighub/drift-{date}` (already exists).
  - Document in Notes that PR commits both `.v1.json` and `.v1.md`.
  **Done when:** existing `defaultPaths.test.ts` still green; no code change required if path already correct.

- [x] **Step 12** — Wire `detect-drift` op in `src/main.ts` ops program dispatcher:
  - On op `{ type: 'detect-drift' }`: call `runDetectDrift` with payload from op args (define minimal args: repoUrl + inline tokens/specs refs).
  - Post result to UI or return via ops program step callback (match existing bootstrap op pattern in `main.ts`).
  **Done when:** `tests/unit/main/opsProgram.detect-drift.test.ts` or message-level test.

### Phase E — Demo + E2E + VQA

- [x] **Step 13** — Add Export tab demo entry in `src/ui/tabs/ExportSandbox.tsx`:
  - Button "Build live drift report (mock)" calling `requestDriftReport` with fixture tokens/specs OR static sample until OAuth repo connected.
  - Opens ExportSheet with `prepareDriftExport` result.
  **Done when:** manual smoke — Export tab shows drift ExportSheet.

- [x] **Step 14** — E2E test `tests/integration/core/drift/driftReportEmission.integration.test.ts`:
  - Mock variable + component drift arrays → `buildDriftReport` → `format()` json + md → assert headings `## ↑ Push`, `## ↓ Pull`, `## ⚠ Conflicts` via existing markdown renderer.
  **Done when:** SPK-031-1 pass criteria.

- [x] **Step 15** — Manual VQA checklist (document in plan Notes execution):
  - Copy rendered MD to GitHub issue comment preview; tables readable.
  - SPK-031-2 deferred if no OAuth — skip with note.
  - **Script documented:** `research/vqa-report.md` § Manual `/vqa` checklist.

- [x] **Step 16** — CI gate: `npm run typecheck && npm test -- tests/unit/core/drift/report tests/unit/ui/drift tests/integration/core/drift/driftReportEmission`.

---

## Build Agents

### Phase 1 (sequential)

- `code-build` — **Steps 1–3:** report builder + meta helper.

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 4–5:** schema test + message types.
- `code-build` — **Step 9:** prepareDriftExport UI helper.

### Phase 3 (after WO-029/030 handlers exist)

- `code-build` — **Steps 6–8:** orchestrator + main handler + UI loader.

### Phase 4 (parallel)

- `code-build` — **Steps 10–12:** PR title + ops op wiring.
- `code-build` — **Step 11:** defaultPaths verification.

### Phase 5

- `code-build` — **Steps 13–16:** Export demo, E2E test, CI gate.

**Hard dependency:** Steps 6–7 require WO-029 Step 12 and WO-030 Step 11 merged.

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-029 | VariableDriftEntry[] |
| WO-030 | ComponentDriftEntry[] |
| WO-019 `renderDriftReportMarkdown` | MD output |
| WO-020 ExportSheet | UI emission |
| WO-018 github-pr sink | PR path |
| WO-003 contracts + schema | Validation |

**Tools:** Vitest, AJV, optional `gh` for manual PR VQA.

---

## Open Questions

| ID | Question | Status |
| -- | -------- | ------ |
| OQ-031-1 | Sprint label in PR title? | **RESOLVED:** optional meta — omit if unknown |
| OQ-031-2 | Date in filename? | **RESOLVED:** `drift-YYYY-MM-DD` via defaultPaths |

---

## Notes

- **No new MD renderer** (D-031-1) — extend tests only.
- **Summary invariant** enforced in unit test to catch WO-029/030 regressions.
- **figmaFileKey empty** on Untitled files is expected — do not block report.

### Wrong vs correct

| Wrong | Correct |
| ----- | ------- |
| New `renderDriftReportMarkdown` copy | Import existing from `@/io/formats/markdown/driftReport` |
| Include synced rows in drifts[] | summary.synced only |
| Detector logic inside report.ts | Orchestrator calls detectors then builder |
| PR commits MD only | JSON + MD dual format (D-031-4) |

### Module tree

```
src/core/drift/
  report.ts
  reportMeta.ts
  runDetectDrift.ts
src/ui/drift/
  loadDriftReport.ts
  prepareDriftExport.ts
tests/unit/core/drift/
  report.test.ts
  report.schema.test.ts
tests/integration/core/drift/
  driftReportEmission.integration.test.ts
```

### Bibliography

- `research/drift-report-v1-emission.md`
- `src/io/formats/__fixtures__/drift-report-ac.json`
- `tests/unit/io/formats/driftReport.test.ts`
