# Plan — WO-039: MappingTemplate + ImportTemplate interfaces

## Approach

Ship the **interface gate** for Sprint 8 Phase 4a: two shared TypeScript contracts (`MappingTemplate` for Figma → Code Connect stub generation, `ImportTemplate` for code → `ComponentSpecV1` parsing) plus registries, shared import utilities (stub bodies), and React no-op implementations that prove compile-time wiring before WO-040/041 land.

**Greenfield:** `src/core/codeconnect/` and `src/core/import/` do not exist today. WO-039 creates the full module tree, locks every signature from research, and adds Vitest contract tests so downstream tickets import from `@/core/codeconnect` and `@/core/import` without circular dependencies.

**Strategy (research D1–D6):**

1. Split **Code Connect** (`codeconnect/`) from **import** (`import/`) per PRD §6.7 vs §6.3.
2. Place shared import helpers under `import/shared/` — `TokenResolver` interface (impl WO-042), `scanDependencies` stub (impl WO-043), `propTypeMapper` + `layoutInferrer` skeletons (impl WO-041).
3. **Reuse** `coerceBooleanDefault` / `coerceTextDefault` from `src/core/components/scaffold/propTypeMap.ts` inside `propTypeMapper.ts` — do **not** fork boolean/string default logic (inverse direction: TS props → spec, not spec → Figma).
4. React stub classes satisfy AC “at least one stub implementation referenced” — real generators/parsers replace them in WO-040/041.
5. Registries return `null` for unsupported frameworks (`vue`, `wc`, `swiftui`, `compose` until future tickets).

**In scope:**

- `MappingTemplate`, `MappingTemplateContext`, `UnmappedComponentRef`, `MappingStubFile` in `src/core/codeconnect/types.ts`
- `ImportTemplate`, `ImportTemplateContext`, `ImportTemplateResult`, `ImportParseIssue` in `src/core/import/types.ts`
- Shared types + stubs in `src/core/import/shared/`
- `getMappingTemplate` / `getImportTemplate` + list helpers in both registries
- React stub templates in `templates/reactStub.ts` (both sides)
- Barrel exports: `src/core/codeconnect/index.ts`, `src/core/import/index.ts`
- Vitest: registry wiring + shared utility contract tests

**Out of scope (ticket verbatim):**

- Per-framework implementations (WO-040+)
- UI tab affordances (WO-044)
- Main-thread message handlers (`main.ts`) — WO-044/056
- Full `TokenResolver` impl (WO-042), full `scanDependencies` (WO-043), AST parse (WO-041)
- Scaffold message changes — existing `scaffold/run` unchanged

**No lift reference** — PRD-designed greenfield; do not port DesignOps-plugin bundles.

---

## Acceptance criteria traceability

| Ticket AC / requirement | Plan steps |
| ----------------------- | ---------- |
| R1 `MappingTemplate` + related types in `codeconnect/types.ts` | Steps 1, 8 |
| R2 `ImportTemplate` + related types in `import/types.ts` | Steps 1, 7 |
| R3 Shared utilities: `TokenResolver`, `dependencyScanner`, `propTypeMapper`, `layoutInferrer` | Steps 2–6 |
| R4 `getMappingTemplate(framework)` / `getImportTemplate(framework)` registries | Steps 11–12 |
| R5 Barrel exports `codeconnect/index.ts`, `import/index.ts` | Steps 13–14 |
| AC: Both interfaces compile + React stub referenced | Steps 9–10, 11–12, 16–17 |
| AC: Per-framework template factories return implementations | Steps 11–12, 16–17 |
| AC: Unit tests for shared utilities | Steps 18–20 |
| Testing: Vitest unit + integration | Steps 18–21 |
| Telemetry: `console.debug` per major event | Step 22 |

---

## Module tree (create in WO-039)

