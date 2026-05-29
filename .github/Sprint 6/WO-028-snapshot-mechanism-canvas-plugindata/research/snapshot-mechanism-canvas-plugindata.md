# WO-028 — Snapshot mechanism (canvas pluginData)

> **Ticket status:** Closed 2026-05-28 — **absorbed by WO-058 Phase 1**. This research remains the canonical spec for snapshot architecture consumed by WO-029–032 and WO-058 `/plan`.

---

## Summary

The per-key "last synced" snapshot is the **common ancestor** for 3-way drift detection (PRD FR-DRIFT-1). It must live in **canvas pluginData** on a **hidden node** inside the existing **FigHub Output** page — not in `figma.clientStorage` (per-file, not fork-portable) and not in a repo file (WO-058 deletes `.fighub-registry.json`).

**Locked recommendation:** Implement `SnapshotStoreV1` as a single JSON envelope at pluginData key `fighub:snapshot:v1` on a dedicated hidden frame `_FigHubSnapshotStore` sibling to `_FigHubOutputContent`. The envelope holds per-key entries `{ key, value, source, timestamp }` plus an embedded **registry map** (replaces repo-side `.fighub-registry.json`). Build this in **WO-058 Phase 1**; WO-028 ticket stays closed as absorbed.

API surface: `getSnapshot()`, `updateSnapshotKey(key, value, source)`, `updateSnapshotKeys(batch)`, `clearSnapshot()`, `ensureSnapshotNode()`.

---

## Key Findings

### 1. Output page infrastructure already exists

`src/io/sinks/outputPage.ts` (lines 4–89) defines:

- Page discovery: shared pluginData `fighub:pageRole=output`, fallback name `FigHub Output`
- Content frame: `_FigHubOutputContent` (960px wide, vertical auto-layout)

**Finding:** Snapshot store should **reuse `findOrCreateOutputPage()`** but add a **separate hidden frame** — do not mix snapshot binary JSON into visible TEXT nodes.

### 2. pluginData limits and key namespace

From `src/io/sinks/pluginData.ts`:

- Prefix: `fighub:` + kind (line 6–10)
- Hard limit: **100,000 bytes** per key (line 7, Figma Plugin API — [Plugin Data limits](https://www.figma.com/plugin-docs/api/properties/nodes-setplugindata/), retrieved 2026-05-28)

Existing contract keys use `fighub:{kind}` for export (e.g. `fighub:drift-report`). Snapshot uses **`fighub:snapshot:v1`** (versioned literal, distinct from per-export keys).

**Finding:** A 400-variable file with compact JSON (~200 bytes/var) ≈ 80 KB — within budget. Component registry + 20 specs adds ~5–15 KB. Monitor with unit test asserting serialized size < 90 KB for spike-400 + 20 components.

### 3. Snapshot envelope shape (new contract)

No `snapshot.v1` contract exists today (`packages/contracts/` grep: zero matches). **Recommend adding** `packages/contracts/src/snapshot.v1.ts`:

```typescript
export interface SnapshotEntryV1 {
  key: string;
  value: unknown;
  source: 'push' | 'pull';
  timestamp: string; // ISO-8601
}

export interface SnapshotRegistryEntryV1 {
  nodeId: string;
  key: string;
  pageName: string;
  publishedAt: string;
  version: number;
  cvaHash?: string | null;
}

export interface SnapshotV1 {
  v: 1;
  kind: 'snapshot';
  fileKey: string;
  updatedAt: string;
  keys: Record<string, SnapshotEntryV1>;
  registry: {
    components: Record<string, SnapshotRegistryEntryV1>;
  };
}
```

**Registry absorption:** WO-058 locks registry SSOT to this envelope. `SnapshotV1.registry` mirrors `RegistryV1.components` without the separate repo file.

### 4. Per-key semantics

| Event                                | Snapshot behavior                                                      |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Successful variable push (WO-008)    | `updateSnapshotKey('var/{collection}/{name}', canonicalValue, 'push')` |
| Successful pull apply (WO-032)       | Same with `source: 'pull'`                                             |
| Manual Figma edit                    | Snapshot **unchanged** → next detect classifies as push                |
| Manual repo edit (outside plugin)    | Snapshot unchanged → pull on next Fetch                                |
| Skip resolution (FR-RES-5)           | No update — drift resurfaces                                           |
| `clearSnapshot()`                    | Wipe keys + registry; used after rebase/migrate                        |
| Missing snapshot node / corrupt JSON | Treat as empty; PRD risk: repo = last-synced baseline                  |

### 5. Hidden node pattern

```typescript
const SNAPSHOT_FRAME_NAME = '_FigHubSnapshotStore';

export function findOrCreateSnapshotFrame(page: PageNode): FrameNode {
  // find by name on Output page
  // create: 1×1, visible=false, locked=true, clipsContent=true
  // append as first child (before content frame)
}
```

**Why hidden frame vs page pluginData:** Pages support `setPluginData` in Figma API; however, frame pattern matches export sink conventions and allows future sharding (OQ-S6-1) without page-level migration.

### 6. Fork survival

Canvas pluginData travels with file duplicate/fork (Figma copies pluginData on duplicate). `figma.fileKey` may change on fork — snapshot `fileKey` field should be **updated on first read after mismatch** with warning log, not hard fail.

### 7. Thread placement

Snapshot read/write runs on **main thread only** (Plugin API). UI requests via new message pair:

- `snapshot/read` → `{ ok, snapshot: SnapshotV1 | null }`
- `snapshot/update-keys` → `{ ok, updated: string[] }`

Mirror pattern from `src/io/messages/export.ts` and `src/io/sinks/outputPageClient.ts`.

---

## Validated evidence

### Repo inventory

| Exists | Path                                     | Role                                                     |
| ------ | ---------------------------------------- | -------------------------------------------------------- |
| ✅     | `src/io/sinks/outputPage.ts:39-89`       | Output page find/create                                  |
| ✅     | `src/io/sinks/pluginData.ts:6-80`        | pluginData write + 100KB guard                           |
| ✅     | `src/core/components/registry.ts:15-235` | Registry normalize/upsert — migrate to snapshot.registry |
| ✅     | `packages/contracts/src/registry.v1.ts`  | Entry shape to embed in snapshot                         |
| ❌     | `src/core/drift/snapshot.ts`             | Greenfield                                               |
| ❌     | `packages/contracts/src/snapshot.v1.ts`  | Greenfield                                               |

### Official API facts

| Fact                                                          | Source                                    |
| ------------------------------------------------------------- | ----------------------------------------- |
| `node.setPluginData(key, value)` string-only, 100k char limit | Figma Plugin API docs, 2026-05-28         |
| `getPluginData` / `setPluginData` on FrameNode                | Same                                      |
| pluginData copied on duplicate                                | Figma community docs (file fork behavior) |

### Cross-ticket matrix

| Ticket | Interface                                                  | Relationship       |
| ------ | ---------------------------------------------------------- | ------------------ |
| WO-058 | Implements snapshot + deletes repo registry                | **Owner** of build |
| WO-029 | Reads snapshot keys for variable compare                   | Consumer           |
| WO-030 | Reads snapshot.registry + component keys                   | Consumer           |
| WO-031 | Includes snapshot meta in drift report `lastSynced` fields | Consumer           |
| WO-032 | Calls `updateSnapshotKey` after resolution                 | Consumer           |

---

## Decision log

| ID      | Decision                           | Rationale                                     | Alternatives rejected                                         |
| ------- | ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| D-028-1 | Single blob `fighub:snapshot:v1`   | Simplest; fits 100KB for target scale         | Sharded keys per collection (defer unless SPK-028-1 fails)    |
| D-028-2 | Hidden frame on Output page        | Reuses page infra; invisible to designers     | clientStorage (not fork-portable); repo JSON (WO-058 deletes) |
| D-028-3 | Embed registry in snapshot         | WO-058 architectural lock                     | Separate registry pluginData key                              |
| D-028-4 | Implement in WO-058 not WO-028     | Ticket absorbed; avoids duplicate work        | Re-open WO-028                                                |
| D-028-5 | `fileKey` mismatch → warn + update | Untitled files have empty fileKey (memory.md) | Hard fail (spurious audit failures)                           |

---

## Pre-plan spikes

| Spike ID  | Procedure                                                                | Pass criteria        | Status                               |
| --------- | ------------------------------------------------------------------------ | -------------------- | ------------------------------------ |
| SPK-028-1 | Serialize spike-400 tokens + 20 registry entries; measure UTF-8 bytes    | < 90,000 bytes       | ☐ pending (unit test in WO-058 plan) |
| SPK-028-2 | Plugin Sandbox: create hidden frame, write/read 10KB JSON, reopen plugin | Round-trip identical | ☐ pending (WO-058 VQA)               |
| SPK-028-3 | Duplicate sandbox file; verify snapshot pluginData present               | Data survives fork   | ☐ deferred to VQA                    |

---

## Risk register

| Risk                                 | Severity | Likelihood      | Mitigation                                           |
| ------------------------------------ | -------- | --------------- | ---------------------------------------------------- |
| Snapshot exceeds 100KB               | High     | Low at 400 vars | Size guard + prune synced keys; shard if needed      |
| Corrupt JSON in pluginData           | Medium   | Low             | Parse try/catch → treat as empty + audit warning row |
| Empty fileKey on Untitled            | Medium   | High            | Don't key audit off fileKey; lazy update on save     |
| Concurrent update from push + detect | Low      | Medium          | Main-thread serial execution (Figma single-thread)   |

---

## Recommendations

1. **WO-058 `/plan` Step 1:** Add `snapshot.v1.ts` contract + `src/core/drift/snapshot.ts` (or `src/core/sync/snapshotStore.ts`).
2. **Migrate registry callers** (`Components.tsx`, `registryExport.ts`) to read `snapshot.registry` not GitHub `.fighub-registry.json`.
3. **Hook WO-008 push completion** to batch-update variable keys in snapshot.
4. **Export `ensureSnapshotNode()`** for WO-029–032 integration tests with mock frames.
5. **Keep WO-028 closed** — track build under WO-058 acceptance criteria.

---

## Open questions

| ID       | Question                                                 | Status                                                                                                                    |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| OQ-028-1 | Sharded snapshot if SPK-028-1 fails                      | **RESOLVED:** defer; single blob default                                                                                  |
| OQ-028-2 | Whether to store full token values or hashes in snapshot | **RESOLVED:** store canonical comparable values (same shape as drift `lastSynced`) — enables conflict UI 3-column compare |

---

## Appendix A — Message contract (for `/plan`)

### UI → main

```typescript
// src/io/messages/snapshot.ts (proposed)
type SnapshotReadRequest = { type: 'snapshot/read' };
type SnapshotReadResponse =
  | { type: 'snapshot/read/result'; ok: true; snapshot: SnapshotV1 }
  | { type: 'snapshot/read/result'; ok: false; error: string };

type SnapshotUpdateRequest = {
  type: 'snapshot/update-keys';
  keys: Array<{ key: string; value: unknown; source: 'push' | 'pull' }>;
};
```

### Push hook (WO-008)

After successful variable push in `src/core/variables/push.ts`, batch:

```typescript
const updates = pushedTokens.map((t) => ({
  key: 'var/' + t.collection + '/' + t.name,
  value: t.comparable,
  source: 'push' as const,
}));
await updateSnapshotKeys(updates);
```

### Registry migration (WO-058)

On scaffold upsert, write to `snapshot.registry.components[name]` instead of staging `.fighub-registry.json` for ExportSheet.

---

## Appendix B — Test matrix

| Case          | Setup                 | Expected                           |
| ------------- | --------------------- | ---------------------------------- |
| Fresh file    | No snapshot node      | `getSnapshot()` → empty envelope   |
| After push    | 10 vars pushed        | 10 keys with source push           |
| Manual edit   | Change 1 var in Figma | Snapshot unchanged                 |
| clearSnapshot | After migrate         | keys = {}, registry = {}           |
| Corrupt JSON  | Invalid pluginData    | Treat as empty + log warn          |
| Size guard    | >90KB payload         | Refuse write with actionable error |
