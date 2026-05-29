# Plan — WO-029: Variable drift detector (3-way)

> **Ticket:** `.github/Sprint 6/WO-029-variable-drift-detector-3-way/ticket.md`
> **Research:** `research/variable-drift-detector-3-way.md`
> **Depends on:** WO-058 Phase 1 snapshot store (shipped), WO-008 push/compare primitives

---

## Approach

Implement a **pure, testable** variable drift detector under `src/core/drift/` that classifies each token key as **push**, **pull**, **conflict**, or **synced** using locked 3-way merge semantics against the canvas snapshot common ancestor. Normalize Figma and repo sides to flat slash keys `{collectionName}/{variableName}`, reuse `valuesEqual` semantics from `src/core/variables/compare.ts`, and emit `VariableDriftEntry[]` for WO-031. Synced rows are counted in summary only — omitted from `drifts[]`. A thin main-thread handler `drift/detect-variables` reads live Figma state via `readFigmaVariableState()` and snapshot variable keys via `getSnapshot().keys` with prefix `var/`.

**In scope:** `classify.ts`, `variables.ts`, types, fixtures, unit + integration tests, main message handler.

**Out of scope (ticket):** component drift (WO-030), resolution UI (WO-032), report aggregation / PR (WO-031), repo Fetch cache (WO-058 Phase 2 — tests pass repo tokens inline).

---

## AC traceability

| AC / Req                                | Plan step(s) |
| --------------------------------------- | ------------ |
| Req 1 `classify.ts` shared              | Steps 1–2    |
| Req 2 `variables.ts` detector           | Steps 3–8    |
| Req 3 slash key namespace               | Step 4       |
| Req 4 reuse compare.ts                  | Steps 3, 5   |
| Req 5 classification table              | Steps 2, 6   |
| Req 6 missing snapshot → S:=R           | Step 2       |
| Req 7 repo adapt → flatten              | Step 7       |
| Req 8 Figma flatten from audit read     | Step 6       |
| Req 9 report id prefix `var/`           | Step 8       |
| Req 10 message `drift/detect-variables` | Steps 11–12  |
| Req 11 WO-031 integration               | Step 8       |
| AC 10-var fixture                       | Steps 9–10   |
| AC 400-var <2s                          | Step 10      |
| AC integration sample repo + Figma      | Step 13      |

---

## Steps

### Phase A — Shared classifier + types

- [x] **Step 1** — Add `src/core/drift/types.ts`:

  ```typescript
  export type DriftDirection = 'push' | 'pull' | 'conflict' | 'synced';

  export interface VariableComparable {
    valuesByMode: Record<string, VariableValue>;
    codeSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>;
    resolvedType: VariableResolvedDataType;
  }

  export interface VariableDriftDetectInput {
    repoTokens: Record<string, VariableComparable>;
    figmaTokens: Record<string, VariableComparable>;
    snapshotTokens: Record<string, VariableComparable>;
  }

  export interface VariableDriftDetectResult {
    drifts: import('@detroitlabs/fighub-contracts').VariableDriftEntry[];
    syncedCount: number;
  }
  ```

  **Done when:** `npm run typecheck` passes; no Plugin API imports in this file.

- [x] **Step 2** — Implement `src/core/drift/classify.ts`:

  ```typescript
  export function classifyThreeWay<T>(
    figma: T | null,
    repo: T | null,
    snapshot: T | null,
    equal: (a: T, b: T) => boolean,
  ): DriftDirection;
  ```

  - Missing snapshot baseline: `const baseline = snapshot !== null ? snapshot : repo` (PRD risk row — D-029-3).
  - Apply locked table from research Appendix B; null-present keys use presence rules from research §1 edge table.
  - Export `isSynced(direction: DriftDirection): boolean`.
    **Done when:** `tests/unit/core/drift/classify.test.ts` covers all four directions + both-moved-same-way synced + missing snapshot baseline.

- [x] **Step 3** — Add `src/core/drift/variableEqual.ts`:

  ```typescript
  export function variableStatesEqual(a: VariableComparable, b: VariableComparable): boolean;
  ```

  - Compare `resolvedType` first (mismatch → false).
  - For each mode in union of `valuesByMode` keys, use `valuesEqual` from `@/core/variables/compare`.
  - Compare `codeSyntax` triple (WEB/ANDROID/iOS) with empty-string default for missing platform.
    **Done when:** `tests/unit/core/drift/variableEqual.test.ts` — color epsilon, alias id match, codeSyntax mismatch.

