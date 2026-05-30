# Plan — WO-036: Tokens used + auto-layout metadata extraction

## Approach

Add **`src/core/handoff/tokens.ts`** exporting **`enumerateTokensAndLayout(root: SceneNode): Promise<{ tokens: string[]; autoLayout: HandoffAutoLayout }>`**. Recursively collect variable IDs from each node's **`boundVariables`** (fills, strokes, typography, layout spacing/padding), resolve to canonical paths **`{CollectionDisplayName}/{variable.name}`** using **`DISPLAY_NAME`** from `src/core/variables/collections.ts`, dedupe, and sort lexicographically.

Auto-layout metadata is read from the **root node passed in** (the captured handoff frame): `direction`, `gap`, `padding` as bound variable path strings or px fallback — **no literal/alias resolution** (ticket out of scope).

Reuse **`walkSceneTree`** from WO-035 (`src/core/handoff/walk.ts`).

**In scope:** token path enumeration, auto-layout meta, deterministic sort, Vitest with mock variable registry.

**Out of scope:** token value resolution, resolved alias literals, UI, envelope merge (WO-037).

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| Frame with 3 bound tokens returns those paths | Steps 4–6, 9, 11 |
| Auto-layout direction + gap + padding | Steps 7–8, 10, 11 |
| Unit + integration tests | Steps 9–12, 14 |

---

## Steps

- [x] **Step 1** — Create `src/core/handoff/tokens.ts` public API:

```typescript
import type { HandoffAutoLayout } from '@detroitlabs/fighub-contracts';

export interface TokensAndLayoutResult {
  tokens: string[];
  autoLayout: HandoffAutoLayout;
}

export async function enumerateTokensAndLayout(
  root: SceneNode,
): Promise<TokensAndLayoutResult>;
```

- Export from `src/core/handoff/index.ts`.
- **Done when:** typecheck passes.

- [x] **Step 2** — Implement pure collector `collectBoundVariableIds(node: SceneNode, out: Set<string>): void`:

Inspect `boundVariables` on node when present:

| Field keys (Plugin API) | Extract |
| ----------------------- | ------- |
| `fills`, `strokes` | nested `.color.id` when binding object |
| `layoutGap`, `counterAxisSpacing` | `.id` |
| `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight` | `.id` |
| `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` | `.id` |
| `effects` | each effect binding `.id` when array |

- Mirror traversal pattern from `src/core/drift/figmaComponent.ts` `scanBindings` but collect IDs only.
- Recurse children via `walkSceneTree`.
- **Done when:** unit test on mock node with fills + padding bindings collects 2+ IDs.

- [x] **Step 3** — Implement async resolver `resolveTokenPath(variableId: string): Promise<string | null>`:

```typescript
async function resolveTokenPath(variableId: string): Promise<string | null> {
  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (variable === null) return null;
  const collection = await figma.variables.getVariableCollectionByIdAsync(
    variable.variableCollectionId,
  );
  if (collection === null) return null;
  const displayName = collectionNameToDisplay(collection.name); // see Step 4
  return `${displayName}/${variable.name}`;
}
```

- **Done when:** mock registry returns `Theme/color/primary/default` style paths.

- [x] **Step 4** — Implement `collectionNameToDisplay(rawName: string): string`:

- Reverse-lookup `DISPLAY_NAME` from `src/core/variables/collections.ts` (match by value → key → display).
- Fallback: PascalCase first segment of `rawName` if unknown.
- **Done when:** `tests/unit/core/handoff/tokens.collection.test.ts` maps `primitives` → `Primitives`.

- [x] **Step 5** — Implement `enumerateTokensAndLayout` token branch:

1. `const ids = new Set<string>()`
2. `walkSceneTree(root, node => collectBoundVariableIds(node, ids))`
3. `const paths = (await Promise.all([...ids].map(resolveTokenPath))).filter(Boolean) as string[]`
4. Dedupe (Set), sort lexicographically
5. Return sorted array

- **Done when:** integration test returns 3 known paths sorted.

- [x] **Step 6** — Token path tests use **actual sandbox naming**, not illustrative AC shortcuts:

- Use paths like `Theme/color/primary/default`, `Layout/space/md`, `Typography/body/medium` in mocks.
- Document in test comment that AC `Theme/Primary` is illustrative only.
- **Done when:** test names match bootstrap-complete conventions.

- [x] **Step 7** — Implement `readAutoLayoutMeta(frame: SceneNode): HandoffAutoLayout`:

```typescript
function readAutoLayoutMeta(frame: SceneNode): HandoffAutoLayout;
```

| `layoutMode` | Result |
| ------------ | ------ |
| `'NONE'` | `{ direction: 'vertical', gap: '0', padding: '0' }` |
| `'HORIZONTAL'` | `direction: 'horizontal'` |
| `'VERTICAL'` | `direction: 'vertical'` |