```
src/core/codeconnect/
  index.ts                 # barrel — Step 14
  types.ts                 # MappingTemplate surface — Step 8
  registry.ts              # getMappingTemplate, listSupportedMappingFrameworks — Step 12
  templates/
    reactStub.ts           # no-op MappingTemplate — Step 10

src/core/import/
  index.ts                 # barrel — Step 13
  types.ts                 # ImportTemplate surface — Step 7
  registry.ts              # getImportTemplate, listSupportedImportFrameworks — Step 11
  templates/
    reactStub.ts           # no-op ImportTemplate — Step 9
  shared/
    types.ts               # TokenResolveResult, DependencyTree — Step 2
    tokenResolver.ts       # TokenResolver interface + notImplemented stub — Step 3
    dependencyScanner.ts   # scanDependencies stub — Step 4
    propTypeMapper.ts      # mapTsPropsToSpec stub — Step 5
    layoutInferrer.ts      # inferLayoutFromSource stub — Step 6

tests/unit/core/codeconnect/
  registry.test.ts         # Step 16

tests/unit/core/import/
  registry.test.ts         # Step 17
  shared/
    dependencyScanner.test.ts   # Step 18
    propTypeMapper.test.ts      # Step 19
    layoutInferrer.test.ts      # Step 20
    tokenResolver.test.ts       # Step 18 (same phase)
```

---

## Steps

- [x] **Step 1** — Scaffold module directories per tree above.

- Create empty placeholder files for every path listed in **Module tree** so later steps have stable import targets.
- Do **not** add `main.ts` handlers or UI imports.
- **Done when:** `git status` shows all paths; `npm run typecheck` passes with empty/default exports.

- [x] **Step 2** — Implement `src/core/import/shared/types.ts`:

```typescript
export type TokenResolveResult =
  | { ok: true; variable: string }
  | { ok: false; reason: 'unresolved' | 'ambiguous' };

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
```

- Re-export `TokenResolveResult` and `DependencyTree` from `import/index.ts` in Step 13.
- **Binding `variable` convention (document in file header comment):** slash path without collection prefix, e.g. `color/primary/default` (matches `tests/fixtures/component-spec-button-canonical.json`).
- **Done when:** types compile; no runtime code.

- [x] **Step 3** — Implement `src/core/import/shared/tokenResolver.ts`:

```typescript
import type { TokenResolveResult } from './types';

export interface TokenResolver {
  resolve(token: string): TokenResolveResult;
}

/** Stub for WO-042 — always unresolved */
export function createNotImplementedTokenResolver(): TokenResolver {
  return {
    resolve: function (_token: string): TokenResolveResult {
      return { ok: false, reason: 'unresolved' };
    },
  };
}
```

- Export `TokenResolver` from `import/index.ts` in Step 13.
- **Done when:** `tokenResolver.test.ts` (Step 18) asserts stub returns `{ ok: false, reason: 'unresolved' }`.

- [x] **Step 4** — Implement `src/core/import/shared/dependencyScanner.ts`:

```typescript
import type { DependencyTree } from './types';

export interface ScanDependenciesOptions {
  sourcePath: string;
  sourceText: string;
  registryKeys: readonly string[];
}

/** Stub for WO-043 — empty tree, signature frozen */
export function scanDependencies(options: ScanDependenciesOptions): DependencyTree {
  return {
    rootImportPath: options.sourcePath,
    nodes: [],
  };
}
```

- **Done when:** `dependencyScanner.test.ts` returns `{ nodes: [] }` for arbitrary input.

- [x] **Step 5** — Implement `src/core/import/shared/propTypeMapper.ts`:

```typescript
import type { ComponentSpecProp } from '@detroitlabs/fighub-contracts';

import {
  coerceBooleanDefault,
  coerceTextDefault,
} from '@/core/components/scaffold/propTypeMap';

export interface MapTsPropsToSpecOptions {
  /** Placeholder for WO-041 AST nodes — typed loosely until parser lands */
  props: ReadonlyArray<{ name: string; tsType: string; defaultValue?: string | number | boolean }>;
}

/**
 * Stub for WO-041 — maps TS prop descriptors → ComponentSpecProp[].
 * Uses coerceBooleanDefault / coerceTextDefault from propTypeMap (research D6).
 */
export function mapTsPropsToSpec(options: MapTsPropsToSpecOptions): ComponentSpecProp[] {
  const result: ComponentSpecProp[] = [];
  for (let i = 0; i < options.props.length; i++) {
    const p = options.props[i];
    if (p.tsType === 'boolean') {
      result.push({
        name: p.name,
        type: 'boolean',
        default: coerceBooleanDefault(p.defaultValue),
      });
    } else if (p.tsType === 'string') {
      result.push({
        name: p.name,
        type: 'string',
        default: coerceTextDefault(p.defaultValue),
      });
    }
    // enum / node — WO-041 implements
  }
  return result;
}
```

