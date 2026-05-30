# Plan — WO-035: Components used + Code Connect URL enumeration

## Approach

Add **`src/core/handoff/components.ts`** with **`enumerateComponents(root: SceneNode): Promise<HandoffComponentUsage[]>`** (async due to `getMainComponentAsync` / `getDevResourcesAsync`). Depth-first walk via shared **`src/core/handoff/walk.ts`** finds every **`INSTANCE`**, resolves main component, aggregates counts by **component set name** (fallback: main component name), and attaches optional **`codeConnectUrl`** from the first HTTPS/GitHub dev resource on the main component.

**Code Connect read path:** `mainComponent.getDevResourcesAsync({ includeChildren: false })` — there is **no** Plugin API for MCP `get_code_connect_map`. Unmapped components **omit** `codeConnectUrl` (never emit `null`).

**In scope:** instance walk, aggregation, dev-resource URL discovery, detached-instance handling, shared walk helper, Vitest with mock instances.

**Out of scope:** Code Connect creation (Sprint 8), UI (WO-038), envelope assembly (WO-037).

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| 4× Button + 2× Card → counts `[4, 2]` | Steps 4–5, 9, 12 |
| Code Connect URLs where mapped | Steps 6–7, 10, 13 |
| Unit + integration tests against fixture frames | Steps 8–12, 14 |

---

## Steps

- [x] **Step 1** — Create shared walker `src/core/handoff/walk.ts`:

```typescript
export function walkSceneTree(
  root: BaseNode,
  visit: (node: SceneNode) => void,
): void;
```

- Depth-first; invoke `visit` only for nodes with `'type' in node` and `type !== 'DOCUMENT'`.
- Skip invisible nodes optional — **include all** (instances may be hidden in dev).
- **Done when:** `tests/unit/core/handoff/walk.test.ts` — nested 3-level tree visit order.

- [x] **Step 2** — Create `src/core/handoff/components.ts` skeleton + types:

```typescript
import type { HandoffComponentUsage } from '@detroitlabs/fighub-contracts';

export interface EnumerateComponentsOptions {
  /** Cache dev resource lookups by mainComponent.id */
  cacheDevResources?: boolean;
}

export async function enumerateComponents(
  root: SceneNode,
  options?: EnumerateComponentsOptions,
): Promise<HandoffComponentUsage[]>;
```

- **Done when:** compiles; exported from `src/core/handoff/index.ts`.

- [x] **Step 3** — Implement aggregation key resolution:

```typescript
function componentAggregateKey(main: ComponentNode): string;
```

| Condition | Key |
| --------- | --- |
| `main.parent?.type === 'COMPONENT_SET'` | `main.parent.name` |
| else | `main.name` |

- **Done when:** unit test covers set vs standalone component.

- [x] **Step 4** — Implement instance collection in `enumerateComponents`:

1. `walkSceneTree(root, …)` — when `node.type === 'INSTANCE'`:
2. If `instance.detached === true` → `pluginLog('[handoff] skip detached instance', instance.name)`; skip.
3. Resolve main: `instance.mainComponent ?? await instance.getMainComponentAsync()`.
4. If main is null → skip with warning.
5. Increment count map `Map<string, { count: number; main: ComponentNode }>`.

- Sort output by `name` lexicographically before return.
- **Done when:** mock tree with 4× same instance + 2× other returns sorted `[{ name: 'Button', instances: 4 }, { name: 'Card', instances: 2 }]`.

- [x] **Step 5** — Implement dev resource URL resolver:

```typescript
async function resolveCodeConnectUrl(
  main: ComponentNode,
  cache: Map<string, string | undefined>,
): Promise<string | undefined>;
```

Algorithm:

1. Check cache by `main.id`.
2. `const resources = await main.getDevResourcesAsync({ includeChildren: false })`.
3. First resource where `typeof url === 'string' && /^https?:\/\//.test(url)` — prefer URLs containing `github.com` when multiple.
4. Cache result (including undefined).
5. Return `undefined` when none — **omit field** on usage object.

- **Done when:** mock returns GitHub URL for mapped component; omits for unmapped.

- [x] **Step 6** — Assemble `HandoffComponentUsage[]`:

```typescript
const usage: HandoffComponentUsage = { name: key, instances: count };
if (url !== undefined) {
  usage.codeConnectUrl = url;
}
```

- Never set `codeConnectUrl: null`.
- **Done when:** JSON.stringify omits key when unmapped (contract optional).

- [x] **Step 7** — Update barrel `src/core/handoff/index.ts`:

```typescript
export { enumerateComponents } from './components';
export { walkSceneTree } from './walk';
export type { EnumerateComponentsOptions } from './components';
```

- **Done when:** `@/core/handoff` re-exports compile.

- [x] **Step 8** — Extend mock harness `tests/mocks/handoffFigma.ts`:

```typescript
export function createMockInstance(options: {
  id: string;
  mainComponent: ComponentNode;
  detached?: boolean;
}): InstanceNode;

export function createMockComponentSet(name: string, variants: ComponentNode[]): ComponentSetNode;

export function stubDevResources(
  component: ComponentNode,
  urls: string[],
): void;
```

- **Done when:** used by component tests.

- [x] **Step 9** — Unit tests `tests/unit/core/handoff/components.test.ts`:

| Case | Assert |
| ---- | ------ |
| Empty frame (no instances) | `[]` |
| 4 Button + 2 Card | counts + sorted names |
| Nested instances (button inside card) | all counted |
| Detached instance | excluded from count |
| Remote main (async) | `getMainComponentAsync` stubbed |
| Dev resource GitHub URL | `codeConnectUrl` present |
| No dev resources | field absent |

- **Done when:** all green.

- [x] **Step 10** — Fixture-driven test using committed spec shape:

- Build mock frame tree mirroring `tests/fixtures/component-spec-button-canonical.json` hierarchy (Button instances only).
- **Done when:** at least one instance row matches spec component name.

- [x] **Step 11** — Performance guard:

- Tree with 200 instance nodes (mock) completes `< 200ms` with cached dev resources.
- **Done when:** test passes in CI.

- [x] **Step 12** — Wrong vs correct table (implement as test comments + assertions):

| Wrong | Correct |
| ----- | ------- |
| Call MCP `get_code_connect_map` from plugin | `getDevResourcesAsync` on main component |
| Aggregate by instance node name | Aggregate by component set name |
| Emit `codeConnectUrl: null` | Omit property |
| Walk only direct children | Full subtree DFS |

- **Done when:** documented in test file header; assertions enforce correct column.

- [ ] **Step 13** — Manual spike **SPK-035-1** checklist (runtime, `/vqa` or pre-build on DS file):

- File: design system `Dw8NkEiG91NhjYqRPNTOOu` (or sandbox frame with known mapping).
- Select frame containing mapped Button → `enumerateComponents` → non-empty `codeConnectUrl` matching GitHub path.
- Record node id in WO-038 VQA checklist when confirmed.
- **Done when:** spike log appended to ticket Notes or research — **blocking for merge only if dev resources return empty on known mapped component** (then escalate open question).

- [x] **Step 14** — CI gate:

```bash
npm run lint && npm run typecheck && npm run test -- tests/unit/core/handoff
```

- **Done when:** all green.

---

## Build Agents

### Phase 1 (parallel)

- `code-build` — Steps 1–3: `walk.ts`, component skeleton, aggregate key

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 4–7: instance walk, dev resources, barrel exports

### Phase 3 (parallel, after Phase 2)

- `code-build` — Steps 8–12: mocks, unit tests, fixture test, perf guard

### Phase 4 (after Phase 3)

- `code-build` — Steps 13–14: manual spike checklist + CI

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-034 | Selected root nodes (this module accepts any `SceneNode` root) |
| `@detroitlabs/fighub-contracts` | `HandoffComponentUsage` |
| `src/core/drift/figmaComponent.ts` | Pattern reference for `boundVariables` walk (not imported — avoid drift coupling) |
| Figma Plugin API | `INSTANCE`, `getMainComponentAsync`, `getDevResourcesAsync` |
| Vitest + handoff mock | Unit tests |

---

## Open Questions

- **RESOLVED:** Aggregate by component set name (research D-035-1).
- **RESOLVED:** Dev resources for URL discovery (research D-035-2).
- **RESOLVED:** Code Connect creation out of scope (ticket).
- **Pending runtime:** SPK-035-1 — confirm dev resource URL shape on DS mapped Button; if empty, document fallback-only behavior (AC still passes with omitted URLs).

---

## Notes

- WO-037 merges component lists across multi-frame capture: dedupe by `name`, sum `instances` (implement merge in WO-037, not here).
- Main thread: `pluginLog('[handoff] enumerateComponents', root.name, String(usages.length))`.
- Share `walkSceneTree` with WO-036 — land walk in this ticket first; WO-036 imports it.
- Bibliography: `research/components-used-code-connect-url-enumeration.md`, `src/io/formats/markdown/handoffContext.ts` (downstream table renderer).
