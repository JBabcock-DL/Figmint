# Components used + Code Connect URL enumeration (WO-035)

> **Status:** Research complete — ready for `/plan`  
> **Date:** 2026-05-29  
> **Ticket:** WO-035 (GitHub #38)  
> **PRD anchors:** §6.6 FR-HAND-2, §8.5 `components[]`

---

## Summary

WO-035 adds **`src/core/handoff/components.ts`** with `enumerateComponents(root: SceneNode): HandoffComponentUsage[]`. The function walks the subtree depth-first, finds `INSTANCE` nodes, resolves each instance’s **main component** (or remote main component), aggregates counts by **component set name** (fallback: main component name), and attaches an optional **code connect URL** when discoverable.

**Locked recommendation:** use **`getDevResourcesAsync({ includeChildren: false })`** on the **main component node** (not the instance) and take the first dev resource whose `url` looks like a GitHub (or HTTPS) link. There is **no** `getCodeConnectMap` in the Plugin API typings — Code Connect MCP tools are agent-only. Unmapped components emit `codeConnectUrl: undefined` (omit field in JSON per contract optional). Sprint 8 owns Code Connect *creation*; this ticket is read-only enumeration.

---

## Key findings

### 1. Plugin API surface for Code Connect

| Mechanism | Available in plugin sandbox? | Notes |
|-----------|-------------------------------|-------|
| `get_code_connect_map` (MCP) | **No** — external agent tool | Not callable from FigHub plugin |
| REST Code Connect output | **No** — [figma/code-connect#169](https://github.com/figma/code-connect/issues/169) | Not exposed via REST as of 2026-05-29 |
| `node.getDevResourcesAsync()` | **Yes** — Plugin API | Returns dev resources attached to component/component set; Code Connect UI mappings may surface here as links |

Research must spike SPK-035-1 in a file with known Code Connect mappings (design system file `Dw8NkEiG91NhjYqRPNTOOu` or sandbox) to confirm URL shape.

### 2. Instance walk + aggregation

```text
For each INSTANCE in subtree:
  main = instance.mainComponent ?? instance.mainComponentAsync
  key = main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name
  increment count[key]
  url = firstGitHubDevResource(main)
```

| Edge case | Handling |
|-----------|----------|
| Detached instance | Skip or bucket as `"Detached"` with warning |
| Same component set, multiple variants | Aggregate under **component set name** (matches designer mental model “Button × 4”) |
| Nested instances | Count all instances (do not dedupe by node id) |
| Remote components | Use `mainComponent` — dev resources inherit per Figma docs |

### 3. Contract alignment

`HandoffComponentUsage` (`packages/contracts/src/handoffContext.v1.ts`):

```typescript
{ name: string; instances: number; codeConnectUrl?: string }
```

Ticket example `{ name: 'Button', instances: 4, codeConnectUrl: string | null }` — use **omit** when null (JSON schema optional), not literal `null`.

### 4. Patterns to mirror

| Pattern | Location |
|---------|----------|
| Tree walk | `scanBindings` in `src/core/drift/figmaComponent.ts` |
| Fixture-driven tests | `tests/fixtures/component-spec-button*.json` |

---

## Validated evidence

### Repo inventory

- **Greenfield:** `src/core/handoff/components.ts` (create)
- Contract types: `HandoffComponentUsage` in `handoffContext.v1.ts`
- Markdown table renderer: `src/io/formats/markdown/handoffContext.ts` (Code Connect link column)
- Fixture with URL: `src/io/formats/__fixtures__/handoff-context-min.json`

### Cross-ticket matrix

| Ticket | Relationship |
|--------|--------------|
| WO-034 | Provides selected root node(s) — enumerate per frame or merge across selection in WO-037 |
| WO-037 | Aggregates `components[]` into `HandoffContextV1` |
| Sprint 8 | Code Connect PR emission — **out of scope** |

---

## Decision log

| ID | Decision | Rationale | Rejected |
|----|----------|-----------|----------|
| D-035-1 | Aggregate by component **set** name | Matches AC “4 Button instances” | Per-instance rows |
| D-035-2 | Dev resources for URL discovery | Only plugin-native read path found | Hard-code registry lookup |
| D-035-3 | `codeConnectUrl` optional omit | Matches contract + schema | Required empty string |
| D-035-4 | Depth-first walk entire subtree | Includes nested instances | Selection-only direct children |

---

## Pre-plan spikes

| Spike | Pass criteria |
|-------|---------------|
| **SPK-035-1** (required before `/build`) | On DS file with mapped Button, `enumerateComponents(frame)` returns non-empty `codeConnectUrl` matching GitHub path |
| SPK-035-2 | Frame with 4× Button + 2× Card → counts `[4, 2]` |

SPK-035-1 may run during `/plan` if designer confirms a mapped component node id.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Dev resources ≠ Code Connect in all plans | Document fallback; AC still passes with `codeConnectUrl` omitted |
| `getDevResourcesAsync` slow on deep trees | Walk instances only (not all nodes); cache by mainComponent.id |
| Remote library components | Async `getMainComponentAsync` when needed |

---

## Recommendations

1. Export `enumerateComponents(node)` + internal `aggregateInstances(instances: Instance[])`.
2. Add mock figma test harness extending existing `__mocks__/figmaVariables` pattern or new `handoff` mock module.
3. WO-037 merges component lists when multi-frame capture — dedupe by name summing instances.

---

## Open questions

- **RESOLVED:** Code Connect creation out of scope (ticket Out of scope).
- **Pending spike:** Exact dev resource payload for Code Connect UI mappings (SPK-035-1).