- **Done when:** `propTypeMapper.test.ts` maps `{ name: 'disabled', tsType: 'boolean' }` → `{ type: 'boolean', default: false }`.

- [x] **Step 6** — Implement `src/core/import/shared/layoutInferrer.ts`:

```typescript
import type { ComponentSpecLayout } from '@detroitlabs/fighub-contracts';

export interface InferLayoutFromSourceOptions {
  sourceText: string;
  /** Optional className / style hints from WO-041 */
  hints?: Record<string, string>;
}

const DEFAULT_LAYOUT: ComponentSpecLayout = {
  direction: 'horizontal',
  gap: '8',
  padding: '16',
  sizing: { horizontal: 'hug', vertical: 'hug' },
};

/** Stub for WO-041 — returns deterministic default layout */
export function inferLayoutFromSource(_options: InferLayoutFromSourceOptions): ComponentSpecLayout {
  return {
    direction: DEFAULT_LAYOUT.direction,
    gap: DEFAULT_LAYOUT.gap,
    padding: DEFAULT_LAYOUT.padding,
    sizing: {
      horizontal: DEFAULT_LAYOUT.sizing.horizontal,
      vertical: DEFAULT_LAYOUT.sizing.vertical,
    },
  };
}
```

- **Done when:** `layoutInferrer.test.ts` returns layout matching `DEFAULT_LAYOUT` shape.

- [x] **Step 7** — Implement `src/core/import/types.ts`:

```typescript
import type { ComponentFramework, ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import type { DependencyTree } from './shared/types';
import type { TokenResolver } from './shared/tokenResolver';

export interface ImportTemplateContext {
  sourcePath: string;
  sourceText: string;
  figmaMappingText?: string;
  tokenResolver: TokenResolver;
  registryKeys: readonly string[];
}

export interface ImportParseIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ImportTemplateResult {
  spec: ComponentSpecV1;
  dependencyTree: DependencyTree;
  issues: ImportParseIssue[];
}

export interface ImportTemplate {
  readonly framework: ComponentFramework;
  parse(ctx: ImportTemplateContext): ImportTemplateResult;
}
```

- **Done when:** file compiles; imported by Step 9 stub.

- [x] **Step 8** — Implement `src/core/codeconnect/types.ts`:

```typescript
import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

export interface UnmappedComponentRef {
  nodeId: string;
  name: string;
  componentKey: string;
  fileKey: string;
  /** Figma component property definitions for stub props block (research D3) */
  componentProperties: Record<string, { type: string; defaultValue?: string | boolean }>;
}

export interface MappingStubFile {
  relativePath: string;
  content: string;
}

export interface MappingTemplateContext {
  component: UnmappedComponentRef;
  repoComponentsRoot: string;
  /** e.g. './button' relative to stub file */
  implementationImportPath: string;
}

export interface MappingTemplate {
  readonly framework: ComponentFramework;
  generateStub(ctx: MappingTemplateContext): MappingStubFile;
}
```

- **Done when:** file compiles; imported by Step 10 stub.

- [x] **Step 9** — Implement `src/core/import/templates/reactStub.ts`:

```typescript
import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { scanDependencies } from '../shared/dependencyScanner';
import { inferLayoutFromSource } from '../shared/layoutInferrer';
import { mapTsPropsToSpec } from '../shared/propTypeMapper';
import type { ImportTemplate, ImportTemplateContext, ImportTemplateResult } from '../types';

function deriveComponentName(sourcePath: string): string {
  const base = sourcePath.replace(/\\/g, '/').split('/').pop() || 'Component';
  const withoutExt = base.replace(/\.(tsx?|jsx?)$/, '');
  return withoutExt.charAt(0).toUpperCase() + withoutExt.slice(1);
}

export class ReactImportTemplateStub implements ImportTemplate {
  readonly framework = 'react' as const;

  parse(ctx: ImportTemplateContext): ImportTemplateResult {
    const name = deriveComponentName(ctx.sourcePath);
    const props = mapTsPropsToSpec({ props: [] });
    const layout = inferLayoutFromSource({ sourceText: ctx.sourceText });
    const dependencyTree = scanDependencies({
      sourcePath: ctx.sourcePath,
      sourceText: ctx.sourceText,
      registryKeys: ctx.registryKeys,
    });

    const spec: ComponentSpecV1 = {
      v: 1,
      kind: 'component-spec',
      name: name,
      framework: 'react',
      variantMatrix: {},
      props: props,
      bindings: [],
      layout: layout,
      confidence: { layout: 'low', bindings: 'low', unresolved: ['WO-039-stub'] },
    };

    return {
      spec: spec,
      dependencyTree: dependencyTree,
      issues: [{ code: 'STUB', message: 'React import stub — replace in WO-041', severity: 'warning' }],
    };
  }
}
```