- **Gap:** if `boundVariables.layoutGap` → resolve token path async; else `` `${frame.itemSpacing}px` ``.
- **Padding:** if all four paddings bound to same variable → single path; else `` `T:${top}px R:${right}px B:${bottom}px L:${left}px` `` with bound paths where available.
- **Done when:** vertical frame with bound gap returns variable path string.

- [x] **Step 8** — Wire auto-layout async in `enumerateTokensAndLayout`:

- `const autoLayout = await readAutoLayoutMetaAsync(root)` if padding/gap need variable resolution; else split sync layout read + async gap/padding only.
- **Done when:** combined result object matches contract type.

- [x] **Step 9** — Extend `tests/mocks/handoffFigma.ts` variable registry:

```typescript
export function installVariableRegistry(variables: Array<{
  id: string;
  name: string;
  collectionName: string;
}>): void;
```

- Stub `figma.variables.getVariableByIdAsync` + `getVariableCollectionByIdAsync`.
- **Done when:** token tests use registry.

- [x] **Step 10** — Unit tests `tests/unit/core/handoff/tokens.test.ts`:

| Case | Assert |
| ---- | ------ |
| No bindings | `tokens: []`, neutral autoLayout |
| 3 bindings across subtree | 3 sorted paths |
| Deleted variable ID | skipped silently |
| Horizontal auto-layout + px gap | `direction: 'horizontal'`, gap ends with `px` |
| Bound layout gap | gap equals token path |
| Mixed padding | composite padding string |

- **Done when:** all green.

- [x] **Step 11** — Integration test `tests/unit/core/handoff/tokens.integration.test.ts`:

- Single mock frame root with fills + typography + vertical layout.
- Snapshot `tokens` array + `autoLayout` object (stable ordering).
- **Done when:** snapshot committed.

- [x] **Step 12** — Cross-module test with `walkSceneTree`:

- Import walk from `@/core/handoff/walk` — if WO-035 not merged, land walk in WO-036 as duplicate then dedupe in WO-035 (prefer WO-035 lands walk first per sprint order).
- **Done when:** no duplicate walk implementations in repo.

- [x] **Step 13** — Performance: 100-node tree with 20 bindings resolves `< 150ms` with mocked async.
- **Done when:** perf test in CI.

- [x] **Step 14** — CI gate:

```bash
npm run lint && npm run typecheck && npm run test -- tests/unit/core/handoff
```

- **Done when:** all green.

---

## Build Agents

### Phase 1 (parallel) — blocked on WO-035 `walk.ts` landing

- `code-build` — Steps 1–4: API, ID collector, path resolver, collection display map

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 5–8: full enumeration + auto-layout meta

### Phase 3 (parallel, after Phase 2)

- `code-build` — Steps 9–13: mocks, unit/integration/perf tests

### Phase 4

- `code-build` — Step 14: CI gate

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-034 | Supplies root frame node per capture |
| WO-035 | Shared `walkSceneTree` (coordinate merge order) |
| `src/core/variables/collections.ts` | `DISPLAY_NAME` |
| `src/core/drift/figmaComponent.ts` | `scanBindings` pattern reference |
| `@detroitlabs/fighub-contracts` | `HandoffAutoLayout` |
| Vitest | Tests |

---

## Open Questions

- **RESOLVED:** Token value resolution out of scope.
- **RESOLVED:** Use `DISPLAY_NAME` collection prefix (research D-036-1).
- **RESOLVED:** Auto-layout from root only (research D-036-3).
- **RESOLVED:** Neutral default when no auto-layout (research).
- **Coordination:** If WO-035 and WO-036 build in parallel, extract `walk.ts` in WO-035 first or duplicate temporarily with follow-up dedupe PR.

---

## Notes

- Do **not** import drift alias resolver — handoff lists bound variable names only.
- WO-037 unions `tokensUsed` across frames (sorted unique).
- Main thread: `pluginLog('[handoff] enumerateTokensAndLayout', String(tokens.length), autoLayout.direction)`.
- Bibliography: `research/tokens-used-auto-layout-metadata-extraction.md`.
- **Build (2026-05-29):** Added `src/core/handoff/tokens.ts`; reused WO-035 `walk.ts`. Gap binding reads `itemSpacing` (Plugin API) with `layoutGap` alias. Fixed duplicate `walkSceneTree` export in `index.ts` and WO-035 typecheck blockers in `walk.ts`/`components.ts`. `npm run typecheck` + `npm run test -- tests/unit/core/handoff` green (41 tests). Repo-wide `npm run lint` still fails on pre-existing `src/core/drift/normalizeComparable.ts` errors unrelated to WO-036.
