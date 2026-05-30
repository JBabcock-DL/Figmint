# MappingTemplate + ImportTemplate shared interfaces (WO-039)

> **Status:** ✅ Research expanded for `/plan` (2026-05-29)
> **PRD:** §6.3 FR-IMP-*, §6.7 FR-CC-5, §12 Phase 4a
> **Dependencies:** WO-003 (`ComponentSpecV1`, `ComponentFramework`, `RegistryV1`)

---

## Summary

Sprint 8 Phase 4a is **greenfield** for import and Code Connect: `src/core/codeconnect/` and `src/core/import/` do not exist. WO-039 is the **interface gate** — every downstream ticket (WO-040..044, WO-056) compiles against types and registries defined here.

**Locked recommendation:** Ship a **complete type surface + React stub implementations + Vitest contract tests** in one PR. Shared utilities live under `src/core/import/shared/`; Code Connect types under `src/core/codeconnect/`. Do **not** duplicate Figma prop mapping — **reuse** `mapSpecPropToFigma` from `src/core/components/scaffold/propTypeMap.ts` inside `propTypeMapper.ts` (import-side maps **TS props → spec**; scaffold maps **spec → Figma** — opposite direction, same type vocabulary).

---

## Requirement traceability

| Ticket requirement | Research finding | Plan artifact |
| ------------------ | ---------------- | ------------- |
| R1 `MappingTemplate` interface | § Interface signatures + `UnmappedComponentRef` | `src/core/codeconnect/types.ts` |
| R2 `ImportTemplate` interface | § `ImportTemplateContext` includes resolver + registry keys | `src/core/import/types.ts` |
| R3 Shared utilities skeletons | § Module tree; stub returns documented in tests | `src/core/import/shared/*.ts` |
| R4 Registry dispatch | § `getMappingTemplate` / `getImportTemplate` | `registry.ts` ×2 |
| AC compile + React stub referenced | § React no-op classes in `templates/reactStub.ts` | Vitest `registry.test.ts` |
| AC unit tests for shared utils | § Contract tests per module | `tests/unit/core/import/shared/` |

---

## Key findings

### 1. `ComponentSpecV1` is import output — no schema change

```99:110:packages/contracts/src/componentSpec.v1.ts
export interface ComponentSpecV1 extends ComponentSpecArchetypeConfig {
  v: 1;
  kind: 'component-spec';
  name: string;
  framework: ComponentFramework;
  variantMatrix: Record<string, (string | boolean)[]>;
  props: ComponentSpecProp[];
  bindings: ComponentSpecBinding[];
  layout: ComponentSpecLayout;
  subComponents?: ComponentSpecSubComponent[];
  confidence?: ComponentSpecConfidence;
}
```

`confidence` supports FR-IMP-7 (preview before scaffold). WO-041 sets `{ layout, bindings, unresolved? }`.

### 2. Existing Figma prop mapping (mirror, don't fork)

```31:59:src/core/components/scaffold/propTypeMap.ts
export function mapSpecPropToFigma(
  prop: ComponentSpecProp,
  resolvedInstanceId?: string,
): MappedFigmaProp | null {
  // boolean → BOOLEAN, string → TEXT, node → INSTANCE_SWAP
}
```

**New** `propTypeMapper.ts` maps **TypeScript AST prop types → `ComponentSpecProp[]`** (inverse). Share `coerceBooleanDefault` / enum detection helpers where applicable.

### 3. Spec path conventions (catalog + import)

```5:12:src/ui/components/scaffold/resolveComponentSpec.ts
export const SPEC_RESOLUTION_PATHS = [
  (key) => 'design/components/' + key + '.component-spec.v1.json',
  (key) => 'design/component-specs/' + key + '.v1.json',
];
```

`ResolvedFigHubConfig.specsPath` default: `components/` (`src/io/formats/fighubJson.ts`). WO-056 discovery must scan **both** configured path and legacy paths.

### 4. GitHub PR sink accepts arbitrary multi-file payloads

