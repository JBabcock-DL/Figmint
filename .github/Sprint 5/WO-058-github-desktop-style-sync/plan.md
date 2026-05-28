# Plan — WO-058: GitHub-Desktop-style sync

> **Ticket:** `.github/Sprint 5/WO-058-github-desktop-style-sync/ticket.md`
> **Research:** `research/github-desktop-style-sync.md` (425 lines) · WO-028 snapshot spec
> **Target:** integration WO — ≥350 lines, three sequential build phases

---

## Approach

Replace the designer-hostile three-path Settings model (repo URL + tokens path + `.figmint-registry.json` path) with a **GitHub Desktop–style repo card**: Connect once, then **Fetch latest / Pull design system / Push updates**. Repo-side paths come **only** from optional root `figmint.json` (defaults when absent). Registry state moves from repo JSON to **canvas `SnapshotV1` pluginData** on hidden frame `_FigmintSnapshotStore` in the Figmint Output page — unblocks Sprint 6 drift detectors (WO-029–032).

**In scope:** snapshot contract + store, delete `.figmint-registry.json` production paths, trim registry audit rules, `figmint.json` parser, Fetch/Pull/Push main handlers, Settings + Components UI collapse, shallow Push PR, drift badge stub, WO-026 close.

**Out of scope (do not implement):** multi-repo UX, branch-aware sync, CLI, deep Code Connect push (WO-040..046), full drift resolution (WO-032), bulk spec catalog pull (WO-056).

**Wrong vs correct:**

| Wrong | Correct |
| ----- | ------- |
| Keep `.figmint-registry.json` as optional fallback | Delete all read/write/reference in `src/` + contracts |
| Repurpose `comp/registry-envelope` against pluginData | **Delete** envelope + filekey rules outright |
| User-editable tokensPath in Settings | Paths from `figmint.json` resolved defaults only |
| `console.debug` in main thread after scaffold | `pluginLog()` only |
| Direct `fetch('api.github.com')` from UI | OAuth relay via existing `relayClient.ts` |
| `String.replace(bundle, …)` for PR bodies | `slice`/concat or callback |

---

## AC traceability

| AC / Req | Plan step(s) |
| -------- | ------------ |
| Req 1–2 snapshot + store | Steps 1–4 |
| Req 3 delete registry repo paths | Steps 5–9, 18, 22 |
| Req 4 delete envelope/filekey audits | Step 6 |
| Req 5 revert WO-026 production path | Steps 10–11 |
| Req 6 scaffold + Components snapshot | Steps 12–14 |
| Req 7–8 figmint.json contract + parser | Steps 15–16 |
| Req 9 Fetch on connect | Steps 17–19 |
| Req 10–11 Settings collapse + remove path fields | Steps 20–24 |
| Req 12 Pull tokens | Steps 25–26 |
| Req 13 Push PR | Steps 27–29 |
| Req 14 malformed figmint.json preflight | Step 30 |
| Req 15 drift badge stub | Step 31 |
| Req 16 close WO-026 | Step 32 |
| Req 17–18 no registry file references | Steps 9, 18, 22 |
| AC CI green | Step 33 |
| AC Plugin Sandbox scaffold zero envelope FAIL | Step 34 (manual VQA) |
| AC a11y 44×44 buttons | Step 23 |

---

## Steps

### Phase 1 — Snapshot + registry migration

- [x] **Step 1** — Add `packages/contracts/src/snapshot.v1.ts`:
  ```typescript
  export interface SnapshotEntryV1 {
    key: string;
    value: unknown;
    source: 'push' | 'pull';
    timestamp: string;
  }
  export interface SnapshotRegistryEntryV1 {
    nodeId: string;
    key: string;
    pageName: string;
    publishedAt: string;
    version: number;
    cvaHash?: string | null;
    composedChildVersions?: Record<string, number | null>;
  }
  export interface SnapshotV1 {
    v: 1;
    kind: 'snapshot';
    fileKey: string;
    updatedAt: string;
    keys: Record<string, SnapshotEntryV1>;
    registry: { components: Record<string, SnapshotRegistryEntryV1> };
  }
  ```
  Export from `packages/contracts/src/index.ts`.
  **Done when:** `npm run typecheck` passes; contract re-export visible.

