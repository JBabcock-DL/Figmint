# Plan — WO-043: Dependency scanner + sub-component handling

## Approach

Replace the WO-039 **`scanDependencies` stub** with a **pure, single-file TypeScript AST pass** that discovers sub-component references (imports + JSX tags) in a `.tsx` source file, classifies each against a **merged registry key list** (canvas snapshot keys + optional repo `.fighub-registry.json` keys), and returns a **`DependencyTree`** before WO-041 full parse or scaffold work begins. Registered dependencies map to **`ComponentSpecV1.subComponents`** entries with **`registryRef`** (FR-IMP-8); unknown dependencies remain **`unknown`** so WO-044 can prompt the designer (**import first / placeholder / cancel**); circular relative-import cycles surface as **`circular`** errors.

Implementation lives under **`src/core/import/shared/`**: new **`tsAst.ts`** (shared AST helpers consumed by WO-041), **`dependencyScanner.ts`** (real `scanDependencies`), **`buildSubComponents.ts`** (tree → `ComponentSpecSubComponent[]`), and **`resolveRegistryKey.ts`** (PascalCase + kebab alias lookup). No UI components in this ticket — export **`DependencyTreePanelProps`** type alias for WO-044. No **`main.ts`** handlers — WO-044 owns `import/parse` orchestration; this ticket ships the core functions + registry-key merge helper the handler calls.

**In scope (ticket verbatim):**

- `scanDependencies(sourceText, sourcePath, options)` — TS AST light pass (imports + JSX tags).
- Output **`DependencyTree`** per WO-039 types; statuses **`registered` | `unknown` | `circular`**.
- Registry keys sourced from canvas snapshot + `.fighub-registry.json` merge helper.
- Wire exports for WO-041 parse pipeline and WO-044 dependency tree UI props type.
- Vitest unit + integration tests covering all three acceptance criteria.

**Out of scope (ticket verbatim):**

- Batch import of whole folders (manual one-by-one for v1).
- Auto-import sub-components without designer confirmation.
- Resolving `@/` tsconfig path aliases to filesystem paths (deferred — unknown status when import is non-relative and unmapped).
- Scanning **`node_modules`** or dynamic JSX (`<Component />` where `Component` is a variable).
- **`DependencyTreePanel.tsx`** UI implementation (WO-044).
- Full **`ImportTemplate.parse()`** body (WO-041).

**Greenfield note:** No DesignOps lift — new code per PRD §6.3 FR-IMP-3. Coordinate with WO-039 interface owner: **do not change** `DependencyTree` / `DependencyNode` shapes in `src/core/import/shared/types.ts` without a WO-039 follow-up.

---

## Acceptance criteria traceability

| Ticket AC / requirement                                              | Plan step(s)       | Verification                                                   |
| -------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------- |
| AC: Button.tsx uses `<Icon>` + `<Box>` → both registered ✓           | Steps 5–7, 9, 14   | `dependencyScanner.test.ts` "button-with-icon"                 |
| AC: Unknown sub-component → tree flags unknown + UI actions (WO-044) | Steps 5–7, 10, 15  | test "unknown-subcomponent"; `DependencyTreePanelProps` export |
| AC: Circular A→B→A surfaced as error                                 | Steps 5–7, 11, 14  | circular fixture tests                                         |
| Req 1: `scanDependencies` AST pass                                   | Steps 4–7          | implementation + tests                                         |
| Req 2: `DependencyTree` output with three statuses                   | Steps 3, 6–7       | typecheck + status assertions                                  |
| Req 3: Registry keys from snapshot + repo file                       | Steps 8, 12        | `collectRegistryKeys.test.ts`                                  |
| Req 4: Wire before WO-041 parse; WO-044 tree UI                      | Steps 13, 15–16    | integration test + exported props type                         |
| Testing: Vitest unit + integration                                   | Steps 9–11, 14, 17 | `npm test`                                                     |
| Telemetry: `console.debug` per major event                           | Step 7             | grep in scanner module                                         |