- **Done when:** `parse()` returns `spec.kind === 'component-spec'` and valid `ComponentSpecV1` shape (SPK-039-3).

- [x] **Step 10** — Implement `src/core/codeconnect/templates/reactStub.ts`:

```typescript
import type { MappingTemplate, MappingTemplateContext, MappingStubFile } from '../types';

export class ReactMappingTemplateStub implements MappingTemplate {
  readonly framework = 'react' as const;

  generateStub(ctx: MappingTemplateContext): MappingStubFile {
    const safeName = ctx.component.name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const relativePath = safeName + '.figma.tsx';
    const content =
      '// Code Connect stub placeholder — WO-040 replaces\n' +
      'export default function stub() { return null; }\n';
    return { relativePath: relativePath, content: content };
  }
}
```

- **Done when:** `generateStub()` returns non-empty `relativePath` + `content`.

- [x] **Step 11** — Implement `src/core/import/registry.ts`:

```typescript
import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

import { ReactImportTemplateStub } from './templates/reactStub';
import type { ImportTemplate } from './types';

const REACT_STUB = new ReactImportTemplateStub();

export function getImportTemplate(framework: ComponentFramework): ImportTemplate | null {
  if (framework === 'react') {
    return REACT_STUB;
  }
  return null;
}

export function listSupportedImportFrameworks(): ComponentFramework[] {
  return ['react'];
}
```

- **Done when:** `getImportTemplate('react')` non-null; `getImportTemplate('vue')` null (SPK-039-2).

- [x] **Step 12** — Implement `src/core/codeconnect/registry.ts`:

```typescript
import type { ComponentFramework } from '@detroitlabs/fighub-contracts';

import { ReactMappingTemplateStub } from './templates/reactStub';
import type { MappingTemplate } from './types';

const REACT_STUB = new ReactMappingTemplateStub();

export function getMappingTemplate(framework: ComponentFramework): MappingTemplate | null {
  if (framework === 'react') {
    return REACT_STUB;
  }
  return null;
}

export function listSupportedMappingFrameworks(): ComponentFramework[] {
  return ['react'];
}
```

- Mirror import registry pattern exactly.
- **Done when:** same react/non-react behavior as Step 11.

- [x] **Step 13** — Barrel `src/core/import/index.ts`:

```typescript
export { getImportTemplate, listSupportedImportFrameworks } from './registry';
export type {
  ImportTemplate,
  ImportTemplateContext,
  ImportTemplateResult,
  ImportParseIssue,
} from './types';
export type { TokenResolveResult, DependencyTree, DependencyNode, DependencyNodeStatus } from './shared/types';
export type { TokenResolver } from './shared/tokenResolver';
export { createNotImplementedTokenResolver } from './shared/tokenResolver';
export { scanDependencies } from './shared/dependencyScanner';
export type { ScanDependenciesOptions } from './shared/dependencyScanner';
export { mapTsPropsToSpec } from './shared/propTypeMapper';
export type { MapTsPropsToSpecOptions } from './shared/propTypeMapper';
export { inferLayoutFromSource } from './shared/layoutInferrer';
export type { InferLayoutFromSourceOptions } from './shared/layoutInferrer';
```

- Do **not** export stub class — registry is the public entry.
- **Done when:** `import { getImportTemplate } from '@/core/import'` resolves in a smoke test file or registry test.

- [x] **Step 14** — Barrel `src/core/codeconnect/index.ts`:

```typescript
export { getMappingTemplate, listSupportedMappingFrameworks } from './registry';
export type {
  MappingTemplate,
  MappingTemplateContext,
  MappingStubFile,
  UnmappedComponentRef,
} from './types';
```