- [x] **Step 2** — Add constants in `src/core/sync/snapshotConstants.ts`:
  - `SNAPSHOT_PLUGIN_DATA_KEY = 'figmint:snapshot:v1'`
  - `SNAPSHOT_FRAME_NAME = '_FigmintSnapshotStore'`
  - `SNAPSHOT_MAX_BYTES = 90_000` (guard below Figma 100KB limit)
  **Done when:** file exists; imported by store module.

- [x] **Step 3** — Implement `src/core/sync/snapshotStore.ts` (main-thread only):
  - `findOrCreateSnapshotFrame(): FrameNode` — reuse `findOrCreateOutputPage()` from `src/io/sinks/outputPage.ts`; create 1×1 hidden locked frame as first child
  - `readSnapshotRaw(): string | null` — `frame.getPluginData(SNAPSHOT_PLUGIN_DATA_KEY)`
  - `parseSnapshot(raw: string | null): SnapshotV1` — corrupt/missing → empty envelope `{ v:1, kind:'snapshot', fileKey: figma.fileKey||'', updatedAt: ISO, keys:{}, registry:{components:{}} }`
  - `getSnapshot(): SnapshotV1`
  - `persistSnapshot(snapshot: SnapshotV1): void` — serialize JSON; if `byteLength > SNAPSHOT_MAX_BYTES` throw actionable error
  - `getRegistryFromSnapshot(): RegistryV1` — map `snapshot.registry.components` → `{ v:1, kind:'registry', fileKey: snapshot.fileKey, components }`
  - `upsertSnapshotRegistryEntry(input: UpsertRegistryEntryInput): RegistryV1` — call existing `upsertRegistryEntry` from `registry.ts`, write back to snapshot, `persistSnapshot`
  - `updateSnapshotKeys(keys: Array<{ key, value, source }>): void`
  - `clearSnapshot(): void`
  Use `pluginLog()` for events; no `console.debug`.
  **Done when:** `tests/unit/core/sync/snapshotStore.test.ts` covers parse empty, round-trip persist, registry upsert, size guard (mock frame pluginData).

- [x] **Step 4** — Add `src/io/messages/snapshot.ts`:
  ```typescript
  export type SnapshotReadMessage = { type: 'snapshot/read'; requestId: string };
  export type SnapshotReadResultMessage = {
    type: 'snapshot/read/result'; requestId: string; ok: boolean;
    registry?: RegistryV1; error?: string;
  };
  export type SnapshotUpsertRegistryMessage = {
    type: 'snapshot/upsert-registry'; requestId: string;
    specName: string; /* + scaffold result ids passed from UI after scaffold */
  };
  ```
  Add type guards mirroring `github.ts` pattern.
  **Done when:** guards exported; no main handler yet (Step 13).

- [x] **Step 5** — Delete repo registry **read** path:
  - Replace `src/ui/components/scaffold/loadRegistryFromRepo.ts` with `loadRegistryFromSnapshot.ts` calling `postMessage({ type:'snapshot/read' })` and returning `RegistryV1 | null`
  - Remove `loadRegistryFromGitHub` usage from Components tab
  **Done when:** `grep -r loadRegistryFromGitHub src/ui/tabs/Components.tsx` returns zero (except Export sandbox if kept).

- [x] **Step 6** — Trim `src/core/components/registryAuditRows.ts`:
  - Remove rows `comp/registry-envelope` and `comp/registry-filekey`
  - Keep: `comp/registry-entry-present`, `comp/registry-entry-nodeid`, `comp/registry-entry-key`, `comp/registry-entry-version`
  **Done when:** `tests/unit/audit/componentRules.test.ts` updated; no assertions expect deleted rule IDs.

- [x] **Step 7** — Rewrite `src/ui/components/registryExport.ts`:
  - Rename to `src/ui/components/snapshotRegistry.ts` (update all imports)
  - Keep `upsert` logic via main message or direct call from main in scaffold handler
  - **Delete:** `loadRegistryFromGitHub`, `runRegistryExportFlow` GitHub merge, `prepareRegistryExport` for Components production path
  - Export sandbox (`ExportSandbox.tsx`) may keep sample registry document — not GitHub path
  **Done when:** Components tab does not import `prepareRegistryExport` for post-scaffold PR flow.

