# Component catalog discovery + batch scaffold (WO-056)

> **Status:** ✅ Research expanded for `/plan` (2026-05-29)
> **PRD:** §5.4 UC-4, §6.3 FR-IMP-*, FR-CONF-5
> **Dependencies:** WO-027, WO-016, WO-022 scaffold, WO-044 (layout)

---

## Summary

WO-056 implements **Browse repo components** — discover **`*.component-spec.v1.json`** (and configured globs) from the connected GitHub repo, **multiselect** checklist, **sequential batch scaffold** with per-item progress, and **one registry export** when done. Closes the WO-027 VQA gap: designers expected Load = full codebase catalog, not just canvas-linked sync registry.

**Locked recommendation:** **`discoverCatalogEntries(repoUrl, config)`** in `src/io/github/catalogDiscovery.ts` using **Git Trees API** (recursive) with fallback to path list; UI **`CatalogPanel.tsx`** inserted as **section #2** on Components tab; batch via **`catalog/scaffold-batch`** message reusing **`runScaffoldComponent`** loop.

---

## Requirement traceability

| AC | Implementation |
| -- | -------------- |
| ≥1 discoverable spec without paste | Tree scan finds `*.component-spec.v1.json` |
| Multiselect 3 → batch scaffold 3 | Sequential `scaffold/run` ×3 |
| Per-item progress + failures | `catalog/scaffold-batch/progress` messages |
| Settings sole repo config | Read `repoUrl` + `specsPath` from session only |

---

## Key findings

### 1. Discovery globs (priority order)

| Glob / path | Source |
| ----------- | ------ |
| `{specsPath}/**/*.json` | `ResolvedFigHubConfig.specsPath` (default `components/`) |
| `design/components/**/*.component-spec.v1.json` | `SPEC_RESOLUTION_PATHS[0]` convention |
| `design/component-specs/**/*.v1.json` | `SPEC_RESOLUTION_PATHS[1]` legacy |
| `{specsPath}/**/*.component-spec.v1.json` | explicit suffix |

**Entry shape:**

```typescript
export interface CatalogEntry {
  key: string;           // filename stem / registry key
  path: string;          // repo-relative
  displayName: string;   // spec.name after lazy parse optional
  kind: 'component-spec';
}
```

**Key extraction:** prefer JSON `name` field kebab-case; fallback to filename stem.

### 2. GitHub Trees API sequence

