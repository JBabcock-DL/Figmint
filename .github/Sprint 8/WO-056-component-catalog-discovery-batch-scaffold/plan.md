# Plan — WO-056: Component catalog discovery + batch scaffold

## Approach

Deliver **Browse repo components** on the Components tab: discover every scaffoldable **`*.component-spec.v1.json`** (plus configured globs under Settings `specsPath`) from the connected GitHub repo via the **Git Trees API**, present a **searchable multiselect** checklist, and run **sequential batch scaffold** with per-item progress — reusing the existing **`runScaffoldComponent`** pipeline and merging registry state across items. One updated **`.fighub-registry.json`** snapshot is available for export via the existing Export tab after the batch completes (no silent PR).

This closes the WO-027 VQA gap: designers expected **Load** to mean “show everything in the codebase,” not only canvas-linked sync registry entries.

**In scope:**

- `src/io/github/catalogDiscovery.ts` — recursive tree walk + path filtering + dedupe
- `src/io/messages/catalog.ts` — `catalog/discover`, `catalog/scaffold-batch`, progress/result messages + ES2017 guards
- `src/main/catalogHandlers.ts` — main-thread handlers (discovery + sequential batch loop)
- `src/ui/components/catalog/CatalogPanel.tsx` (+ `CatalogEntryRow.tsx`) — section **#2** on Components tab
- Unit tests for discovery, messages, handlers, and CatalogPanel
- Session catalog refresh after WO-044 import success (message hook only — WO-044 owns import UI)

**Out of scope (ticket verbatim):**

- Non-React import parsers (WO-045+)
- Code Connect PR emission (WO-044 CC slice)
- Drift sync (Sprint 6+)
- New Settings fields — read `repoUrl`, `specsPath`, `designSystemBranch` from session only
- Per-item preview before batch (deferred — import flow retains preview)

**Lift reference (patterns only — do not copy bundles):**

| DesignOps / legacy intent | FigHub target |
| ------------------------- | ------------- |
| Registry resolver spec path conventions | `src/ui/components/scaffold/resolveComponentSpec.ts` → `SPEC_RESOLUTION_PATHS`, `buildSpecFilePath` |
| GitHub relay API usage | `src/io/github/createPullRequestFlow.ts` → `githubApiViaRelay`, branch ref resolution |
| Single scaffold orchestration | `src/core/components/scaffold/runScaffold.ts` → `runScaffoldComponent` |

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| Connected repo shows ≥1 discoverable spec without paste | Steps 1–4, 6, 14, 20 |
| Multiselect 3 specs → batch scaffold 3; registry lists all three | Steps 7–9, 11–13, 20 |
| Per-item progress + failures without losing completed work | Steps 7–9, 12, 16, 20 |
| Settings sole repo config | Steps 1, 5, 15 (read session only; no Settings UI edits) |

---

## Module tree

```
src/io/github/
  catalogDiscovery.ts          # discoverCatalogEntries, tree fetch, path filters
src/io/messages/
  catalog.ts                     # message types + isCatalog* guards
src/main/
  catalogHandlers.ts             # handleCatalogDiscover, handleCatalogScaffoldBatch
src/ui/components/catalog/
  CatalogPanel.tsx               # search, multiselect, batch trigger, progress
  CatalogEntryRow.tsx            # checkbox row
  catalogMessageListener.ts      # registerCatalogMessageListener (optional thin wrapper)
  useCatalogDiscovery.ts         # discover + cache state hook
  useCatalogBatchScaffold.ts     # batch progress hook

tests/unit/io/github/
  catalogDiscovery.test.ts
tests/unit/io/messages/
  catalog.test.ts
tests/unit/main/
  catalogHandlers.test.ts
tests/unit/ui/components/catalog/
  CatalogPanel.test.tsx
tests/fixtures/github/
  catalog-tree-fighub.json       # mock recursive tree response
```

---

## Steps

- [x] **Step 1** — Create `src/io/github/catalogDiscovery.ts` with exported types and config:

```typescript
export interface CatalogEntry {
  key: string;           // registry key — kebab-case from spec.name or filename stem
  path: string;          // repo-relative path
  displayName: string;   // human label — filename stem until lazy parse (D4)
  kind: 'component-spec';
}

export interface CatalogDiscoveryConfig {
  specsPath: string;           // from ResolvedFigHubConfig (default 'components/')
  designSystemBranch: string;  // tree ref
}

export interface CatalogDiscoveryResult {
  entries: CatalogEntry[];
  truncated: boolean;          // GitHub tree truncated flag
  fetchedAt: number;           // Date.now() for cache TTL
}

export async function discoverCatalogEntries(
  repoUrl: string,
  token: string,
  config: CatalogDiscoveryConfig,
): Promise<CatalogDiscoveryResult>;
```

- Normalize `specsPath` trailing slash (match `buildSpecFilePath` in `resolveComponentSpec.ts`).
- **Done when:** file compiles; exports listed above.

- [x] **Step 2** — Implement branch SHA resolution inside `catalogDiscovery.ts`:

```typescript
async function resolveBranchTreeSha(
  repoPath: string,
  token: string,
  branch: string,
): Promise<string>;
```

- `GET {repoPath}/git/ref/heads/{branch}` → read `object.sha` (same relay pattern as `createPullRequestFlow.ts` `githubGetWithRetry`).
- Throw `GitHubFlowError` on 404 with user-facing branch message.
- **Done when:** unit test mocks ref response and returns SHA string.

- [x] **Step 3** — Implement recursive tree fetch + path filtering in `catalogDiscovery.ts`:

```typescript
const CATALOG_PATH_PATTERNS = [
  // priority order — research §1
  (specsPath: string) => specsPath + '/**/*.component-spec.v1.json',
  () => 'design/components/**/*.component-spec.v1.json',
  () => 'design/component-specs/**/*.v1.json',
  (specsPath: string) => specsPath + '/**/*.json',
] as const;

function filterTreePaths(tree: GitHubTreeEntry[], specsPath: string): CatalogEntry[];
function extractCatalogKey(path: string): string;
function dedupeCatalogEntries(entries: CatalogEntry[]): CatalogEntry[];
```

- `GET {repoPath}/git/trees/{sha}?recursive=1` via `githubApiViaRelay`.
- Include only `type === 'blob'` nodes whose path matches:
  - ends with `.component-spec.v1.json`, OR
  - ends with `.v1.json` under `design/component-specs/`, OR
  - ends with `.json` under `{specsPath}/**` (exclude `node_modules`, `.git`, lockfiles via denylist prefix).
- **Key extraction:** filename stem kebab-case; if collision, prefer shortest `path` (research D2 dedupe).
- Set `displayName` = last path segment sans extension.
- **Done when:** `tests/unit/io/github/catalogDiscovery.test.ts` passes with fixture `tests/fixtures/github/catalog-tree-fighub.json` returning ≥2 entries including a `design/components/*.component-spec.v1.json` path.

- [x] **Step 4** — Truncated tree fallback in `catalogDiscovery.ts`:

- When response body has `truncated: true`, log via `pluginLog` and retry scoped walk:
  - `GET {repoPath}/contents/{specsPath}?ref={branch}` paginated directory listing (reuse `src/io/github/contents.ts` if present, else inline Contents API via relay).
  - Still apply `design/components/**` glob via shallow recursive Contents walk (max depth 4).
- Return `truncated: true` in result so UI can show warning.
- **Done when:** test asserts fallback path invoked when fixture tree has `truncated: true`.

- [x] **Step 5** — Session-scoped in-memory cache (5-minute TTL) in `catalogDiscovery.ts`:

```typescript
const TREE_CACHE_TTL_MS = 5 * 60 * 1000;
const treeCache = new Map<string, CatalogDiscoveryResult>();

export function clearCatalogDiscoveryCache(repoUrl?: string): void;
```

- Cache key: `{repoUrl}|{branch}|{specsPath}`.
- Export `clearCatalogDiscoveryCache` for Refresh button + post-import refresh.
- **Done when:** second call within TTL skips network; Refresh clears and refetches.

- [x] **Step 6** — Create `src/io/messages/catalog.ts` message contract:

```typescript
export const CATALOG_DISCOVER = 'catalog/discover';
export const CATALOG_DISCOVER_RESULT = 'catalog/discover-result';
export const CATALOG_SCAFFOLD_BATCH = 'catalog/scaffold-batch';
export const CATALOG_SCAFFOLD_BATCH_PROGRESS = 'catalog/scaffold-batch/progress';
export const CATALOG_SCAFFOLD_BATCH_RESULT = 'catalog/scaffold-batch/result';

export interface CatalogDiscoverMessage {
  type: typeof CATALOG_DISCOVER;
  requestId: string;
  repoUrl: string;
  specsPath?: string;
  designSystemBranch?: string;
  forceRefresh?: boolean;
}

export interface CatalogDiscoverResultMessage {
  type: typeof CATALOG_DISCOVER_RESULT;
  requestId: string;
  ok: boolean;
  entries?: CatalogEntry[];
  truncated?: boolean;
  error?: string;
}

export interface CatalogScaffoldBatchMessage {
  type: typeof CATALOG_SCAFFOLD_BATCH;
  requestId: string;
  repoUrl: string;
  specPaths: string[];
  options?: {
    continueOnError?: boolean; // default true (D2)
    skipUsageFrame?: boolean;
  };
}

export interface CatalogScaffoldBatchProgressMessage {
  type: typeof CATALOG_SCAFFOLD_BATCH_PROGRESS;
  requestId: string;
  index: number;
  total: number;
  specPath: string;
  status: 'running' | 'done' | 'error';
  error?: string;
  componentSetName?: string;
  displayName?: string;
}

export interface CatalogScaffoldBatchResultMessage {
  type: typeof CATALOG_SCAFFOLD_BATCH_RESULT;
  requestId: string;
  ok: boolean;
  completed: number;
  failed: number;
  registry: RegistryV1;
  errors?: { specPath: string; message: string }[];
}
```

- Add ES2017 guards: `isCatalogDiscoverMessage`, `isCatalogScaffoldBatchMessage`, `isCatalogDiscoverResultMessage`, `isCatalogScaffoldBatchProgressMessage`, `isCatalogScaffoldBatchResultMessage`, `isCatalogUiMessage`.
- Re-export `CatalogEntry` type from discovery module or duplicate minimal shape for UI-only imports.
- **Done when:** `tests/unit/io/messages/catalog.test.ts` validates happy + malformed payloads.

- [x] **Step 7** — Create `src/main/catalogHandlers.ts` — `handleCatalogDiscover`:

```typescript
export async function handleCatalogDiscover(message: CatalogDiscoverMessage): Promise<void>;
```

- Read OAuth token via existing GitHub session helper (same path as PR flow in `main.ts`).
- Resolve `specsPath` + `designSystemBranch` from message overrides, else `getSyncState(repoUrl).resolvedConfig`.
- If `forceRefresh`, call `clearCatalogDiscoveryCache(repoUrl)`.
- Call `discoverCatalogEntries`; post `catalog/discover-result`.
- **Done when:** handler test mocks relay + returns entries array.

- [x] **Step 8** — Implement `handleCatalogScaffoldBatch` sequential loop in `src/main/catalogHandlers.ts`:

```typescript
export async function handleCatalogScaffoldBatch(
  message: CatalogScaffoldBatchMessage,
): Promise<void>;
```

**Batch algorithm (locked — D1 sequential):**

```typescript
const continueOnError = message.options?.continueOnError !== false;
let accumulatedRegistry: RegistryV1 = loadRegistryFromCanvasSnapshot(); // existing helper
let completed = 0;
let failed = 0;
const errors: { specPath: string; message: string }[] = [];

if (message.specPaths.length > 20) {
  // research risk register — reject or truncate with warning
}

for (let i = 0; i < message.specPaths.length; i++) {
  const specPath = message.specPaths[i];
  postProgress({ index: i, total, specPath, status: 'running' });

  const loaded = await loadFromGitHub(message.repoUrl, specPath);
  if (!('payload' in loaded) || loaded.kind !== 'component-spec') {
    failed++;
    errors.push({ specPath, message: 'Not a component-spec document.' });
    postProgress({ status: 'error', error: '...' });
    if (!continueOnError) break;
    continue;
  }

  try {
    await runScaffoldComponent(loaded.payload, {
      registry: accumulatedRegistry,
      skipUsageFrame: message.options?.skipUsageFrame,
    });
    // merge registry from scaffold result — read post-scaffold registry snapshot
    accumulatedRegistry = readLatestRegistryFromScaffoldRun();
    completed++;
    postProgress({ status: 'done', componentSetName: loaded.payload.name });
  } catch (error) {
    failed++;
    errors.push({ specPath, message: extractErrorMessage(error) });
    postProgress({ status: 'error', error: extractErrorMessage(error) });
    if (!continueOnError) break;
  }
}

figma.commitUndo(); // single undo group at end (research §3)
postResult({ ok: failed === 0, completed, failed, registry: accumulatedRegistry, errors });
```

