# Dependency scanner + sub-component handling (WO-043)

> **Status:** ✅ Research expanded for `/plan` (2026-05-29)
> **PRD:** §6.3 FR-IMP-3, FR-IMP-8
> **Dependencies:** WO-039, WO-026 registry, WO-041 parser

---

## Summary

WO-043 replaces the WO-039 **`scanDependencies` stub** with a **TypeScript AST import/JSX scan** that builds a **`DependencyTree`** before full parse. Registered subcomponents (keys in **`RegistryV1`**) become **`ComponentSpecV1.subComponents`** entries with **`registryRef`** for FR-IMP-8; unknown deps block import until designer picks **import first / placeholder / cancel** in WO-044 UI.

**Locked recommendation:** **`scanDependencies(sourceText, options)`** pure function; options include `registryKeys: string[]` + optional `repoAliasMap` from tsconfig paths; circular imports detected via DFS on resolved import graph (same-file only for MVP).

---

## Requirement traceability

| AC | Test scenario |
| -- | ------------- |
| Button + Icon + Box registered | Tree: 2 children, both `registered` |
| Unknown subcomponent | Node `unknown`; UI shows 3 actions |
| Circular A→B→A | Node `circular` on revisited symbol |

---

## Key findings

### 1. Registry key sources

| Source | API |
| ------ | --- |
| Canvas snapshot | `loadRegistryForComponentsTab()` → keys |
| Repo `.fighub-registry.json` | `loadFromGitHub` + parse `RegistryV1` |
| Post-scaffold | `scaffold/result` updates keys in UI state |

Scanner receives **merged unique keys** from main thread when handling `import/parse`.

```typescript
export interface ScanDependenciesOptions {
  registryKeys: readonly string[];
  /** Map PascalCase component name → registry key if different */
  nameToKey?: Record<string, string>;
}

export function scanDependencies(
  sourceText: string,
  sourcePath: string,
  options: ScanDependenciesOptions,
): DependencyTree;
```

### 2. AST algorithm (lightweight)

**Pass A — imports:**

```typescript
// Collect: localName → moduleSpecifier
// import { Icon } from '@/components/icon'
// import Box from '../box'
```

**Pass B — JSX tags:**

```typescript
// <Icon /> → lookup localName in import map
// <Box>...</Box>
```

**Pass C — registry check:**

```typescript
function statusForComponent(name: string): DependencyNodeStatus {
  const key = options.nameToKey?.[name] ?? kebabCase(name);
  if (options.registryKeys.includes(key)) return 'registered';
  return 'unknown';
}
```

**Pass D — circular detection:**

Build adjacency from relative imports within same package (optional MVP: skip cross-file, only detect self-import).

### 3. Mapping to `ComponentSpecV1.subComponents`

```typescript
// packages/contracts/src/componentSpec.v1.ts
export interface ComponentSpecSubComponent {
  name: string;
  registryRef: string;
}
```

WO-041 **`buildSubComponents.ts`** converts registered nodes:

```typescript
subComponents: tree.nodes
  .filter(n => n.status === 'registered')
  .map(n => ({ name: n.name, registryRef: resolveKey(n.name) }))
```

Scaffold **`propTypeMap`** uses `node` props with **`INSTANCE_SWAP`** when subcomponent refs resolve (existing scaffold path).

### 4. UI actions (WO-044)

When tree contains `unknown`:

| Action | Behavior |
| ------ | -------- |
| **Import first** | Navigate to import flow for that dependency (queue) |
| **Placeholder** | Continue parse; omit subcomponent binding (document in preview) |
| **Cancel** | Abort import |

No auto-import (ticket out of scope).

### 5. Reuse TypeScript dependency

Same **`typescript` createSourceFile** as WO-041 — extract shared **`src/core/import/shared/tsAst.ts`** helpers (createSource, visitImports, visitJsx) in WO-039 or WO-043 to avoid duplication. **Plan decision:** add `tsAst.ts` in WO-043, import from WO-041.

---

## Validated evidence

| Path | Role |
| ---- | ---- |
| `packages/contracts/src/registry.v1.ts` | `RegistryComponentEntry.key` |
| `packages/contracts/src/componentSpec.v1.ts` | `subComponents` |
| `src/ui/tabs/Components.tsx:145-161` | Snapshot registry load |
| `src/core/components/scaffold/propTypeMap.ts:49-56` | `node` → INSTANCE_SWAP |

---

## Module tree

```
src/core/import/shared/
  dependencyScanner.ts      # scanDependencies export
  tsAst.ts                  # shared AST helpers (new)
  buildSubComponents.ts     # tree → subComponents[] (used by WO-041)

tests/unit/core/import/shared/
  dependencyScanner.test.ts
  fixtures/
    button-with-icon.tsx
    circular-a.tsx / circular-b.tsx
```

---

## Decision log

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D1 | AST not regex | Accurate JSX tag names |
| D2 | kebab-case registry key default | Matches `button` key convention |
| D3 | Don't scan node_modules | Out of scope |
| D4 | Single-level relative imports for circular | MVP simplicity |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass | Status |
| -------- | --------- | ---- | ------ |
| SPK-043-1 | Fixture Button imports Icon+Box mock registry | statuses correct | ☐ |
| SPK-043-2 | Circular fixture | `circular` status | ☐ |

---

## Risk register

| Risk | Mitigation |
| ---- | ---------- |
| `@/` alias not resolved | Optional tsconfig paths fetch (WO-044 later) |
| Dynamic `<Component />` | Skip — not in MVP shadcn patterns |

---

## Recommendations for `/plan`

1. Add **`tsAst.ts`** shared module — coordinate with WO-041 plan (single owner WO-043).
2. Unit tests use **inline TSX strings**, not file I/O.
3. Export **`DependencyTreeRenderer` props type** for WO-044 UI component.

---

## Open questions

None blocking.

---

## References

- WO-039 DependencyTree types
- WO-027 registry UX research