- [x] **Step 8** — Update `src/core/components/scaffold/runScaffold.ts` (lines 283–309):
  - Before upsert: `registry = getRegistryFromSnapshot()` via inlined call (main thread) instead of `options.registry` from GitHub
  - After upsert: `persistSnapshot` with updated registry
  - Remove dependency on `options.registry` from GitHub load (keep param for tests with explicit inject)
  **Done when:** scaffold integration test passes with mock snapshot frame.

- [x] **Step 9** — Remove `.figmint-registry.json` constants from production paths:
  - Delete `DEFAULT_REGISTRY_PATH` from `src/ui/components/scaffold/constants.ts`
  - Remove `DEFAULT_REGISTRY_PATH` usage from `registry.types.ts` — delete `resolveRegistryReadPath` or make throw "deprecated"
  - Remove `registry` case from `src/ui/export/defaultPaths.ts` OR restrict to Export sandbox-only with comment
  **Done when:** `rg '\.figmint-registry' src/ packages/contracts/src/ --glob '!**/sample*'` returns zero matches.

- [x] **Step 10** — Update `src/ui/tabs/Components.tsx`:
  - Remove "Load sync registry" button (~line 365)
  - On mount: call `loadRegistryFromSnapshot()` → set `registry` state + `registryKeys`
  - Remove `showRegistryExport` / ExportSheet block for registry PR (~line 503)
  - Remove `registryPath` prop from `ComponentsTabProps`
  **Done when:** `tests/unit/ui/tabs/Components.scaffold.integration.test.tsx` updated; no "Load sync registry" string in file.

- [x] **Step 11** — Update `src/ui/App.tsx`:
  - Stop passing `registryPath` to Components and Settings
  - Remove `registryPath` / `setRegistryPath` from `useGitHubSession` usage where obsolete (Phase 2 completes removal)
  **Done when:** App.tsx compiles.

- [x] **Step 12** — Wire snapshot handlers in `src/main.ts`:
  - `handleSnapshotRead(requestId)` → post `snapshot/read/result` with `getRegistryFromSnapshot()`
  - Register in message switch alongside github handlers
  **Done when:** UI `loadRegistryFromSnapshot` returns registry in unit test with mocked postMessage.

- [x] **Step 13** — Batch-update tests referencing registry path (~25 files):
  - `tests/unit/core/components/registry.test.ts` — remove `resolveRegistryReadPath` default test
  - `tests/unit/ui/scaffold/loadRegistryFromRepo.test.ts` → rename to snapshot loader tests
  - `tests/unit/ui/components/registryExport.test.tsx` → snapshot upsert tests
  - `tests/unit/io/messages/export.test.ts` — remove registry export path assertions from production flows
  **Done when:** `npm test` passes Phase 1 subset.

### Phase 2 — figmint.json + Settings collapse

- [ ] **Step 14** — Add `packages/contracts/src/figmintJson.v1.ts`:
  ```typescript
  export interface FigmintJsonV1 {
    v: 1;
    kind: 'figmint-config';
    tokensPath?: string;
    specsPath?: string;
    designSystemBranch?: string;
    exportBasePath?: string;
  }
  export interface ResolvedFigmintConfig {
    tokensPath: string;
    specsPath: string;
    exportBasePath: string;
    designSystemBranch: string;
  }
  ```
  Export from `packages/contracts/src/index.ts`.
  **Done when:** typecheck passes.

- [ ] **Step 15** — Implement `src/io/formats/figmintJson.ts`:
  - `FIGMINT_JSON_FILENAME = 'figmint.json'`
  - `FIGMINT_JSON_DEFAULTS` per research (tokens `design/tokens.json`, specs `components/`, export `docs/figmint/`, branch null)
  - `parseFigmintJson(text: string): { ok: true; value: FigmintJsonV1 } | { ok: false; error: string }`
  - `resolveFigmintConfig(parsed: FigmintJsonV1 | null): ResolvedFigmintConfig`
  - Validate: `v === 1`; if `kind` present must be `'figmint-config'`
  **Done when:** `tests/unit/io/formats/figmintJson.test.ts` — valid parse, absent→defaults, malformed v2 fails, extra keys OK.

