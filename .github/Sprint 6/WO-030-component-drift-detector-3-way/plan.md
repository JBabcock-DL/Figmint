# Plan — WO-030: Component drift detector (3-way)

> **Ticket:** `.github/Sprint 6/WO-030-component-drift-detector-3-way/ticket.md`
> **Research:** `research/component-drift-detector-3-way.md`
> **Depends on:** WO-058 Phase 1 snapshot registry (shipped), WO-029 `classify.ts`, WO-022 variant matrix

---

## Approach

Implement **component drift detection** mirroring WO-029's 3-way classifier: compare Figma ComponentSets, repo `ComponentSpecV1` documents, and snapshot comparables keyed by registry component name (`Button`). Fast path uses `hashVariantMatrix` / `cvaHash`; on mismatch compute granular `ComponentDiff` (variant combos added/removed, props, bindings). Repo source is spec JSON from GitHub paths (UI-supplied until WO-058 Phase 2 `fighub.json`); snapshot baseline reads `snapshot.registry.components` plus optional `cmp/{name}` comparable blobs in `snapshot.keys`. Emit `ComponentDriftEntry[]` with ids `cmp/{kebab-name}`.

**In scope:** `figmaComponent.ts`, `components.ts`, diff helpers, quick-detect hash mode, fixtures, tests, main handler extension.

**Out of scope:** spec validation, auto-resolution, composed-child recursive drift, layout block compare (Phase 4).

---

## AC traceability

| AC / Req | Plan step(s) |
| -------- | ------------ |
| Req 1 `figmaComponent.ts` extractor | Steps 3–5 |
| Req 2 `components.ts` detector | Steps 6–9 |
| Req 3 drift id `cmp/` prefix | Step 2 |
| Req 4 variant/props/bindings facets | Steps 4, 7 |
| Req 5 repo = ComponentSpecV1 (not registry file) | Step 8 |
| Req 6 snapshot registry + keys | Step 6 |
| Req 7 shared classifyThreeWay | Step 9 |
| Req 8 granular ComponentDiff in entries | Step 7 |
| Req 9 quick hash-only detect mode | Step 10 |
| AC loading variant push | Steps 11, 13 |
| AC repo new prop pull | Step 13 |
| AC conflict both sides | Step 13 |
| AC 20 components <2s | Step 12 |

---

## Steps

### Phase A — Comparable model + Figma extract

- [x] **Step 1** — Extend `src/core/drift/types.ts` (shared with WO-029):
  ```typescript
  export interface ComponentComparable {
    specName: string;
    variantMatrixHash: string;
    variantMatrix?: Record<string, (string | boolean)[]>;
    props: ComponentSpecV1['props'];
    bindings: ComponentSpecV1['bindings'];
    nodeId?: string;
    pageName?: string;
  }

  export interface ComponentDiff {
    variantMatrix?: { added: string[]; removed: string[]; hashFigma: string; hashRepo: string };
    props?: { added: ComponentSpecProp[]; removed: string[]; changed: string[] };
    bindings?: { added: ComponentSpecBinding[]; removed: ComponentSpecBinding[]; changed: string[] };
  }

  export interface ComponentDriftDetectInput {
    repoSpecs: Record<string, ComponentComparable>;
    figmaComponents: Record<string, ComponentComparable>;
    snapshotComponents: Record<string, ComponentComparable>;
    options?: { quickDetect?: boolean };
  }
  ```
  **Done when:** typecheck passes; imports from `@detroitlabs/fighub-contracts`.

- [x] **Step 2** — Add `src/core/drift/componentKeys.ts`:
  ```typescript
  export function toComponentDriftId(specName: string): string  // 'cmp/button'
  export function registryKeyFromSpecName(specName: string): string  // 'Button'
  ```
  - Use existing `kebabCase` from `@/ui/export/defaultPaths` for slug (UI-safe import path: duplicate minimal kebab in drift module to avoid UI coupling — prefer `src/core/drift/componentKeys.ts` inline kebab).
  **Done when:** unit test: `Button` → `cmp/button`.