---

## Module tree (create / replace)

```
src/core/import/shared/
  types.ts                    # WO-039 — DO NOT reshape; import only
  tsAst.ts                    # NEW — createSourceFile, visitImports, visitJsxSelfClosing/Opening
  resolveRegistryKey.ts       # NEW — PascalCase + kebab alias → registry key or null
  collectRegistryKeys.ts      # NEW — merge snapshot RegistryV1 + repo RegistryV1 → unique keys[]
  dependencyScanner.ts        # REPLACE stub body — scanDependencies + exports
  buildSubComponents.ts       # NEW — registered nodes → ComponentSpecSubComponent[]
  index.ts                    # barrel — re-export public surface (add if missing)

tests/unit/core/import/shared/
  tsAst.test.ts
  resolveRegistryKey.test.ts
  collectRegistryKeys.test.ts
  dependencyScanner.test.ts   # REPLACE WO-039 stub contract tests
  buildSubComponents.test.ts
  importPipeline.integration.test.ts

tests/unit/core/import/shared/fixtures/
  button-with-icon.tsx
  button-with-unknown.tsx
  circular-a.tsx
  circular-b.tsx
  self-import.tsx
```

---

## Locked signatures (copy-paste for build agents)

```typescript
// --- src/core/import/shared/tsAst.ts ---
import ts from 'typescript';

export interface ParsedImportBinding {
  /** Local identifier used in JSX (e.g. Icon, Box, default local name) */
  localName: string;
  /** Module specifier string literal (e.g. '@/components/icon', '../box') */
  moduleSpecifier: string;
  /** true when `import Box from './box'` default import */
  isDefault: boolean;
}

export interface ParsedJsxTag {
  /** Tag identifier text (<Icon /> → 'Icon') */
  tagName: string;
  /** 1-based line for debug logging */
  line: number;
}

export function createTsxSourceFile(fileName: string, sourceText: string): ts.SourceFile;

export function collectImportBindings(sourceFile: ts.SourceFile): ParsedImportBinding[];

export function collectJsxComponentTags(sourceFile: ts.SourceFile): ParsedJsxTag[];

// --- src/core/import/shared/resolveRegistryKey.ts ---
export function resolveRegistryKey(
  componentName: string,
  registryKeys: readonly string[],
  nameToKey?: Readonly<Record<string, string>>,
): string | null;

// --- src/core/import/shared/collectRegistryKeys.ts ---
import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

export function collectRegistryKeys(
  canvasRegistry: RegistryV1 | null | undefined,
  repoRegistry: RegistryV1 | null | undefined,
): string[];

// --- src/core/import/shared/types.ts (WO-039 — reference only) ---
export type DependencyNodeStatus = 'registered' | 'unknown' | 'circular';

export interface DependencyNode {
  name: string;
  importPath: string;
  status: DependencyNodeStatus;
  children: DependencyNode[];
}

export interface DependencyTree {
  rootImportPath: string;
  nodes: DependencyNode[];
}

export interface ScanDependenciesOptions {
  registryKeys: readonly string[];
  /** Optional PascalCase → registry map key override */
  nameToKey?: Readonly<Record<string, string>>;
  /**
   * Optional sibling source texts for same-package relative imports (circular detection).
   * Keys: resolved relative path from sourcePath (posix, no extension).
   */
  siblingSources?: Readonly<Record<string, string>>;
}

export function scanDependencies(
  sourceText: string,
  sourcePath: string,
  options: ScanDependenciesOptions,
): DependencyTree;

// --- src/core/import/shared/buildSubComponents.ts ---
import type { ComponentSpecSubComponent } from '@detroitlabs/fighub-contracts';
import type { DependencyTree } from './types';

export function buildSubComponentsFromTree(
  tree: DependencyTree,
  registryKeys: readonly string[],
  nameToKey?: Readonly<Record<string, string>>,
): ComponentSpecSubComponent[];

// --- WO-044 UI contract (type-only export) ---
export type UnknownDependencyAction = 'import-first' | 'placeholder' | 'cancel';

export interface DependencyTreePanelProps {
  tree: DependencyTree;
  /** True when any node.status === 'unknown' */
  hasUnknown: boolean;
  /** True when any node.status === 'circular' */
  hasCircular: boolean;
  onResolveUnknown: (componentName: string, action: UnknownDependencyAction) => void;
  onContinue: () => void;
  onCancel: () => void;
}
```