- Do **not** post individual `scaffold/progress` to UI during batch — only batch progress messages (avoid reducer collision).
- **Done when:** `tests/unit/main/catalogHandlers.test.ts` mocks `runScaffoldComponent` ×3, asserts 3 progress + 1 result, registry merge called.

- [x] **Step 9** — Wire handlers in `src/main.ts`:

- Import guards + handlers.
- Add dispatch branches before generic scaffold handler:

```typescript
if (isCatalogDiscoverMessage(message)) {
  handleCatalogDiscover(message).catch(/* post discover-result error */);
  return;
}
if (isCatalogScaffoldBatchMessage(message)) {
  handleCatalogScaffoldBatch(message).catch(/* post batch result error */);
  return;
}
```

- **Done when:** `grep -n "catalog/discover" src/main.ts` matches dispatch; typecheck passes.

- [x] **Step 10** — Create `src/ui/components/catalog/useCatalogDiscovery.ts`:

```typescript
export interface CatalogDiscoveryState {
  loading: boolean;
  entries: CatalogEntry[];
  error: string;
  truncated: boolean;
  lastFetchedAt: number | null;
}

export function useCatalogDiscovery(input: {
  repoUrl: string;
  specsPath?: string;
  designSystemBranch?: string;
  enabled: boolean;
}): CatalogDiscoveryState & { refresh: () => void };
```

- On mount when `enabled && repoUrl`, post `catalog/discover` with `requestId`.
- Listen for `catalog/discover-result` matching `requestId`.
- `refresh()` sets `forceRefresh: true`.
- **Done when:** hook test covers loading → success → error.

- [x] **Step 11** — Create `src/ui/components/catalog/useCatalogBatchScaffold.ts`:

```typescript
export interface CatalogBatchState {
  running: boolean;
  currentIndex: number;
  total: number;
  currentLabel: string;
  completed: number;
  failed: number;
  lastError: string;
  registry: RegistryV1 | null;
}

export function useCatalogBatchScaffold(): {
  state: CatalogBatchState;
  runBatch: (specPaths: string[], repoUrl: string) => void;
  reset: () => void;
};
```

- Track selected paths externally; `runBatch` posts `catalog/scaffold-batch`.
- Subscribe to progress + result messages filtered by `requestId`.
- **Done when:** hook test simulates 2-item batch progress sequence.

- [x] **Step 12** — Create `src/ui/components/catalog/CatalogEntryRow.tsx`:

```typescript
export interface CatalogEntryRowProps {
  entry: CatalogEntry;
  checked: boolean;
  disabled: boolean;
  onToggle: (path: string, checked: boolean) => void;
}
```

- Render checkbox + `displayName` + muted `path` (11px secondary).
- `aria-label={`Select ${entry.displayName}`}`.
- **Done when:** renders in CatalogPanel test.

- [x] **Step 13** — Implement `src/ui/components/catalog/CatalogPanel.tsx`:

```typescript
export interface CatalogPanelProps {
  repoUrl: string;
  specsPath?: string;
  designSystemBranch?: string;
  githubConnected: boolean;
  onOpenSettings?: () => void;
  onBatchComplete?: (registry: RegistryV1) => void;
  refreshToken?: number; // increment after WO-044 import success
}
```

**UI behavior table:**

| State | UI |
| ----- | -- |
| `!githubConnected` | Disabled panel + "Connect GitHub in Settings" + optional Open Settings button |
| `loading` | "Discovering components…" + `aria-busy` |
| `entries.length === 0` | Empty: "No specs found. Try Import from repo or paste JSON." + link copy distinguishing catalog vs sync file |
| `entries.length > 0` | Search input (client filter on `key`, `displayName`, `path`) + select all + checklist |
| `selectedCount > 0` | Primary **Scaffold selected (N)** button |
| `batch.running` | Progress line `{currentIndex+1}/{total} — {currentLabel}…` + disable checklist |
| `batch.complete` | Summary `{completed} scaffolded, {failed} failed` + call `onBatchComplete(registry)` |