- [x] **Step 3** — Create `src/core/drift/figmaComponent.ts` (main-thread):
  ```typescript
  export function figmaComponentSetToComparable(set: ComponentSetNode): ComponentComparable
  ```
  - Read VARIANT axes from `componentPropertyDefinitions` (filter `type === 'VARIANT'`).
  - Build variant matrix map matching `ComponentSpecV1.variantMatrix` shape.
  - Compute hash via `hashVariantMatrix` from `@/core/components/scaffold/variantMatrix`.
  - Extract non-variant props via `applyProperties` introspection patterns or direct `componentPropertyDefinitions` scan (BOOLEAN/TEXT/INSTANCE_SWAP).
  - Bindings: scan descendant layers for bound variables — reuse selector patterns from `@/core/components/scaffold/propBindings` where possible; store `{ selector, variable }[]`.
  **Done when:** `tests/unit/core/drift/figmaComponent.test.ts` using `tests/helpers/scaffold/mockVariantTree.ts`.

- [x] **Step 4** — Add `src/core/drift/componentDiff.ts`:
  ```typescript
  export function componentComparableEqual(a: ComponentComparable, b: ComponentComparable): boolean
  export function buildComponentDiff(a: ComponentComparable, b: ComponentComparable): ComponentDiff | null
  ```
  - Equal when hash + deep-equal props + deep-equal bindings (order-insensitive bindings compare by selector key).
  - Diff only computed when not equal; variant added/removed via `expandVariantMatrix` combo names when hash differs.
  **Done when:** unit tests for props added, binding changed, matrix combo added.

- [x] **Step 5** — Add `specToComparable` in `src/core/drift/components.ts`:
  ```typescript
  export function specToComparable(spec: ComponentSpecV1): ComponentComparable
  ```
  - Hash from `spec.variantMatrix`; copy props/bindings verbatim.
  **Done when:** round-trip fixture `chip-button-minimal.v1.json`.

### Phase B — Snapshot + detect

- [x] **Step 6** — Implement `src/core/drift/snapshotComponents.ts`:
  ```typescript
  export function readSnapshotComponentComparables(): Record<string, ComponentComparable>
  ```
  - Primary: parse `getSnapshot().keys` entries prefixed `cmp/`.
  - Fallback baseline: derive minimal comparable from `getSnapshot().registry.components[name].cvaHash` when key blob missing (hash-only baseline).
  **Done when:** unit test with persisted snapshot fixture.

- [x] **Step 7** — Implement `buildComponentDriftEntry` helper in `components.ts` attaching `ComponentDiff` JSON into `figma`/`repo`/`lastSynced` unknown fields per contract.

- [x] **Step 8** — Implement repo spec map builder:
  ```typescript
  export function buildRepoSpecMap(
    specs: Array<{ name: string; spec: ComponentSpecV1 }>,
  ): Record<string, ComponentComparable>
  ```
  - Key = `spec.name` (registry key).

- [x] **Step 9** — Implement `detectComponentDrift(input: ComponentDriftDetectInput): ComponentDriftDetectResult`:
  - Union keys from registry snapshot component names present in any of the three maps.
  - Skip components with no repo spec AND no figma set AND no snapshot entry (greenfield — out of drift scope).
  - For each key: `classifyThreeWay(figma, repo, snapshot, componentComparableEqual)`.
  - Omit synced from `drifts[]`; count in `syncedCount`.
  - When `options.quickDetect === true`: equal uses hash-only compare (ignore props/bindings diff detail).
  **Done when:** AC fixtures pass.

### Phase C — Messages, tests, perf

- [x] **Step 10** — Extend `src/io/messages/drift.ts`:
  ```typescript
  export interface DriftDetectComponentsMessage {
    type: 'drift/detect-components';
    requestId: string;
    repoSpecs: Array<{ name: string; spec: ComponentSpecV1 }>;
    quickDetect?: boolean;
  }
  ```
  - Result message mirrors variables pattern with `ComponentDriftDetectResult`.

- [x] **Step 11** — Wire `handleDriftDetectComponents` in `src/main.ts`:
  - Enumerate ComponentSets on active pages OR accept optional `componentSetIds` in message (start with: scan all local component sets matching registry keys).
  - Call `figmaComponentSetToComparable` per set.
  **Done when:** handler unit test with mock figma component set tree.