- [ ] **Step 16** — Refactor `src/io/github/storage.ts`:
  - Replace `StoredGitHubConfig` fields `tokensPath`/`registryPath` with:
    ```typescript
    export interface StoredRepoSyncState {
      resolvedConfig: ResolvedFigmintConfig | null;
      lastFetchedAt: string | null;
      lastPulledAt: string | null;
      lastPushedAt: string | null;
      defaultBranch: string;
    }
    ```
  - Migration: on read, if legacy shape with `tokensPath`, ignore paths (Fetch will repopulate)
  - `getSyncState(repoUrl)`, `setSyncState(repoUrl, partial)`
  **Done when:** unit test legacy config migration.

- [ ] **Step 17** — Extend `src/io/messages/github.ts`:
  - Add `GitHubRepoFetchMessage`, `GitHubRepoFetchResultMessage`, `GitHubRepoPullMessage`, `GitHubRepoPullResultMessage` per research §11
  - Remove `registryPath` from `GitHubSessionLoadedMessage` and `GitHubTokenSaveMessage`
  - Add type guards
  **Done when:** typecheck passes; old registryPath fields gone.

- [ ] **Step 18** — Implement `handleGitHubRepoFetch` in `src/main.ts`:
  1. Resolve default branch via relay `GET /repos/{owner}/{repo}` → `default_branch`
  2. Fetch `figmint.json` at repo root; 404 → `resolveFigmintConfig(null)`
  3. Parse; malformed → `warning` string + defaults
  4. `setSyncState({ resolvedConfig, lastFetchedAt: ISO, defaultBranch })`
  5. Post `github/repo/fetch-result`
  **Done when:** unit test with mocked relay — missing file uses defaults; bad JSON sets warning.

- [ ] **Step 19** — Auto-fetch after OAuth connect:
  - In `handleGitHubTokenSave`, after save, fire internal fetch (same handler)
  - Update `handleGitHubSessionLoad` to return `resolvedConfig` + timestamps, not paths
  **Done when:** connect flow triggers fetch in integration test mock.

- [ ] **Step 20** — Implement `handleGitHubRepoPull` in `src/main.ts`:
  1. Require connected token + cached `resolvedConfig` (else error "Fetch first")
  2. `loadFromGitHub` equivalent for `resolvedConfig.tokensPath`
  3. Cache tokens JSON text in `clientStorage` key `figmint:repo:{hash}:tokens`
  4. Update `lastPulledAt`
  5. Post result with `{ ok, kind, cachedAt }`
  **Done when:** unit test caches tokens on pull.

- [ ] **Step 21** — Add `src/ui/sync/useRepoSync.ts`:
  - State: `{ fetching, pulling, pushing, lastFetchedAt, lastPulledAt, lastPushedAt, configWarning, error }`
  - `fetchRepo()`, `pullDesignSystem()`, `pushUpdates()` — postMessage wrappers
  - Listen for `github/repo/*-result` messages
  **Done when:** hook test with mocked parent.postMessage.

- [ ] **Step 22** — Add `src/ui/components/RepoSyncCard.tsx`:
  - Props: `repoUrl`, `connected`, `displayName` (from `formatRepoDisplay`), sync hook state, OAuth connect/disconnect callbacks
  - Layout: repo name top-left; "Last synced: {relative time from lastFetchedAt}"; buttons **Fetch latest**, **Pull design system**, **Push updates** right-aligned
  - Warning banner when `configWarning` set (malformed figmint.json)
  - Button styles: `minHeight: 44, minWidth: 44`, `:focus-visible` outline `2px solid #0055FF`
  - Drift stub section (Step 31): collapsible placeholder
  **Done when:** `tests/unit/ui/components/RepoSyncCard.test.tsx` renders buttons; no path inputs.

- [ ] **Step 23** — Rewrite `src/ui/tabs/Settings.tsx`:
  - Keep repo URL input + Connect/Disconnect (OAuth via `useGitHubConnect`)
  - Replace path inputs + smoke tests with `<RepoSyncCard />`
  - Remove `tokensPath`, `registryPath` from `SettingsProps`
  **Done when:** Settings renders zero `<input>` for tokens/registry paths; visual QA checklist satisfied.