- **Done when:** `import { getMappingTemplate } from '@/core/codeconnect'` resolves.

- [x] **Step 15** — Verify no circular imports:

- `@/core/import` must **not** import from `@/core/codeconnect` or `@/core/handoff`.
- `@/core/codeconnect` must **not** import from `@/core/import`.
- Both may import `@detroitlabs/fighub-contracts` and `@/core/components/scaffold/propTypeMap` (import side only).
- **Done when:** `npm run typecheck` green; manual grep confirms no cross-import between codeconnect ↔ import.

- [x] **Step 16** — Vitest `tests/unit/core/codeconnect/registry.test.ts`:

| Case | Assert |
| ---- | ------ |
| `getMappingTemplate('react')` | non-null, `framework === 'react'` |
| `getMappingTemplate('vue')` | `null` |
| `listSupportedMappingFrameworks()` | `['react']` |
| `generateStub()` minimal ctx | returns `MappingStubFile` with `.figma.tsx` suffix |

- **Done when:** file green.

- [x] **Step 17** — Vitest `tests/unit/core/import/registry.test.ts`:

| Case | Assert |
| ---- | ------ |
| `getImportTemplate('react')` | non-null |
| `getImportTemplate('vue')` | `null` |
| `parse()` on stub | `result.spec.kind === 'component-spec'`, `result.spec.v === 1` |
| issues | contains `STUB` warning |

- **Done when:** file green (SPK-039-2, SPK-039-3).

- [x] **Step 18** — Vitest `tests/unit/core/import/shared/tokenResolver.test.ts` + `dependencyScanner.test.ts`:

- Token resolver stub always `{ ok: false, reason: 'unresolved' }`.
- Scanner returns `{ rootImportPath: options.sourcePath, nodes: [] }`.
- **Done when:** both files green.

- [x] **Step 19** — Vitest `tests/unit/core/import/shared/propTypeMapper.test.ts`:

- Boolean prop → `type: 'boolean'`, default via `coerceBooleanDefault`.
- String prop → `type: 'string'`, default via `coerceTextDefault`.
- Unknown tsType → skipped (empty contribution).
- **Done when:** file green.

- [x] **Step 20** — Vitest `tests/unit/core/import/shared/layoutInferrer.test.ts`:

- Default layout: `direction: 'horizontal'`, `gap: '8'`, `sizing.horizontal: 'hug'`.
- **Done when:** file green.

- [x] **Step 21** — CI gate:

```bash
npm run lint && npm run typecheck && npm run test -- tests/unit/core/codeconnect tests/unit/core/import
npm run build
```

- **Done when:** all green (SPK-039-1: dist/code.js builds with new modules).

- [x] **Step 22** — Debug logging stub (telemetry AC):

- In registry `getImportTemplate` / `getMappingTemplate`, add `console.debug('[import] getImportTemplate', framework)` and `console.debug('[codeconnect] getMappingTemplate', framework)` when template resolved or null.
- Use `console.debug` only — no `pluginLog` in WO-039 (no main-thread handlers; WO-044 adds orchestration).
- **Done when:** grep confirms debug lines; no production telemetry.

- [x] **Step 23** — Downstream compile smoke (integration guard):

- Add `tests/unit/core/import/downstreamImportSmoke.test.ts` that imports both barrels and asserts:
  - `typeof getImportTemplate === 'function'`
  - `typeof getMappingTemplate === 'function'`
  - React stub round-trip: import parse → spec has `framework: 'react'`
- Documents WO-040/041/042/043 can `import type` without editing WO-039.
- **Done when:** smoke test green.

---

## Build Agents

### Phase 1 (parallel) — shared foundation

- `code-build` — Steps 1–6: module scaffold, `shared/types.ts`, token resolver, dependency scanner, prop type mapper, layout inferrer stubs

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 7–8: `import/types.ts`, `codeconnect/types.ts` interface surfaces

### Phase 3 (parallel, after Phase 2)

- `code-build` — Steps 9–10: React stub template classes (import + codeconnect)

### Phase 4 (parallel, after Phase 3)

- `code-build` — Steps 11–15: registries, barrel exports, circular-import verification

### Phase 5 (parallel, after Phase 4)