---

## Algorithm specification (locked)

### Pass A — imports (`tsAst.collectImportBindings`)

| AST pattern                               | Extract                                            |
| ----------------------------------------- | -------------------------------------------------- |
| `import { Icon, Box as B } from './path'` | localName → moduleSpecifier for each specifier     |
| `import Icon from './path'`               | default localName = clause name, `isDefault: true` |
| `import * as Icons from './path'`         | skip (no single JSX tag)                           |
| `import type { … }`                       | skip type-only imports                             |
| Side-effect `import './styles.css'`       | skip                                               |

### Pass B — JSX tags (`tsAst.collectJsxComponentTags`)

| Pattern                                                       | Action                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `<Icon />`, `<Box>…</Box>`                                    | record `tagName` when first char uppercase (React component convention) |
| `<div>`, `<span>`                                             | skip lowercase intrinsic                                                |
| `<Icon.SubIcon />`                                            | use root identifier `Icon` only                                         |
| `{condition && <Icon />}`                                     | include                                                                 |
| `<Component />` where tag is identifier from lowercase import | skip (dynamic — out of scope)                                           |

Deduplicate tags by **`tagName`**; keep first **`importPath`** from import map. Tags with no import binding → **`unknown`** with `importPath: ''`.

### Pass C — registry status (`resolveRegistryKey`)

1. If `nameToKey[tagName]` set → use as candidate key.
2. Else if `registryKeys.includes(tagName)` → registered (PascalCase keys from canvas — matches `Object.keys(registry.components)` in `Components.tsx`).
3. Else if `registryKeys.includes(kebabCase(tagName))` → registered (alias for legacy kebab keys).
4. Else → **`unknown`**.

Reuse **`kebabCase`** from `src/core/drift/componentKeys.ts` (do not duplicate).

### Pass D — circular detection (MVP)

Only when **`siblingSources`** provided and import path is relative (`./` or `../`):

1. Resolve relative import to posix path key relative to `sourcePath` directory (normalize `..` segments; no filesystem I/O).
2. DFS: if resolved path revisits current file or cycle in `siblingSources` graph → mark node **`circular`**.
3. Without `siblingSources`, skip cross-file cycle detection (self-import `./self` still **`circular`** when tag imports from same file path).

Output shape: flat **`nodes[]`** at top level (no nested `children` for MVP unless circular subgraph warrants one child — prefer **flat list** with status on each node; `children: []` always).

### Logging

`console.debug('[import/scan]', { sourcePath, nodeCount, registered, unknown, circular })` once per `scanDependencies` call (main-thread safe — runs in plugin main during `import/parse`).

---

## Steps

### Foundation — AST helpers

- [x] **Step 1** — Verify WO-039 landed: `src/core/import/shared/types.ts` exports `DependencyTree`, `DependencyNode`, `DependencyNodeStatus`; `dependencyScanner.ts` exists with stub returning `{ rootImportPath, nodes: [] }`. If WO-039 not merged, create minimal types file matching locked signatures above before proceeding. **Done when:** `npm run typecheck` passes with stub import graph.

- [x] **Step 2** — Create **`src/core/import/shared/tsAst.ts`** implementing `createTsxSourceFile`, `collectImportBindings`, `collectJsxComponentTags` using `typescript` `createSourceFile` with `ScriptKind.TSX`, `ScriptTarget.Latest`, `setParentNodes: true`. Walk with `ts.forEachChild` only (no `createProgram`). **Done when:** `tests/unit/core/import/shared/tsAst.test.ts` covers named import, default import, type-only skip, JSX self-closing + paired tags, lowercase intrinsic skip.

