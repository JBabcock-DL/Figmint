# WO-058 — GitHub-Desktop-style sync

> **Research date:** 2026-05-28 · **Unblocked:** WO-057 shipped with designer VQA sign-off.
> **Absorbs:** WO-028 (snapshot), WO-033 (Sync tab/badge) · **Supersedes:** WO-026 (registry repo emission)
> **Quality bar:** [`.github/templates/research-quality-bar.md`](../../../templates/research-quality-bar.md)

---

## Summary

WO-058 collapses Figmint's GitHub I/O into a **GitHub Desktop–style** designer workflow: connect once, then **Fetch / Pull / Push** from a single repo card — no tokens-path, registry-path, or "Load sync registry" affordances. Repo-side config moves to optional root **`figmint.json`**. Canvas **`SnapshotV1`** pluginData on a hidden Output-page frame becomes the **single source of truth** for registry + drift baseline; **`.figmint-registry.json` is deleted** from read/write/audit paths.

**Locked recommendation:** Implement in **three build phases** — (1) snapshot store + registry migration + delete repo registry emission, (2) `figmint.json` + Fetch/Pull/Push orchestration + Settings UI collapse, (3) shallow Push PR wiring + drift badge hook (WO-033 tail). Delete `comp/registry-envelope` and `comp/registry-filekey` audit rules outright; retain entry-level rows against snapshot registry. Push commits as **the authenticated user** via OAuth token; PR title/body branded with Figmint metadata block.

---

## Key Findings

### 1. Problem validated in production scaffold flow

2026-05-28 designer scaffold on `Dw8NkEiG91NhjYqRPNTOOu` failed:

| Audit rule | Root cause |
| ---------- | ---------- |
| `comp/registry-envelope` | `registry.fileKey === ''` on Untitled/unsaved files |
| `comp/registry-filekey` | Same — `figma.fileKey` empty string |

Source: `src/core/components/registryAuditRows.ts` lines 13–21, 54–59 — gates on `registry.fileKey.length > 0`.

`runRegistryExportFlow` (`src/ui/components/registryExport.ts:119`) sets `fileKey = figma.fileKey || ''` then upserts and audits. The **repo-file registry layer is redundant** with upcoming canvas snapshot SSOT and causes spurious FAILs when designers work in unsaved files.

### 2. Current Settings UX (to remove)

`src/ui/tabs/Settings.tsx` exposes **three path inputs**:

| Field | State key | Default | Lines |
| ----- | --------- | ------- | ----- |
| Repo URL | `repoUrl` | — | 142–152 |
| Tokens path | `tokensPath` | `design/tokens.json` | 154–164 |
| Figma sync file path | `registryPath` | `.figmint-registry.json` | 166–176 |

Plus dev-only "Test read tokens path" and "Open test PR" sections (lines 216–252) — **move PR smoke test behind dev flag or delete** in favor of real Push button.

Session persistence: `src/ui/github/useGitHubSession.ts` stores `tokensPath` + `registryPath` in React state hydrated from main `clientStorage` via `github/session/load`.

Main-thread config: `src/io/github/storage.ts` `StoredGitHubConfig` holds `tokensPath`, optional `registryPath`, `defaultBranch`, `exportBasePath`.

### 3. Components tab registry flow (to simplify)

`src/ui/tabs/Components.tsx`:

- Line 365: **"Load sync registry"** button — manual GitHub fetch of `.figmint-registry.json`
- Lines 503+: post-scaffold **ExportSheet** for registry PR emission (WO-026 path)
- Uses `loadRegistryForComponentsTab` → `registryExport.loadRegistryFromGitHub`

After WO-058: registry loads **automatically from canvas snapshot** on tab mount; scaffold upserts snapshot in-memory + persists to pluginData; **no ExportSheet for registry** to repo.

### 4. Files referencing `.figmint-registry.json` (deletion inventory)