- Max batch size: if N > 20, show inline warning and disable scaffold (research risk register).
- **Refresh** button calls `refresh()` on discovery hook.
- **Done when:** `tests/unit/ui/components/catalog/CatalogPanel.test.tsx` covers empty, list, select-all, disabled-when-not-connected.

- [x] **Step 14** — Integrate `CatalogPanel` into `src/ui/tabs/Components.tsx` as **section #2**:

- Insert new `<section aria-label="Browse repo components">` **between** "Paste or load spec" (#1) and "Re-scaffold from linked components" (#3).
- Remove WO-056 placeholder copy from section #1 (`ships in WO-056`).
- Pass `repoUrl`, `specsPath`, `github.connected`, `onOpenSettings`.
- On `onBatchComplete`, update `registryKeys` state from `Object.keys(registry.components).sort()` (same as single scaffold result handler).
- **Done when:** Components tab renders three distinct sections with correct headings per research §5 education copy table.

- [x] **Step 15** — Read config from session only (FR-CONF-5):

- Do not add Settings inputs.
- `CatalogPanel` receives `specsPath` + branch from `App.tsx` props (already passes `githubSession.resolvedConfig.specsPath`).
- Extend `App.tsx` → `Components` props if `designSystemBranch` not yet threaded.
- **Done when:** discovery message includes branch from session when connected.

- [x] **Step 16** — Batch error UX in `CatalogPanel.tsx`:

- After batch, if `failed > 0`, render compact error list (spec path + message) without clearing successful selections.
- Completed scaffolds remain on canvas; registry reflects merged successes only.
- **Done when:** test asserts error list visible when mock result has `failed: 1`.

- [x] **Step 17** — WO-044 import refresh hook (coordination only):

- Export `CatalogPanel` refresh trigger: accept `refreshToken?: number` prop; `useEffect` on change calls `refresh()`.
- Document in comment: WO-044 increments `refreshToken` after successful import-from-repo.
- Do **not** implement import UI (WO-044 scope).
- **Done when:** test asserts discover re-posted when `refreshToken` changes.

- [x] **Step 18** — Message contract alignment test `tests/unit/ui/components/catalog/messageContract.test.ts`:

- Assert UI posts match `catalog.ts` shapes.
- Assert progress/result fields consumed by hooks.
- **Done when:** test green.

- [x] **Step 19** — Accessibility checks in `CatalogPanel.test.tsx`:

| Control | Requirement |
| ------- | ----------- |
| Search input | `<label>` or `aria-label="Filter components"` |
| Select all | `aria-label="Select all components"` |
| Scaffold button | `aria-disabled` when N=0 or batch running |
| Progress | `role="status"` live region |

- **Done when:** assertions in test file.

- [ ] **Step 20** — Manual E2E checklist **SPK-056-1** (Plugin Sandbox):

1. Connect FigHub repo in Settings (OAuth)
2. Open Components tab → **Browse repo components** section loads ≥1 entry without paste
3. Search filter narrows list
4. Select 3 entries → **Scaffold selected (3)** → observe `1/3`, `2/3`, `3/3` progress
5. Export tab → confirm registry lists all three keys
6. Intentionally include one bad path (if fixture available) → batch completes partial + error row

- **Done when:** `/vqa` log attached to ticket.

- [ ] **Step 21** — Performance spike **SPK-056-3**:

- Tree fetch on connected FigHub repo completes <3s (research pre-plan spike).
- Record `fetchedAt` delta in VQA notes.
- **Done when:** noted in VQA report.

- [x] **Step 22** — CI gate:

```bash
npm run lint && npm run typecheck && npm run test -- \
  tests/unit/io/github/catalogDiscovery.test.ts \
  tests/unit/io/messages/catalog.test.ts \
  tests/unit/main/catalogHandlers.test.ts \
  tests/unit/ui/components/catalog
```

- **Done when:** all green.

- [x] **Step 23** — Regression: existing Components tab tests unaffected:

```bash
npm run test -- tests/unit/ui/tabs/Components.test.tsx
```

- Single scaffold via paste + sync registry re-scaffold still pass.
- **Done when:** no regressions.

---

## Build Agents

### Phase 1 (parallel) — discovery + messages (no UI dependency)

- `code-build` — Steps 1–6: `catalogDiscovery.ts`, tree fetch, cache, truncated fallback, `catalog.ts` types/guards, fixture tree JSON

### Phase 2 (parallel, after Phase 1) — main handlers

- `code-build` — Steps 7–9: `catalogHandlers.ts` discover + sequential `runScaffoldComponent` batch loop, `main.ts` dispatch

### Phase 3 (parallel, after Phase 2) — UI hooks + panel

- `code-build` — Steps 10–13: `useCatalogDiscovery`, `useCatalogBatchScaffold`, `CatalogEntryRow`, `CatalogPanel`

### Phase 4 (parallel, after Phase 3) — integration + tests

- `code-build` — Steps 14–19: `Components.tsx` section #2, session config threading, batch error UX, WO-044 refresh hook, contract + a11y tests

### Phase 5 (after Phase 4) — verification

- `code-build` — Steps 20–23: manual SPK-056-1/3 VQA, CI gate, Components regression

**Hard dependency:** WO-027 Components tab shell merged (sections #1 and #3 exist). WO-016 GitHub OAuth + relay required for live discovery. Coordinate section order with WO-044 PR — CatalogPanel is section **#2**; WO-044 import browser is section **#4** (or merged adjacent — do not duplicate browse UX).

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-027 | Components tab shell, sync registry section, single `scaffold/run` UX |
| WO-016 | GitHub OAuth, `githubApiViaRelay`, `loadFromGitHub` |
| WO-022–026 | `runScaffoldComponent` scaffold pipeline |
| WO-044 | Import-from-repo UI; post-import `refreshToken` increment (coordination) |
| `@detroitlabs/fighub-contracts` | `ComponentSpecV1`, `RegistryV1`, `ResolvedFigHubConfig` |
| GitHub REST Trees API | `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` |
| Vitest | Unit tests with mocked relay responses |
| Plugin Sandbox | SPK-056-1 manual VQA |

---

## Open Questions

- **RESOLVED:** Sequential scaffold (D1) — Figma API stability + clear progress.
- **RESOLVED:** `continueOnError: true` default (D2) — partial batch preserves completed work.
- **RESOLVED:** No per-item preview in batch MVP — import flow retains preview.
- **RESOLVED:** Export via existing Export tab snapshot — no silent registry PR.
- **RESOLVED:** Single `figma.commitUndo()` after entire batch (match bootstrap pattern).
- **DEFERRED:** Extract shared `repoTreeCache.ts` with WO-040 — post-MVP (D5).

---

## Notes

- **ES2017:** no optional chaining in shipped plugin code if repo convention forbids; match surrounding `main.ts` / message guard style.
- **Logging:** use `pluginLog('[main] catalog/...')` and `console.debug('[ui] catalog/...')` — never log OAuth tokens or full spec payloads.
- **Wrong vs correct:**

| Wrong | Correct |
| ----- | ------- |
| Re-scaffold sync registry keys for catalog list | Git tree scan for spec file paths |
| Parallel `runScaffoldComponent` calls | Sequential loop with merged registry |
| New Settings fields for catalog paths | Read `specsPath` + branch from session |
| Post `scaffold/progress` during batch | Post `catalog/scaffold-batch/progress` only |
| Silent PR with updated registry | User confirms export on Export tab |

- **Section order on Components tab (coordinate WO-044):**

| # | Heading | Ticket |
| - | ------- | ------ |
| 1 | Paste or load spec | WO-027 |
| 2 | **Browse repo components** | **WO-056** |
| 3 | Re-scaffold from linked components | WO-027 |
| 4 | Import from repo (file browser) | WO-044 |

- **Bibliography:** `ticket.md`, `research/component-catalog-discovery-batch-scaffold.md`, `research/component-catalog-roadmap.md`, `src/ui/components/scaffold/resolveComponentSpec.ts`, `src/io/github/createPullRequestFlow.ts`.

---

## Phased delivery if WO-044 not merged

1. Ship CatalogPanel + batch scaffold fully.
2. WO-044 import refresh: `refreshToken` prop defaults to `0`; no-op until WO-044 wires increment.
3. Empty-state copy references "Import from repo" as upcoming — do not stub broken import button.