`GithubPRSinkContext` (`src/io/sinks/types.ts`):

```typescript
interface GithubPRSinkContext {
  files: { path: string; content: string }[];
  contractKind: string;  // WO-040 uses 'code-connect-stubs'
  repoUrl: string;
  options: GithubPRSinkOptions;
  figmaFileKey: string;
  figmaFileName: string;
}
```

Flow: `executeGithubPRSink` → `createPullRequestFromSinkContext` (`src/io/github/createPullRequestFlow.ts`) — Git Data API blobs/trees/commits (WO-018).

### 5. Org capability flags (Phase 4a gated)

```1:8:src/config/flags.ts
export const flags = {
  githubOAuth: true,
  githubPRSink: true,
  componentImport: true,
  codeConnectPR: true,
  ...
} as const;
```

UI must hide import/CC affordances when `flags.componentImport` / `flags.codeConnectPR` false (PRD §13 — Community build future).

### 6. Scaffold entry point unchanged

Import/catalog/scaffold all terminate at existing message:

```22:29:src/io/messages/scaffold.ts
export interface ScaffoldRunMessage {
  type: 'scaffold/run';
  spec: ComponentSpecV1;
  options?: { registry?: RegistryV1; skipUsageFrame?: boolean; skipRegistry?: boolean };
}
```

WO-039 does **not** add scaffold messages — WO-044/056 call existing `scaffold/run` after preview.

---

## Validated evidence

### Repo inventory — exists today

| Path | Role |
| ---- | ---- |
| `packages/contracts/src/componentSpec.v1.ts` | Import output |
| `packages/contracts/src/registry.v1.ts` | Registry keys for dependency scanner |
| `packages/contracts/src/fighubJson.v1.ts` | `ResolvedFigHubConfig` paths |
| `src/core/components/scaffold/propTypeMap.ts` | Figma prop type mapping (reuse helpers) |
| `src/core/components/scaffold/specAdapter.ts` | `inferArchetype()` — WO-041 calls after parse |
| `src/core/components/scaffold/runScaffold.ts` | Main-thread scaffold handler |
| `src/io/sinks/githubPR.ts` | CC PR emission |
| `src/io/sources/github.ts` | `loadFromGitHub` + `isSafeRepoPath` |
| `src/ui/components/scaffold/resolveComponentSpec.ts` | Spec path resolution |
| `tests/fixtures/component-spec-button-canonical.json` | WO-041 golden output |

### Repo inventory — create in WO-039

```
src/core/codeconnect/
  index.ts
  types.ts
  registry.ts
  templates/
    reactStub.ts          # no-op MappingTemplate (WO-040 replaces)

src/core/import/
  index.ts
  types.ts
  registry.ts
  templates/
    reactStub.ts          # no-op ImportTemplate (WO-041 replaces)
  shared/
    types.ts              # DependencyTree, TokenResolveResult
    tokenResolver.ts      # interface + notImplemented stub
    dependencyScanner.ts  # types + scanDependencies stub → empty tree
    propTypeMapper.ts     # stub export; WO-041 implements
    layoutInferrer.ts     # stub export; WO-041 implements

tests/unit/core/codeconnect/
  registry.test.ts
tests/unit/core/import/
  registry.test.ts
  shared/
    dependencyScanner.test.ts
    propTypeMapper.test.ts
```

### Cross-ticket interface ownership

| Type / function | Owner | Consumers |
| --------------- | ----- | --------- |
| `MappingTemplate` | WO-039 define; WO-040 implement | WO-044 UI |
| `ImportTemplate` | WO-039 define; WO-041 implement | WO-044 UI |
| `TokenResolver` | WO-039 interface; WO-042 impl | WO-041 parse |
| `scanDependencies` | WO-039 stub; WO-043 impl | WO-041, WO-044 |
| `propTypeMapper` | WO-039 stub; WO-041 impl | WO-041 only |
| `layoutInferrer` | WO-039 stub; WO-041 impl | WO-041 only |