| Path | Action |
| ---- | ------ |
| `src/core/components/registry.types.ts:10` | Remove `DEFAULT_REGISTRY_PATH` or repurpose as deprecated constant |
| `src/ui/components/scaffold/constants.ts:1` | Delete `DEFAULT_REGISTRY_PATH` |
| `src/ui/export/defaultPaths.ts:34` | Remove `registry` kind path |
| `src/ui/components/registryExport.ts` | **Rewrite:** snapshot upsert only; delete GitHub load + ExportSheet prep for repo |
| `src/ui/components/scaffold/loadRegistryFromRepo.ts` | **Delete** or replace with `loadRegistryFromSnapshot()` |
| `src/main.ts:209-214` | Stop returning `registryPath` in session loaded |
| `src/io/messages/github.ts:40-41` | Remove `registryPath` from session messages |
| `src/io/github/storage.ts:14-15` | Remove `registryPath` from config |
| `src/ui/github/useGitHubSession.ts` | Remove registry path state |
| `src/ui/App.tsx:158,174` | Stop passing `registryPath` |
| `tests/unit/**` (registry export, loadRegistry, defaultPaths) | Update fixtures |

Grep-verified: **~25 test files** reference registry path — batch update in same PR.

### 5. Snapshot Phase 1 (absorbed WO-028)

Canonical spec: [WO-028 snapshot research](../../Sprint%206/WO-028-snapshot-mechanism-canvas-plugindata/research/snapshot-mechanism-canvas-plugindata.md).

**Implementation summary for WO-058:**

| Artifact | Path |
| -------- | ---- |
| Contract | `packages/contracts/src/snapshot.v1.ts` |
| Store | `src/core/sync/snapshotStore.ts` (or `src/core/drift/snapshot.ts`) |
| Hidden frame | `_FigmintSnapshotStore` on Figmint Output page |
| pluginData key | `figmint:snapshot:v1` |
| Registry SSOT | `snapshot.registry.components` mirrors `RegistryV1.components` |

**New helpers:**

```typescript
// Read registry for Components tab / scaffold
export function getRegistryFromSnapshot(): RegistryV1;
export async function upsertSnapshotRegistryEntry(input: UpsertRegistryEntryInput): Promise<void>;
export async function persistSnapshot(snapshot: SnapshotV1): Promise<void>;
```

Scaffold pipeline (`runScaffold.ts:305`) calls `buildRegistryAuditRows` — switch registry source from in-memory upsert to snapshot-backed registry; **drop envelope/filekey rows**.

### 6. Audit rules decision (locked)

| Rule | Disposition | Rationale |
| ---- | ----------- | --------- |
| `comp/registry-envelope` | **DELETE** | No repo envelope; snapshot uses `kind: 'snapshot'` |
| `comp/registry-filekey` | **DELETE** | Empty fileKey on Untitled is expected; not a designer error |
| `comp/registry-entry-present` | **KEEP** | Still validates component keyed after scaffold |
| `comp/registry-entry-nodeid` | **KEEP** | |
| `comp/registry-entry-key` | **KEEP** | |
| `comp/registry-entry-version` | **KEEP** | |

Optional future: `sync/snapshot-present` info row if snapshot node missing (warn, not error).

WO-057 gate extension: add `figmint.json` malformed check to preflight — **not** absent file (defaults OK).

### 7. `figmint.json` schema (finalized)

**Contract:** `packages/contracts/src/figmintJson.v1.ts`

```typescript
export interface FigmintJsonV1 {
  v: 1;
  kind: 'figmint-config';
  /** Directory or file path to tokens relative to repo root. Default: `design/tokens.json` */
  tokensPath?: string;
  /** Directory containing component-spec JSON files. Default: `components/` */
  specsPath?: string;
  /** Git branch for Fetch/Pull/Push. Default: repository default branch */
  designSystemBranch?: string;
  /** Base path for Figmint contract exports in PRs. Default: `docs/figmint/` */
  exportBasePath?: string;
}
```

**Parser:** `src/io/formats/figmintJson.ts`