- `code-build` — Steps 16–20: Vitest registry + shared utility contract tests

### Phase 6 (after Phase 5)

- `code-build` — Steps 21–23: CI gate, debug logging, downstream smoke test

**Hard dependency:** WO-003 merged — `@detroitlabs/fighub-contracts` exports `ComponentSpecV1`, `ComponentFramework`, `RegistryV1`.

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-003 | `ComponentSpecV1`, `ComponentFramework`, `RegistryV1` in `@detroitlabs/fighub-contracts` |
| `src/core/components/scaffold/propTypeMap.ts` | `coerceBooleanDefault`, `coerceTextDefault` reuse in `propTypeMapper.ts` |
| `tests/fixtures/component-spec-button-canonical.json` | Golden reference for binding variable path convention |
| `src/io/sinks/types.ts` | `GithubPRSinkContext.contractKind` free string — WO-040 uses `'code-connect-stubs'` (no enum in WO-039) |
| `src/config/flags.ts` | `componentImport`, `codeConnectPR` — UI gating in WO-044, not WO-039 |
| Vitest | Unit tests under `tests/unit/core/codeconnect`, `tests/unit/core/import` |
| `npm run build` | SPK-039-1 — plugin bundle includes new modules |

**Downstream consumers (must compile against WO-039 output):**

| Ticket | Imports from |
| ------ | ------------ |
| WO-040 | `@/core/codeconnect` — replaces `ReactMappingTemplateStub` |
| WO-041 | `@/core/import` — replaces `ReactImportTemplateStub`, implements shared stubs |
| WO-042 | `@/core/import` — `TokenResolver` impl |
| WO-043 | `@/core/import` — `scanDependencies` impl |
| WO-044 | Both registries for UI dispatch |
| WO-056 | `@/core/import` registry for catalog batch |

---

## Open Questions

- **RESOLVED (Q1):** `contractKind` for Code Connect PR stubs is a free string on `GithubPRSinkContext` — WO-040 sets `'code-connect-stubs'`; no enum entry required in WO-039.
- **RESOLVED:** React-only registry in Phase 4a — other frameworks return `null` until dedicated tickets.
- **RESOLVED:** `ImportTemplateResult.issues[]` surfaces parse warnings without throwing (research D2).
- **RESOLVED:** `componentProperties` on `UnmappedComponentRef` required at detect time for WO-040 (research D3).
- **DEFERRED to WO-044 plan:** Add `componentsPath` to `ResolvedFigHubConfig` vs sibling of `specsPath` for CC stub output — today only `specsPath` exists in `fighub.json` v1.

---

## Notes

- **ES2017:** All code under `src/core/` must avoid optional chaining (`?.`), nullish coalescing (`??`), and other post-ES2017 syntax — Figma plugin sandbox constraint. Use explicit `if` checks and ternary where needed.
- **Main-thread / `pluginLog`:** WO-039 adds **no** `main.ts` handlers and **no** Figma API calls. Shared utilities are pure TypeScript suitable for unit tests off-thread. Use `console.debug` in registries (Step 22) per ticket telemetry AC; switch to `pluginLog` when WO-044 wires main-thread orchestration.
- **No UI work** — flags `componentImport` / `codeConnectPR` enforced in WO-044 Components tab.
- **Scaffold unchanged:** Import/catalog terminate at existing `scaffold/run` message (`src/io/messages/scaffold.ts`); WO-039 does not add messages.
- **Spec path conventions** (for WO-041/056 reference only): `design/components/{key}.component-spec.v1.json` and legacy `design/component-specs/{key}.v1.json` per `src/ui/components/scaffold/resolveComponentSpec.ts`.
- **WO-041 post-parse:** calls `inferArchetype()` from `src/core/components/scaffold/specAdapter.ts` after real parse — not invoked by WO-039 stub.
- **Anti-pattern:** Do not duplicate `mapSpecPropToFigma` logic in import shared utils — only share coerce helpers; inverse mapping is WO-041 scope.
- **Build order:** WO-039 before WO-040, WO-041, WO-042, WO-043, WO-044, WO-056.
- Bibliography: `ticket.md`, `research/mapping-template-and-import-template-interfaces.md`, `Docs/PRD.md` §6.3, §6.7, §12 Phase 4a.