Per [GitHub REST docs](https://docs.github.com/en/rest/git/trees) (2026-05-29):

```http
GET /repos/{owner}/{repo}/git/trees/{branch_sha}?recursive=1
Authorization: Bearer {token}
```

**Steps:**

1. Resolve branch SHA — reuse logic from `createPullRequestFlow` (WO-018).
2. Fetch recursive tree via **`githubApiViaRelay`** (same as PR flow).
3. Filter `tree[].path` by extension/name patterns.
4. Deduplicate by `key` (prefer shortest path on collision).

**Rate limit:** cache tree result in session memory for 5 minutes; show "Refresh" button.

**Alternative:** paginated Contents API directory walk — slower; use only if tree > 100k entries (GitHub truncates).

### 3. Batch scaffold protocol

```typescript
// src/io/messages/catalog.ts

export interface CatalogDiscoverMessage {
  type: 'catalog/discover';
  requestId: string;
  repoUrl: string;
}

export interface CatalogScaffoldBatchMessage {
  type: 'catalog/scaffold-batch';
  requestId: string;
  repoUrl: string;
  /** repo-relative spec paths */
  specPaths: string[];
  options?: {
    continueOnError?: boolean; // default true
    skipUsageFrame?: boolean;
  };
}

export interface CatalogScaffoldBatchProgressMessage {
  type: 'catalog/scaffold-batch/progress';
  requestId: string;
  index: number;
  total: number;
  specPath: string;
  status: 'running' | 'done' | 'error';
  error?: string;
  componentSetName?: string;
}

export interface CatalogScaffoldBatchResultMessage {
  type: 'catalog/scaffold-batch/result';
  requestId: string;
  ok: boolean;
  completed: number;
  failed: number;
  registry: RegistryV1;
}
```

**Main loop:**

```typescript
for (let i = 0; i < specPaths.length; i++) {
  postProgress({ index: i, total, status: 'running', specPath });
  const loaded = await loadFromGitHub(repoUrl, specPaths[i]);
  if (!isComponentSpec(loaded)) { /* error; continue or break */ }
  const result = await runScaffoldComponent(loaded.payload, { registry: accumulatedRegistry });
  mergeRegistry(accumulatedRegistry, result.registry);
  postProgress({ status: 'done', ... });
}
postResult({ registry: accumulatedRegistry });
```

**Undo:** single `figma.commitUndo()` after batch (match bootstrap pattern) OR one undo group per item — **plan as one group at end**.

### 4. UI — CatalogPanel

- Search filter (client-side substring on `key` / `displayName`)
- Multiselect checkboxes + select all
- **Scaffold selected (N)** button — disabled if N=0 or batch running
- Progress: `2/5 — Button…` using batch progress messages
- Empty state: "No specs found. Try Import from repo or paste JSON."

**After WO-044 import success:** call `catalog/discover` refresh to show new spec.

### 5. Distinction from sync registry (education copy)

| Label | Data source | WO |
| ----- | ----------- | -- |
| **Browse repo components** | GitHub tree scan | WO-056 |
| **Re-scaffold from linked components** | Canvas snapshot registry | WO-027 |

Already documented in [component-catalog-roadmap](../../Sprint%205/research/component-catalog-roadmap.md).

### 6. Config paths (FR-CONF-5)

From `ResolvedFigHubConfig` (`packages/contracts/src/fighubJson.v1.ts`):

- `specsPath` — primary scan root
- `designSystemBranch` — tree ref
- No new Settings fields in WO-056

---

## Validated evidence

| Path | Role |
| ---- | ---- |
| `src/ui/components/scaffold/resolveComponentSpec.ts` | Path conventions |
| `src/io/formats/fighubJson.ts` | Default `specsPath: 'components/'` |
| `src/core/components/scaffold/runScaffold.ts` | Batch target |
| `src/io/github/createPullRequestFlow.ts` | Relay API + branch SHA |
| `src/ui/tabs/Components.tsx:285-286` | WO-056 forward reference |

---

## Module tree

```
src/io/github/
  catalogDiscovery.ts
src/io/messages/
  catalog.ts
src/ui/components/catalog/
  CatalogPanel.tsx
  CatalogEntryRow.tsx

tests/unit/io/github/
  catalogDiscovery.test.ts    # mock tree JSON
tests/unit/io/messages/
  catalog.test.ts
```

---

## Decision log

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D1 | Sequential scaffold | Figma API stability + clear progress |
| D2 | `continueOnError: true` default | AC: don't lose completed work |
| D3 | No preview in batch MVP | Optional single-item preview link later |
| D4 | Lazy-load spec name optional | Tree scan filename-only first |
| D5 | Share tree fetch with WO-040 later | Extract `repoTreeCache.ts` post-MVP |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass | Status |
| -------- | --------- | ---- | ------ |
| SPK-056-1 | Discover specs in FigHub repo (tests/fixtures paths) | ≥1 entry | ☐ |
| SPK-056-2 | Batch 2 bench specs on sandbox | 2 registry keys | ☐ |
| SPK-056-3 | Tree API on connected FigHub repo | <3s response | ☐ |

---

## Risk register

| Risk | Mitigation |
| ---- | ---------- |
| Tree truncated `truncated: true` | Fall back to path-specific walk for specsPath only |
| Duplicate keys different paths | UI show path; designer picks one |
| Long batch timeout | Max 20 per batch with warning |

---

## Recommendations for `/plan`

1. Implement **`catalogDiscovery.ts`** + unit tests with fixture tree JSON before UI.
2. Insert **`CatalogPanel`** in `Components.tsx` as second section (coordinate PR with WO-044).
3. Plan **Build Agents:** Phase 1 discovery API; Phase 2 batch handler; Phase 3 UI.
4. Manual test script: connect FigHub repo → discover WO-057 button spec → batch scaffold.

---

## Open questions

| Q | Status |
| - | ------ |
| Preview before batch item | **DEFERRED** — batch runs direct; import flow has preview |
| Export registry PR vs snapshot only | **RESOLVED:** update canvas snapshot registry; export via existing Export tab (no silent PR) |

---

## References

- [component-catalog-roadmap](../../Sprint%205/research/component-catalog-roadmap.md)
- [registry-ux-intent](../../Sprint%205/WO-027-components-tab-ui-forward-flow/research/registry-ux-intent.md)
- [Sprint 8 index](../../research/sprint-8-research-index.md)
- GitHub Trees API: https://docs.github.com/en/rest/git/trees