```typescript
export const FIGMINT_JSON_DEFAULTS: Required<Pick<FigmintJsonV1, 'tokensPath' | 'specsPath' | 'exportBasePath'>> & { designSystemBranch: string | null } = {
  tokensPath: 'design/tokens.json',
  specsPath: 'components/',
  exportBasePath: 'docs/figmint/',
  designSystemBranch: null, // null → resolve via GitHub API default branch
};

export type ParseFigmintJsonResult =
  | { ok: true; value: FigmintJsonV1; resolved: typeof FIGMINT_JSON_DEFAULTS }
  | { ok: false; error: string };

export function parseFigmintJson(text: string): ParseFigmintJsonResult;
export function resolveFigmintConfig(parsed: FigmintJsonV1 | null): ResolvedFigmintConfig;
```

**Validation rules:**

- `v` must be `1`; `kind` must be `'figmint-config'` if present
- Extra keys → **warn** (forward compatible), not fail
- Malformed JSON / wrong `v` → `{ ok: false }` + non-blocking Settings warning banner
- File 404 on Fetch → use defaults silently

**Example committed in consumer repo:**

```json
{
  "v": 1,
  "kind": "figmint-config",
  "tokensPath": "design/tokens.json",
  "specsPath": "components/",
  "designSystemBranch": "main"
}
```

### 8. Fetch / Pull / Push semantics

| Action | Designer copy | Behavior |
| ------ | ------------- | -------- |
| **Fetch** | "Fetch latest" | GitHub: GET default-branch HEAD SHA for `figmint.json` + `tokensPath` + list `specsPath` dir (shallow metadata only). Updates **last-fetched** timestamp. Does **not** mutate Figma canvas. |
| **Pull** | "Pull design system" | Fetch + download tokens JSON + cache in `clientStorage` per repo + optional variable push preview. Updates snapshot **pull** keys for tokens applied. Registry: read specs index from repo file listing (future WO-056 catalog) — Phase 1: no bulk spec download. |
| **Push** | "Push updates" | Opens PR via relay with staged changes (shallow: single test/doc file or pending export queue). Full drift-resolution push deferred to WO-032. |

**State persisted per repo** (`StoredGitHubConfig` → rename/extend `StoredRepoSyncState`):

```typescript
interface StoredRepoSyncState {
  figmintConfig: ResolvedFigmintConfig | null; // cached from last Fetch
  lastFetchedAt: string | null;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  defaultBranch: string; // resolved from GitHub
}
```

Remove `tokensPath` / `registryPath` from user-editable config — paths come **only** from `figmint.json` resolved defaults.

### 9. Settings UI wireframe (ASCII)

```
┌─ Connected repository ─────────────────────────────────────┐
│  owner/repo                                    [Connected ●]│
│  Last synced: 2 minutes ago                               │
│                                                           │
│              [ Fetch latest ] [ Pull ] [ Push updates ]     │
│                                                           │
│  ⚠ figmint.json could not be parsed — using defaults.     │  ← non-blocking
└───────────────────────────────────────────────────────────┘

┌─ Drift (expandable — WO-033 tail / WO-032) ───────────────┐
│  4 pushes · 2 pulls · 1 conflict                          │
│  [ Refresh drift ]                                        │
└───────────────────────────────────────────────────────────┘

[ Connect GitHub ]  [ Disconnect ]
```

- Repo URL: single input remains (or picker later WO-056)
- **Remove:** tokens path, Figma sync file path, read smoke test section
- Buttons: min 44×44 pt hit target; focus ring via existing inline styles
- Nav badge (App.tsx): optional `⚠` on Settings tab when `conflictCount > 0`

### 10. Push PR conventions (locked)

| Field | Value |
| ----- | ----- |
| **Committer** | Authenticated user (OAuth token) — Figmint does not have a bot identity |
| **PR title** | `figmint: push updates from Figma` (generic Phase 1); drift-specific titles from WO-031 pattern later |
| **PR body** | Existing `buildPrBody()` from `src/io/github/prBody.ts` — includes plugin version, Figma file URL, contract kind |
| **Branch** | `figmint/push-{YYYYMMDD}-{hhmm}` via `buildDefaultHeadBranch` |
| **Files** | Under `exportBasePath` from resolved config |

Sign-off: Figmint is **author in prose**, user is **GitHub commit author**.

### 11. Message contract additions

Extend `src/io/messages/github.ts`:

```typescript
// Fetch figmint.json + resolve default branch
type GitHubRepoFetchMessage = {
  type: 'github/repo/fetch';
  requestId: string;
  repoUrl: string;
};

type GitHubRepoFetchResultMessage = {
  type: 'github/repo/fetch-result';
  requestId: string;
  ok: boolean;
  config?: ResolvedFigmintConfig;
  lastFetchedAt?: string;
  warning?: string; // malformed figmint.json
  error?: string;
};

// Pull tokens into session cache
type GitHubRepoPullMessage = {
  type: 'github/repo/pull';
  requestId: string;
  repoUrl: string;
};

// Push staged files
type GitHubRepoPushMessage = {
  type: 'github/repo/push';
  requestId: string;
  repoUrl: string;
  files: Array<{ path: string; content: string; format: 'json' | 'md' }>;
  prTitle: string;
};
```

Snapshot messages from WO-028 research (`snapshot/read`, `snapshot/update-keys`) live in `src/io/messages/snapshot.ts`.

### 12. Scaffold integration changes

`runScaffold.ts` today (line 305): builds registry audit rows after scaffold.

**After:**

1. Load base registry from `getRegistryFromSnapshot()` (empty components if first run)
2. `upsertRegistryEntry()` in memory
3. `persistSnapshot()` with updated `registry.components[name]`
4. Audit with **trimmed** `buildRegistryAuditRows` (no envelope/filekey)
5. **Remove** ExportSheet registry emission from Components tab result flow

`resolveComponentSpecFromRepo` continues to fetch specs from GitHub using `resolved.specsPath + name + '.json'`.

### 13. WO-026 supersession

Close GitHub #29 "Won't Do (superseded by WO-058)" at build complete.

Remove:

- `prepareRegistryExport` usage for repo PR from Components tab
- Export sandbox registry sample can remain for **Export tab demo** only (not production path)
- `defaultRegistryExportSinks` — delete or restrict to Export sandbox

---

## Validated evidence

### Repo inventory — exists today

| Path | Role |
| ---- | ---- |
| `src/io/github/storage.ts` | Per-repo token + config in clientStorage |
| `src/io/github/githubUiBridge.ts` | OAuth + contents fetch relay |
| `src/io/github/createPullRequestFlow.ts` | PR creation via relay |
| `src/io/sources/github.ts` | `loadFromGitHub(repo, path)` |
| `src/io/sinks/outputPage.ts` | Figmint Output page |
| `src/core/components/registry.ts` | Upsert/merge logic — **keep**, change persistence target |
| `src/core/components/registryAuditRows.ts` | Audit rows — **trim** |
| `src/ui/tabs/Settings.tsx` | 3-field UI — **replace** |
| `src/ui/tabs/Components.tsx` | Load registry + export — **simplify** |

### Greenfield

| Path | Phase |
| ---- | ----- |
| `packages/contracts/src/snapshot.v1.ts` | 1 |
| `packages/contracts/src/figmintJson.v1.ts` | 2 |
| `src/core/sync/snapshotStore.ts` | 1 |
| `src/io/formats/figmintJson.ts` | 2 |
| `src/io/messages/snapshot.ts` | 1 |
| `src/ui/components/RepoSyncCard.tsx` | 2 |
| `src/ui/sync/useRepoSync.ts` | 2 |

### Official API / platform

| Fact | Source |
| ---- | ------ |
| pluginData 100KB limit | Figma Plugin API, 2026-05-28 |
| OAuth Device Flow via relay mandatory | memory.md WO-016 SPK-016-1 |
| `figma.fileKey` empty on unsaved files | memory.md 2026-05-28 |
| GitHub Contents API GET `/repos/{owner}/{repo}/contents/{path}` | Via relay — existing `fetchRepoFileContents` |

### Cross-ticket matrix

| Ticket | Relationship |
| ------ | ------------ |
| WO-028 | Snapshot spec absorbed — Phase 1 |
| WO-033 | Badge + on-open detect on repo card |
| WO-026 | Superseded — delete emission |
| WO-029–032 | Blocked until WO-058 Phase 1 snapshot API |
| WO-057 | Preflight gate — extend for malformed figmint.json |
| WO-056 | Future catalog may use Fetch metadata |