---

## Interface signatures (locked for `/plan`)

```typescript
// --- src/core/import/shared/types.ts ---
export type TokenResolveResult =
  | { ok: true; variable: string }
  | { ok: false; reason: 'unresolved' | 'ambiguous' };

export interface TokenResolver {
  resolve(token: string): TokenResolveResult;
}

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

// --- src/core/import/types.ts ---
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

// --- src/core/codeconnect/types.ts ---
export interface UnmappedComponentRef {
  nodeId: string;
  name: string;
  componentKey: string;
  fileKey: string;
  /** Figma component property definitions for stub props block */
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

// --- registries ---
export function getMappingTemplate(framework: ComponentFramework): MappingTemplate | null;
export function getImportTemplate(framework: ComponentFramework): ImportTemplate | null;
export function listSupportedImportFrameworks(): ComponentFramework[];
export function listSupportedMappingFrameworks(): ComponentFramework[];
```

**Binding `variable` field convention:** slash path without collection prefix, matching existing fixtures (`color/primary/default` in `component-spec-button-canonical.json`).

---

## Decision log

| ID | Decision | Rationale | Rejected |
| -- | -------- | --------- | -------- |
| D1 | `codeconnect/` vs `import/` split | PRD §6.7 vs §6.3 separation | Monolithic `templates/` |
| D2 | `ImportTemplateResult.issues[]` | Surfaces parse warnings without throwing | Throw on low confidence |
| D3 | `componentProperties` on `UnmappedComponentRef` | WO-040 needs Figma enum/boolean metadata at detect time | Re-read Figma in generator |
| D4 | React stubs in WO-039 AC | Proves registry wiring before WO-040 depth | Empty registry only |
| D5 | `scanDependencies` stub returns `{ nodes: [] }` | WO-043 replaces body; signature frozen | Full impl in WO-039 |
| D6 | Reuse `propTypeMap` coerce helpers | DRY for boolean/string defaults | Copy-paste |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-039-1 | `npm run build` after adding empty modules | dist/code.js builds | ☐ build phase |
| SPK-039-2 | Vitest: `getImportTemplate('react')` non-null, `vue` null | Green | ☐ build phase |
| SPK-039-3 | Vitest: stub `parse()` returns valid `ComponentSpecV1` shape | `kind === 'component-spec'` | ☐ build phase |

---

## Risk register

| Risk | Sev | Likelihood | Mitigation |
| ---- | --- | ---------- | ---------- |
| WO-040/041 need interface tweaks | Med | Med | Version interfaces in single PR; downstream tickets same sprint |
| `componentProperties` Figma API variance | Med | Low | Optional field; generator falls back to empty props |
| Duplicate prop mapping logic | Low | Med | Explicit import from `propTypeMap.ts` for coerce only |

---

## Recommendations for `/plan`

1. **Step order:** types → shared stubs → registries → React stub classes → barrel exports → Vitest.
2. **Done when:** All WO-040..043 tickets can `import type` from `@/core/import` and `@/core/codeconnect` without circular deps.
3. **No UI work** in WO-039.
4. **No `main.ts` handlers** in WO-039 — messages land in WO-044/056.
5. Plan AC traceability table mapping each checklist item to step numbers.

---

## Open questions

| # | Question | Status |
| - | -------- | ------ |
| Q1 | `contractKind` enum entry for CC stubs? | **RESOLVED:** free string on sink context |
| Q2 | Add `componentsPath` to `ResolvedFigHubConfig`? | **OPEN for WO-044 plan** — today only `specsPath`; CC stubs may use `specsPath` sibling or new field in `fighub.json` v2 |

---

## References

- PRD §6.3, §6.7 FR-CC-5, §12 Phase 4a
- WO-018 [github-pr-sink-flow.md](../../Sprint%204/WO-018-github-pr-output-sink/research/github-pr-sink-flow.md)
- [Sprint 8 index](../../research/sprint-8-research-index.md)