### Phase B — Flatten + detect

- [x] **Step 4** — Add `src/core/drift/variableKeys.ts`:

  ```typescript
  export function toVariableDriftId(collectionName: string, variableName: string): string;
  export function parseVariableDriftId(
    id: string,
  ): { collectionName: string; variableName: string } | null;
  ```

  - Key format: `{collectionName}/{variableName}` (Figma slash paths — never dots).
  - Report id: `'var/' + key`.
    **Done when:** unit test round-trip; rejects dot-only legacy keys.

- [x] **Step 5** — Implement flatten helpers in `src/core/drift/variables.ts`:

  ```typescript
  export function flattenFigmaVariableSnapshots(
    collections: FigmaCollectionSnapshot[],
  ): Record<string, VariableComparable>;

  export function flattenRepoTokens(tokens: TokensV1): Record<string, VariableComparable>;
  ```

  - Figma: map each `FigmaVariableSnapshot` using `collectionName + '/' + name` (strip leading slash if present).
  - Repo: walk `TokensV1.collections` + `tokens` using same mode-name keys as push engine (`src/core/variables/collections.ts` mode map); resolve aliases via existing adapter path where needed.
    **Done when:** `tests/unit/core/drift/variables.flatten.test.ts` with minimal TokensV1 + mock Figma snapshots.

- [x] **Step 6** — Implement snapshot token read in `src/core/drift/snapshotTokens.ts`:

  ```typescript
  export function readVariableSnapshotTokens(): Record<string, VariableComparable>;
  ```

  - Read `getSnapshot().keys`; filter keys starting with `var/`; parse value as `VariableComparable`.
  - Missing or corrupt entry → omit (classifier treats as missing snapshot for that key).
    **Done when:** unit test with mocked snapshot frame pluginData (reuse `snapshotStore` test harness).

- [x] **Step 7** — Implement core detector in `src/core/drift/variables.ts`:

  ```typescript
  export function detectVariableDrift(input: VariableDriftDetectInput): VariableDriftDetectResult;
  ```

  - Union all keys from figma, repo, snapshot maps.
  - For each key: `classifyThreeWay(figma[key], repo[key], snapshot[key], variableStatesEqual)`.
  - Build `VariableDriftEntry` with `id: toVariableDriftId(...)`, `kind: 'variable'`, triple payloads (`figma`, `repo`, `lastSynced`).
  - Omit `synced` from `drifts[]`; increment `syncedCount`.
    **Done when:** passes AC fixture (Step 9).

- [x] **Step 8** — Add `src/core/drift/index.ts` barrel exporting classify, variables, types, snapshotTokens.

### Phase C — Fixtures + tests

- [x] **Step 9** — Create `tests/fixtures/drift/variable-drift-ac-10.v1.json`:
  - Input maps for figma/repo/snapshot matching research Appendix A (3 push, 2 pull, 1 conflict, 4 synced).
  - Expected `drifts` length 6; `syncedCount` 4.
    **Done when:** referenced by detector test; counts match ticket AC.

- [x] **Step 10** — Add `tests/unit/core/drift/variables.detect.test.ts`:
  - Load AC fixture; assert directions and ids.
  - Bench: synthetic 400-key maps; assert detect-only < 100ms (Vitest `performance.now()`).
    **Done when:** SPK-029-1 + SPK-029-2 pass criteria met.

- [x] **Step 11** — Add `src/io/messages/drift.ts` (partial — variable detect only):

  ```typescript
  export interface DriftDetectVariablesMessage {
    type: 'drift/detect-variables';
    requestId: string;
    repoTokens: TokensV1; // UI passes adapted tokens from GitHub fetch
  }
  export interface DriftDetectVariablesResultMessage {
    type: 'drift/detect-variables/result';
    requestId: string;
    ok: boolean;
    result?: VariableDriftDetectResult;
    error?: string;
  }
  ```

  - Type guards mirroring `snapshot.ts` pattern.
    **Done when:** guards exported; no handler yet.

- [x] **Step 12** — Wire `handleDriftDetectVariables` in `src/main.ts`:
  - On message: `readFigmaVariableState()` → flatten; `readVariableSnapshotTokens()`; flatten repo from message payload.
  - Call `detectVariableDrift`; post result.
  - Use `pluginLog()` only (ES2017 — no `?.`/`??`).
    **Done when:** `tests/unit/io/messages/drift.detect-variables.test.ts` with mocked figma globals OR integration test posting message.