---

## Decision log

| ID | Decision | Rationale | Rejected |
| -- | -------- | --------- | -------- |
| D-058-1 | Delete registry repo file entirely | Designer rejection root cause | Keep optional sync file |
| D-058-2 | Delete envelope + filekey audit rules | Spurious FAIL on Untitled files | Repurpose against pluginData |
| D-058-3 | figmint.json optional with defaults | Never block connect | Require figmint.json |
| D-058-4 | Paths only from figmint.json | Remove Settings path inputs | Keep tokensPath override in Settings |
| D-058-5 | Push commits as OAuth user | No Figmint bot account | Machine account |
| D-058-6 | Three build phases | De-risk snapshot before UI | Single big-bang PR |
| D-058-7 | Pull Phase 1 = tokens only | Scope control | Full spec pull |
| D-058-8 | Snapshot module under `src/core/sync/` | Separates from drift detect logic | Collapse into drift/ |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-058-1 | Sandbox: write/read 50KB snapshot JSON on hidden frame | Round-trip + reopen plugin | ☐ pending `/build` |
| SPK-058-2 | Scaffold Button in Plugin Sandbox after migration | Zero envelope/filekey FAIL rows | ☐ VQA |
| SPK-058-3 | Fetch with missing figmint.json | Defaults applied; no error banner | ☐ unit test |
| SPK-058-4 | Fetch with malformed figmint.json | Warning banner; defaults | ☐ unit test |
| SPK-058-5 | Push opens PR on test repo via relay | PR URL returned | ☐ manual OAuth |
| SPK-058-6 | Components tab without "Load sync registry" | Registry from snapshot on mount | ☐ UI test |

---

## Risk register

| Risk | Sev | Lik | Mitigation |
| ---- | --- | --- | ---------- |
| Snapshot >100KB | High | Low | Size guard; SPK-058-1 |
| Breaking existing users with custom paths | Med | Med | One-time migration: on Fetch, ignore stored tokensPath |
| Pull applies wrong branch | Med | Low | Resolve default branch on Fetch; cache SHA |
| Registry data loss on snapshot clear | High | Low | Document `clearSnapshot`; no silent wipe |
| Test suite churn (~25 files) | Low | High | Single commit batch-updates tests |

---

## Recommendations (for `/plan`)

### Phase 1 — Snapshot + registry migration (Build Agent: code)

1. Add `snapshot.v1.ts` + `snapshotStore.ts` per WO-028 spec
2. Trim `registryAuditRows.ts` — delete envelope + filekey
3. Rewrite `registryExport.ts` → `snapshotRegistry.ts` (snapshot upsert only)
4. Update `runScaffold.ts` + `Components.tsx` to use snapshot
5. Delete `loadRegistryFromRepo.ts` GitHub fetch path
6. Update unit tests

### Phase 2 — figmint.json + Settings UI (Build Agent: code + UI)

1. Add `figmintJson.v1.ts` + parser + defaults
2. Implement `github/repo/fetch` + `github/repo/pull` handlers in `main.ts`
3. Replace Settings.tsx with `RepoSyncCard.tsx`
4. Remove path fields from session/storage/messages
5. Auto-load registry on Components mount from snapshot

### Phase 3 — Push + polish (Build Agent: code)

1. Wire Push button → `createPullRequestFlow` with staged files
2. Close WO-026 on GitHub
3. Add drift summary placeholder on repo card (counts stub until WO-029)
4. Extend WO-057 preflight for malformed figmint.json
5. Designer VQA on Plugin Sandbox

---

## Open questions

| ID | Question | Status |
| -- | -------- | ------ |
| OQ-058-1 | Final figmint.json fields beyond minimum | **RESOLVED** — see §7 schema |
| OQ-058-2 | Push commit author | **RESOLVED** — OAuth user |
| OQ-058-3 | Repurpose vs delete registry audit rules | **RESOLVED** — delete envelope + filekey |
| OQ-058-4 | Keep dev PR smoke test in Settings? | **Default:** remove; Push button replaces |
| OQ-058-5 | Multi-repo support | **Out of scope** — single active repo (existing `lastRepoUrl`) |