- [x] **Step 3** — Create **`src/core/import/shared/resolveRegistryKey.ts`**: implement `resolveRegistryKey` per Algorithm Pass C; import `kebabCase` from `@/core/drift/componentKeys`. **Done when:** `resolveRegistryKey.test.ts` passes PascalCase hit, kebab alias hit, `nameToKey` override, null on miss.

### Core scanner

- [x] **Step 4** — Create **`tests/unit/core/import/shared/fixtures/button-with-icon.tsx`**: exported `Button` component importing `{ Icon }` from `'./icon'` and default `Box` from `'../box'`; JSX uses `<Icon />` and `<Box>…</Box>`. Create **`button-with-unknown.tsx`** with `<Missing />` from `'./missing'`. Create **`circular-a.tsx`** / **`circular-b.tsx`** mutual relative imports with JSX tags. Create **`self-import.tsx`** importing from same file.

- [x] **Step 5** — Implement **`scanDependencies`** body in **`src/core/import/shared/dependencyScanner.ts`**:
  - Call `createTsxSourceFile(sourcePath, sourceText)`.
  - Build `Map<localName, moduleSpecifier>` from Pass A.
  - For each JSX tag (Pass B), resolve `importPath` from map; compute `status` via `resolveRegistryKey(tagName, options.registryKeys, options.nameToKey)`.
  - Apply Pass D circular rules when `options.siblingSources` present.
  - Return `{ rootImportPath: sourcePath, nodes: DependencyNode[] }`.
  - Preserve stub export signature; extend with `ScanDependenciesOptions` interface in same file or re-export from types if WO-039 placed it there.
  - **Done when:** inline fixture strings in tests match expected node names + statuses.

- [x] **Step 6** — Implement **`buildSubComponentsFromTree`** in **`src/core/import/shared/buildSubComponents.ts`**: filter `tree.nodes` where `status === 'registered'`; map to `{ name: node.name, registryRef: resolveRegistryKey(...) ?? node.name }`. Omit unknown/circular. **Done when:** `buildSubComponents.test.ts` returns two entries for button-with-icon mock registry `['icon', 'box']` or `['Icon', 'Box']`.

- [x] **Step 7** — Add debug logging in `scanDependencies` per Telemetry requirement. **Done when:** grep `'[import/scan]'` in `dependencyScanner.ts`.

### Registry key merge

- [x] **Step 8** — Create **`src/core/import/shared/collectRegistryKeys.ts`**: `collectRegistryKeys(canvas, repo)` returns sorted unique `Object.keys(components)` from both registries (null-safe). Document in JSDoc: canvas snapshot is SSOT per WO-058; repo file is optional supplement when still present on GitHub. **Done when:** `collectRegistryKeys.test.ts` dedupes overlapping keys and handles both null.

- [x] **Step 9** — AC test **Button + Icon + Box registered**: in **`dependencyScanner.test.ts`**, call `scanDependencies` on `button-with-icon.tsx` fixture with `registryKeys: ['Icon', 'Box']` (or kebab equivalents); assert `nodes.length === 2`, both `status === 'registered'`, `importPath` matches fixture relative paths. **Done when:** test green.

- [x] **Step 10** — AC test **unknown sub-component**: `button-with-unknown.tsx` with registry keys `['Icon']` only; assert `Missing` node `status === 'unknown'`. Assert helper `treeHasUnknown(tree)` (export from dependencyScanner or test-local) returns true for WO-044 gating. **Done when:** test green.

- [x] **Step 11** — AC test **circular**: provide `siblingSources` for circular fixtures; assert at least one node `status === 'circular'` on `circular-a.tsx` parse. Self-import fixture marks circular without siblings. **Done when:** test green.

### Pipeline wiring (WO-041 / WO-044 contracts)