- [ ] **Step 24** — Simplify `src/ui/github/useGitHubSession.ts`:
  - Remove `tokensPath`, `registryPath`, setters
  - Keep `repoUrl`, `sessionReady`
  - Hydrate sync timestamps from session loaded message
  **Done when:** App.tsx updated; typecheck passes.

- [ ] **Step 25** — Update `src/ui/components/scaffold/resolveComponentSpec.ts`:
  - Accept `specsPath` from `ResolvedFigmintConfig` (passed from Components via session) instead of hardcoded paths
  - Build path: `{specsPath}{specName}.json` with trailing slash normalization
  **Done when:** unit test resolves `components/Button.json`.

- [ ] **Step 26** — Update `src/io/github/githubUiBridge.ts` + `handleGitHubTokenSave`:
  - Stop persisting `tokensPath` on token save
  **Done when:** `grep tokensPath src/io/github/storage.ts` only in migration comment.

### Phase 3 — Push + gates + close-out

- [ ] **Step 27** — Implement `handleGitHubRepoPush` in `src/main.ts`:
  1. Require token + `resolvedConfig`
  2. Build staged file: `{ path: exportBasePath + 'sync-stub.v1.json', content: minimal ops-program stub }`
  3. Call `createPullRequestFromContext` / existing PR flow with:
     - `prTitle: 'figmint: push updates from Figma'`
     - `prBody: buildPrBody({...})`
     - `headBranch: buildDefaultHeadBranch('push', new Date())`
  4. `pluginLog('push/started')` → on success `pluginLog('push/pr-opened', url)` → on fail `pluginLog('push/error', msg)`
  5. Update `lastPushedAt`
  **Done when:** unit test mocks PR flow; manual SPK-058-5 optional.

- [ ] **Step 28** — Wire Push in `useRepoSync.pushUpdates()` → `github/repo/push` message; display PR URL in RepoSyncCard status line.
  **Done when:** UI test receives mock PR URL.

- [ ] **Step 29** — Remove Settings dev PR smoke test section (lines 235–252 old Settings) — replaced by Push button.
  **Done when:** no `github/pr/test-open` from Settings except if guarded by `import.meta.env.DEV` flag (optional keep).

- [ ] **Step 30** — Extend doc preflight for malformed figmint.json:
  - Add optional input to `DocPipelinePreflightRulesInput`: `figmintConfigParseError?: string`
  - New rule `doc-pipeline/figmint-config` — pass when no error; fail when malformed (absent OK)
  - Wire from scaffold preflight when sync state has warning
  **Done when:** `tests/unit/audit/doc-required-tokens.test.ts` or new file covers malformed vs absent.

- [ ] **Step 31** — Drift badge stub on RepoSyncCard:
  - Collapsed section: "Drift summary — coming soon" with disabled "Refresh drift" button
  - Optional: `DriftSummaryContext` placeholder in `src/ui/sync/DriftSummaryContext.tsx` exporting `{ push:0, pull:0, conflict:0 }`
  **Done when:** component renders stub; WO-029 can replace without Settings restructure.

- [ ] **Step 32** — Close WO-026 on GitHub:
  - `gh issue close 29 --repo JBabcock-DL/Figmint --reason "not planned"` with comment "Superseded by WO-058"
  - Update local WO-026 ticket note if present
  **Done when:** issue #29 closed.

- [ ] **Step 33** — CI gate:
  ```bash
  npm run typecheck && npm run lint && npm run format:check && npm run build
  ```
  **Done when:** all four legs green.

- [ ] **Step 34** — Manual VQA (Plugin Sandbox `cVdPraIafWFBRZnzMPhtrW`):
  1. Connect GitHub + Fetch → last-synced updates
  2. Pull → tokens cached
  3. Scaffold Button → audit has **no** `comp/registry-envelope` or `comp/registry-filekey` FAIL rows
  4. Push → PR URL surfaces
  5. Components tab: no "Load sync registry"; registry keys from snapshot
  **Done when:** SPK-058-2 PASS documented in ticket or `research/vqa-report.md` if run.

---

## Build Agents

### Phase 1 (sequential — single code-build agent)

- **`code-build`** — Steps 1–13: Snapshot contract + store + message guards; registry audit trim; snapshotRegistry rewrite; runScaffold + Components migration; main snapshot handlers; test batch. **Gate:** Phase 2 must not start until `rg '\.figmint-registry' src/` is clean and scaffold tests pass.