- [x] **Step 13** — Add `tests/integration/core/drift/variableDrift.integration.test.ts`:
  - Inline repo fixture + mock Figma snapshot arrays (no live Figma).
  - End-to-end: adapt wire JSON → detect → assert 6 drift rows.
    **Done when:** `npm test -- tests/unit/core/drift tests/integration/core/drift/variableDrift` green.

- [x] **Step 14** — CI gate: `npm run typecheck && npm test -- tests/unit/core/drift tests/integration/core/drift/variableDrift`.
      **Done when:** all green; no `.fighub-registry` references introduced.

---

## Build Agents

### Phase 1 (sequential — shared foundation)

- `code-build` — **Steps 1–3:** drift types, `classifyThreeWay`, `variableStatesEqual`.

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 4–6:** key helpers, flatten functions, snapshot token reader.

### Phase 3 (sequential, after Phase 2)

- `code-build` — **Steps 7–8:** `detectVariableDrift` + barrel export.

### Phase 4 (parallel, after Phase 3)

- `code-build` — **Steps 9–10:** AC fixture + unit/bench tests.
- `code-build` — **Steps 11–12:** drift messages + main handler.

### Phase 5 (after Phase 4)

- `code-build` — **Steps 13–14:** integration test + CI gate.

---

## Dependencies & Tools

| Dependency                                       | Status     | Usage                                                 |
| ------------------------------------------------ | ---------- | ----------------------------------------------------- |
| WO-058 Phase 1 `snapshotStore.ts`                | ✅ shipped | `getSnapshot()`, `updateSnapshotKeys` (future WO-032) |
| WO-008 `compare.ts`, `readFigmaVariableState.ts` | ✅ shipped | Equality + Figma read                                 |
| WO-031                                           | downstream | Consumes `VariableDriftEntry[]`                       |
| WO-030                                           | parallel   | Shares `classify.ts` — coordinate merge order         |
| `@detroitlabs/fighub-contracts`                  | ✅         | `VariableDriftEntry`, `TokensV1`                      |

**Tools:** Vitest only. No Figma MCP for unit tests; optional sandbox VQA post-build.

---

## Open Questions

| ID       | Question                                       | Status                                                                         |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| OQ-029-1 | Include codeSyntax in drift compare?           | **RESOLVED:** yes — Step 3                                                     |
| OQ-029-2 | Remote-only tokens outside 5-collection model? | **RESOLVED:** union all keys — Step 7                                          |
| OQ-029-3 | Who fetches repo tokens for detect?            | **RESOLVED:** UI passes `TokensV1` on message until WO-058 Phase 2 Fetch cache |

---

## Notes

- **ES2017** in `src/main.ts` and any main-thread drift helpers called from main.
- **Pure detector** — `detectVariableDrift` has zero `figma.*` calls; testable in Node.
- **Snapshot key convention:** persist comparable at `var/{collection}/{name}` via `updateSnapshotKeys` after first successful sync (WO-032 pull/push); until then missing snapshot → S:=R.
- **Wrong vs correct:**

| Wrong                           | Correct                                       |
| ------------------------------- | --------------------------------------------- |
| Dot-separated token keys        | Slash paths matching Figma `variable.name`    |
| Duplicate equality logic        | Reuse `valuesEqual` via `variableStatesEqual` |
| List 410 synced rows in report  | Summary count only (D-029-4)                  |
| Fetch repo inside main detector | UI supplies adapted `TokensV1` on message     |

### Module tree

```
src/core/drift/
  classify.ts
  types.ts
  variableEqual.ts
  variableKeys.ts
  variables.ts
  snapshotTokens.ts
  index.ts
src/io/messages/
  drift.ts          # partial — extended by WO-031/032
tests/fixtures/drift/
  variable-drift-ac-10.v1.json
tests/unit/core/drift/
  classify.test.ts
  variableEqual.test.ts
  variables.flatten.test.ts
  variables.detect.test.ts
tests/integration/core/drift/
  variableDrift.integration.test.ts
```

### Bibliography

- `research/variable-drift-detector-3-way.md`
- `../WO-028-snapshot-mechanism-canvas-plugindata/research/snapshot-mechanism-canvas-plugindata.md`
- `../../Sprint 5/WO-058-github-desktop-style-sync/plan.md` Phase 1 Notes