- [x] **Step 12** — Export public API from **`src/core/import/shared/index.ts`** (create barrel if absent): `scanDependencies`, `buildSubComponentsFromTree`, `collectRegistryKeys`, `resolveRegistryKey`, types `ScanDependenciesOptions`, `DependencyTree`, `DependencyTreePanelProps`, `UnknownDependencyAction`. Re-export from **`src/core/import/index.ts`** if WO-039 pattern expects top-level import. **Done when:** `import { scanDependencies } from '@/core/import/shared'` resolves in typecheck.

- [x] **Step 13** — Add **`importPipeline.integration.test.ts`**: simulate WO-041 ordering — given button fixture text + registry keys, run `scanDependencies` then `buildSubComponentsFromTree`; assert subComponents length and `registryRef` values; assert unknown fixture yields empty subComponents array. **Done when:** test documents call order in file header comment for WO-041 agent.

- [x] **Step 14** — Document WO-041 integration hook in **`buildSubComponents.ts`** file header (not separate markdown): WO-041 `parse()` must call `scanDependencies` before prop/binding extraction; assign `spec.subComponents = buildSubComponentsFromTree(tree, ctx.registryKeys)`; attach same `tree` on `ImportTemplateResult.dependencyTree`. **Done when:** comment present; no WO-041 code required in this PR.

- [x] **Step 15** — Export **`DependencyTreePanelProps`** + **`UnknownDependencyAction`** from `dependencyScanner.ts` or `types.ts` for WO-044 `DependencyTreePanel.tsx`. Props must include `hasUnknown`, `hasCircular`, three callbacks matching ticket UX (import first / placeholder / cancel). **Done when:** type exported; `npm run typecheck` passes without UI file.

- [x] **Step 16** — Document WO-044 **`import/parse`** handler merge (comment block at bottom of `collectRegistryKeys.ts`): (1) read canvas registry from snapshot handler, (2) optional `loadFromGitHub(repoUrl, '.fighub-registry.json')` best-effort, (3) `registryKeys = collectRegistryKeys(canvas, repo)`, (4) pass to `ImportTemplateContext.registryKeys`. **Done when:** comment lists exact function names; no `main.ts` edits in this ticket.

### CI gate