### Phase 2 (parallel after Phase 1)

- **`code-build`** — Steps 14–20, 25–26: figmintJson contract + parser; storage refactor; github messages + fetch/pull main handlers; resolveComponentSpec path from config.
- **`code-build`** — Steps 21–24: `useRepoSync` hook, `RepoSyncCard`, Settings rewrite, session simplification.

### Phase 3 (parallel after Phase 2)

- **`code-build`** — Steps 27–29, 31: Push handler + UI wire; remove dev smoke test.
- **`code-build`** — Steps 30, 33–34: figmint.json preflight audit rule; CI + manual VQA checklist.
- **`code-build`** — Step 32: Close WO-026 GitHub issue (may run anytime after Step 7).

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-057 (shipped) | Doc pipeline + preflight extension point |
| WO-016/017/018 | OAuth relay + PR flow |
| WO-022..027 | Scaffold pipeline consumers |
| WO-029–032 | **Blocked on** this WO Phase 1 snapshot API |

| Tool | Usage |
| ---- | ----- |
| `src/io/sinks/outputPage.ts` | Output page for snapshot frame |
| `src/io/github/createPullRequestFlow.ts` | Push PR |
| `src/io/github/relayClient.ts` | All GitHub HTTP |
| `src/core/components/registry.ts` | upsertRegistryEntry (unchanged logic) |
| `pluginLog()` | Main-thread logging |
| Plugin Sandbox | Manual VQA |

**Thread split:**

| Module | Thread |
| ------ | ------ |
| `snapshotStore.ts`, fetch/pull/push handlers | Main (`code.js`) |
| `RepoSyncCard`, `useRepoSync` | UI iframe |
| Messages | `snapshot.ts`, extended `github.ts` |

---

## Open Questions

| ID | Question | Status |
| -- | -------- | ------ |
| OQ-058-4 | Keep dev PR smoke test? | **RESOLVED** — remove; Push replaces (Step 29) |
| OQ-P1 | Export tab registry sample | **RESOLVED** — keep sandbox-only sample, not GitHub path |
| OQ-P2 | Pull applies tokens to Figma automatically? | **Deferred** — Phase 2 Pull caches only; variable push on Pull is WO-029 integration |

---

## Notes

- **2026-05-28 Phase 1 build complete.** Snapshot SSOT on `_FigmintSnapshotStore` frame (`figmint:snapshot:v1` pluginData). Deleted `registryExport.ts`, `loadRegistryFromRepo.ts`, `constants.ts`. Export sandbox helpers moved to `src/ui/export/registryExportSandbox.ts`. `comp/registry-envelope` + `comp/registry-filekey` audit rows removed. Components tab auto-loads canvas snapshot on mount; post-scaffold registry PR export removed. Settings registry path field removed (Phase 2 adds RepoSyncCard). Tests: 581 passed | 1 skipped. Gate: zero `.figmint-registry` refs in `src/`.

- **ES2017:** no `?.`, `??`, `replaceAll` in `src/main.ts` / `src/core/sync/**`
- **Logging:** `pluginLog()` only on main thread
- **fileKey empty:** snapshot stores `figma.fileKey || ''`; do not FAIL audit on empty fileKey
- **Registry export to repo:** DELETED — snapshot is SSOT
- **Phase 1 unblocks Sprint 6** — WO-029 may stub snapshot in tests until Phase 1 merges
- **Bibliography:** `research/github-desktop-style-sync.md`, `../Sprint 6/WO-028-.../research/snapshot-mechanism-canvas-plugindata.md`

---

## Module tree (new files)

```
packages/contracts/src/
  snapshot.v1.ts
  figmintJson.v1.ts
src/core/sync/
  snapshotConstants.ts
  snapshotStore.ts
src/io/formats/
  figmintJson.ts
src/io/messages/
  snapshot.ts
src/ui/sync/
  useRepoSync.ts
  DriftSummaryContext.tsx
src/ui/components/
  RepoSyncCard.tsx
  snapshotRegistry.ts          # renamed from registryExport.ts
tests/unit/core/sync/
  snapshotStore.test.ts
tests/unit/io/formats/
  figmintJson.test.ts
tests/unit/ui/components/
  RepoSyncCard.test.tsx
```