- [x] **Step 12** — Bench test `tests/unit/core/drift/components.bench.test.ts`:
  - 20 synthetic comparables; assert < 200ms detect-only.
  **Done when:** ticket AC performance met with margin.

- [x] **Step 13** — Fixtures + detector tests:
  - `tests/fixtures/drift/component-button-loading-push.v1.json` — push + `{ variantMatrix: { added: ['loading=true'] } }`.
  - `tests/fixtures/drift/component-button-prop-pull.v1.json` — pull new prop.
  - `tests/fixtures/drift/component-button-conflict.v1.json` — conflict.
  - `tests/unit/core/drift/components.detect.test.ts` loads all three.
  **Done when:** SPK-030-1..3 criteria met.

- [x] **Step 14** — Integration `tests/integration/core/drift/componentDrift.integration.test.ts` using `mockVariantTree` + spec fixtures.

- [x] **Step 15** — CI gate: `npm run typecheck && npm test -- tests/unit/core/drift tests/integration/core/drift/componentDrift`.

---

## Build Agents

### Phase 1 (after WO-029 Steps 1–2 land, or merge classify first)

- `code-build` — **Steps 1–2:** component types + key helpers.

### Phase 2 (parallel)

- `code-build` — **Steps 3–5:** Figma extract + diff + spec mapper.

### Phase 3 (sequential)

- `code-build` — **Steps 6–9:** snapshot read + `detectComponentDrift`.

### Phase 4 (parallel)

- `code-build` — **Steps 10–11:** messages + main handler.
- `code-build` — **Steps 12–14:** fixtures, bench, integration.

### Phase 5

- `code-build` — **Step 15:** CI gate.

**Merge note:** If WO-029 and WO-030 build in parallel, WO-030 Phase 1 waits on WO-029 Steps 1–2 (`classify.ts`) landing on `main`.

---

## Dependencies & Tools

| Dependency | Status | Usage |
| ---------- | ------ | ----- |
| WO-058 snapshot registry | ✅ | `getSnapshot().registry.components` |
| WO-029 `classify.ts` | build order | Shared classifier |
| WO-022 variantMatrix | ✅ | hash + expand |
| WO-023/024 patterns | ✅ | bindings/props introspection |
| WO-031 | downstream | Report aggregation |

**No new MCP.** Mock ComponentSet trees in Vitest.

---

## Open Questions

| ID | Question | Status |
| -- | -------- | ------ |
| OQ-030-1 | Compare layout block? | **RESOLVED:** out of scope Phase 3 |
| OQ-030-2 | Instance swap props? | **RESOLVED:** included in props facet |
| OQ-S6-4 pull apply strategy | surgical vs re-scaffold | **Deferred to WO-032** — detector only reports hash/props/bindings |

---

## Notes

- **Ticket correction:** repo source is **spec files + snapshot registry**, not `.fighub-registry.json` (deleted WO-058).
- **ComponentSet missing:** registry entry with nodeId not found → classify as pull if spec exists, push if figma-only new component.
- **Quick detect:** used by WO-058 badge follow-up; full facet compare when drift panel expanded.

### Wrong vs correct

| Wrong | Correct |
| ----- | ------- |
| Read `.fighub-registry.json` from GitHub | Snapshot registry + spec JSON |
| Compare Figma node display name | Registry key = `spec.name` |
| Always expand 96-cell matrix | Hash first; expand only on drift |
| Reimplement classify logic | Import `classifyThreeWay` from WO-029 |

### Module tree

```
src/core/drift/
  figmaComponent.ts
  componentDiff.ts
  componentKeys.ts
  components.ts
  snapshotComponents.ts
tests/fixtures/drift/
  component-button-loading-push.v1.json
  component-button-prop-pull.v1.json
  component-button-conflict.v1.json
tests/unit/core/drift/
  figmaComponent.test.ts
  componentDiff.test.ts
  components.detect.test.ts
  components.bench.test.ts
```

### Bibliography

- `research/component-drift-detector-3-way.md`
- `../WO-029-variable-drift-detector-3-way/research/variable-drift-detector-3-way.md`
- `../../Sprint 5/WO-058-github-desktop-style-sync/plan.md`