- [x] **Step 17** — Run full local CI: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build:community`. Fix any WO-039 stub test expectations that assumed empty nodes forever. **Done when:** all commands exit 0.

---

## Build Agents

### Phase 1 (sequential — AST foundation)

- `code-build` — **Steps 1–3**: Verify WO-039 types/stub, implement `tsAst.ts` + `resolveRegistryKey.ts` + unit tests. Blocks scanner work.

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 4–7**: Fixtures, `scanDependencies` implementation, `buildSubComponents.ts`, debug logging, scanner unit tests (Steps 9–11 can start once Step 5 lands).

### Phase 3 (parallel, after Phase 2)

- `code-build` — **Steps 8–11**: `collectRegistryKeys.ts`, AC tests (registered, unknown, circular).
- `code-build` — **Steps 12–16**: Barrel exports, integration test, WO-041/WO-044 contract comments and exported UI props types.

### Phase 4 (sequential, after Phase 3)

- `code-build` — **Step 17**: CI gate + fix stub test drift.

---

## Dependencies & Tools

| Dependency                                                   | Role                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **WO-039**                                                   | Defines `DependencyTree`, stub `scanDependencies`, `src/core/import/shared/` layout — must merge first        |
| **WO-026**                                                   | Registry key conventions (`RegistryV1.components` map keys, typically PascalCase) — read-only                 |
| **WO-041**                                                   | Consumer: calls `scanDependencies` + `buildSubComponentsFromTree` inside React `ImportTemplate.parse()`       |
| **WO-044**                                                   | Consumer: renders `DependencyTreePanelProps`; merges keys via `collectRegistryKeys` in `import/parse` handler |
| **`typescript@^6`**                                          | Already in root `package.json`; bundled to plugin main thread                                                 |
| **`@detroitlabs/fighub-contracts`**                          | `RegistryV1`, `ComponentSpecSubComponent`                                                                     |
| **`src/core/drift/componentKeys.ts`**                        | `kebabCase` helper                                                                                            |
| **`src/ui/components/scaffold/loadRegistryFromSnapshot.ts`** | Pattern for canvas registry keys (WO-044 reads snapshot — not imported by scanner)                            |
| **`src/io/sources/github.ts`**                               | `loadFromGitHub` for optional repo registry (WO-044 only)                                                     |

**No Figma MCP.** **No UI iframe changes.** **No manifest changes.**

**MCP servers:** none required for `/build`.

---

## Open Questions

| #   | Question                                                   | Status                                                                                                               |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Q1  | Flat `nodes[]` vs nested `children` for dependency tree UI | **RESOLVED:** flat top-level `nodes`; `children: []` always for MVP (research + WO-044 renders flat list)            |
| Q2  | Registry key casing: PascalCase vs kebab                   | **RESOLVED:** try PascalCase exact match first (canvas snapshot), then kebab alias via `kebabCase()`                 |
| Q3  | Cross-file circular without loading sibling file contents  | **RESOLVED:** optional `siblingSources` map; WO-044 may pass empty map in v1 — circular AC covered via test fixtures |
| Q4  | `.fighub-registry.json` deleted in WO-058                  | **RESOLVED:** `collectRegistryKeys` accepts null repo registry; canvas snapshot remains primary input per ticket     |

---

## Notes

### Project constraints

- **ES2017 on main thread:** scanner runs on main during `import/parse` — no optional chaining in `dependencyScanner.ts` / `tsAst.ts` if bundled for main; follow existing Vite/tsconfig target for `src/core/` (match WO-041 research: `typescript` API is ES2017-safe).
- **`console.debug` only** — no production telemetry.
- **Single-file AST** — never call `ts.createProgram` or read disk from scanner (Figma sandbox).
- **Do not scan `node_modules`** — ignore specifiers not matching relative `./` / `../` for circular graph; still list tag as `unknown` if not in registry.

### WO-041 parse pipeline insertion point (locked)

```
ImportTemplateContext
  → scanDependencies(ctx.sourceText, ctx.sourcePath, { registryKeys: ctx.registryKeys })
  → if tree has circular → add ImportParseIssue { code: 'circular-dependency', severity: 'error' }
  → … prop/binding passes …
  → spec.subComponents = buildSubComponentsFromTree(tree, ctx.registryKeys)
  → return { spec, dependencyTree: tree, issues }
```

### WO-044 gating (locked)

- Block spec preview when `hasCircular === true` (error state).
- When `hasUnknown === true`, show `DependencyTreePanel` with three actions; **placeholder** continues parse with empty subComponents for unknown names only.
- **Import first** queues navigation to import flow (WO-044 scope — not implemented here).

### Scaffold linkage

Registered subComponents feed **`mapSpecPropToFigma`** `node` props → **`INSTANCE_SWAP`** when `registryRef` resolves to canvas `nodeId` (existing path in `src/core/components/scaffold/propTypeMap.ts` — no changes in WO-043).

### Pre-plan spikes (from research)

| Spike     | Procedure                         | Pass                  |
| --------- | --------------------------------- | --------------------- | ------- |
| SPK-043-1 | Button + Icon + Box mock registry | statuses `registered` | Step 9  |
| SPK-043-2 | Circular fixture                  | status `circular`     | Step 11 |

### References (bibliography)

- Ticket: [ticket.md](ticket.md)
- Research: [research/dependency-scanner-subcomponent-handling.md](research/dependency-scanner-subcomponent-handling.md)
- WO-039 interfaces: [WO-039 research](../WO-039-mapping-template-and-import-template-interfaces/research/mapping-template-and-import-template-interfaces.md) § Interface signatures
- PRD: `Docs/PRD.md` §6.3 FR-IMP-3, FR-IMP-8
- Plan quality bar: `.github/templates/plan-quality-bar.md`
