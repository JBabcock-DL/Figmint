# React ImportTemplate — TypeScript AST parser (WO-041)

> **Status:** ✅ Research expanded for `/plan` (2026-05-29)
> **PRD:** §6.3 FR-IMP-4..7, FR-IMP-6, FR-IMP-9
> **Dependencies:** WO-039, WO-042, WO-043, WO-022 scaffold

---

## Summary

WO-041 implements **`ImportTemplate.parse()`** for React: read `.tsx` source + optional `.figma.tsx`, run **TypeScript compiler API** (bundled `typescript@^6`), emit **`ComponentSpecV1`** matching **`tests/fixtures/component-spec-button-canonical.json`**. Pipeline integrates **WO-043** dependency scan and **WO-042** token resolver before binding extraction.

**Locked recommendation:** Multi-pass parser module layout under `src/core/import/templates/react/`; call **`inferArchetype()`** from `specAdapter.ts` when `archetype` omitted; set **`confidence.bindings = 'low'`** when any class token unresolved; **`confidence.layout = 'low'`** when flex direction inferred from ambiguous class list.

---

## Requirement traceability

| Requirement | Implementation module |
| ----------- | --------------------- |
| FR-IMP-4 variant matrix from enums | `parseProps.ts` — detect `variant` + `size` axes |
| FR-IMP-5 className → bindings | `extractBindings.ts` + `TokenResolver` |
| FR-IMP-6 read `.figma.tsx` | `mergeFigmaMapping.ts` |
| FR-IMP-7 never silent-apply | UI preview only (WO-044); parser sets confidence |
| FR-IMP-8 subcomponents | `buildSubComponents.ts` from dependency tree registered nodes |
| AC shadcn Button | Golden test vs canonical fixture |
| AC `bg-muted/40` unresolved | Resolver returns unresolved → confidence low |
| AC round-trip scaffold | Integration: parse → `scaffold/run` (WO-044 E2E) |

---

## Key findings

### 1. Parse pipeline (ordered passes)

```
sourceText
  → parseSourceFile (typescript)
  → findExportedComponent()     // function decl | forwardRef | memo wrapper
  → parsePropsInterface()       // Props type → ComponentSpecProp[]
  → buildVariantMatrix()        // enum props → variantMatrix keys
  → mergeFigmaMapping()         // optional .figma.tsx enriches prop names
  → scanDependencies()          // WO-043
  → extractBindings()           // className tokens → bindings via TokenResolver
  → inferLayoutFromJsx()        // root JSX: flex, gap, padding classes
  → inferArchetype(spec)        // specAdapter.ts
  → attachConfidence()
  → ImportTemplateResult
```

### 2. Golden output shape (AC)

From `tests/fixtures/component-spec-button-canonical.json`:

- **variantMatrix:** `variant` (6 strings) × `size` (4 strings) = 24 cells
- **props:** include `asChild`, `disabled`, `className`, `type`, `loading`
- **bindings:** 8 selectors (`root.fill`, `root.radius`, …) using slash variable paths
- **layout:** horizontal, gap/padding numeric strings, hug sizing
- **archetype:** `chip`

Parser must **not** emit legacy `state` axis (WO-057 decision).

### 3. TypeScript API usage (sandbox-safe)

```typescript
import ts from 'typescript';

const sourceFile = ts.createSourceFile(
  ctx.sourcePath,
  ctx.sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function visit(node: ts.Node): void {
  if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
    // detect export default / named export component
  }
  ts.forEachChild(node, visit);
}
```

**Bundle note:** `typescript` is already a dependency; Vite bundles for plugin main thread. Avoid `ts.createProgram` (needs filesystem) — use single-file AST only.

### 4. shadcn / cva patterns to detect

| Pattern | Parser action |
| ------- | ------------- |
| `const buttonVariants = cva(...)` | Read variant keys from first arg object |
| `VariantProps<typeof buttonVariants>` | Link props interface to cva |
| `{ variant, size, className, ...props }` destructuring | Mark prop names |
| `cn(buttonVariants({ variant, size }), className)` | Extract variant prop names from call |
| `@radix-ui/react-slot` + `asChild` | Keep `asChild` boolean prop |

### 5. className → bindings

Split `className` string literals and `cn()` args:

```typescript
for (const token of ['bg-primary', 'rounded-md', 'px-4']) {
  const resolved = ctx.tokenResolver.resolve(token);
  if (!resolved.ok) {
    issues.push({ code: 'unresolved-token', message: token, severity: 'warning' });
    continue;
  }
  bindings.push(mapTokenToSelector(token, resolved.variable)); // heuristics table
}
```

**Heuristics (MVP):**

| Token pattern | Binding selector |
| ------------- | ---------------- |
| `bg-*` | `root.fill` |
| `text-*` | `text/label.fill` |
| `rounded-*` | `root.radius` |
| `p-*`, `px-*`, `py-*` | `root.padding` |
| `gap-*` | `root.gap` |

Ambiguous → skip binding, add to `confidence.unresolved`.

### 6. Merge Code Connect mapping (FR-IMP-6)

Parse sibling `{name}.figma.tsx` if `ctx.figmaMappingText` provided:

- Extract `figma.enum('FigmaProp', { Code: 'code' })` pairs
- Map Figma property names → spec prop names
- Prefer mapping over inferred enum labels when conflict

### 7. Post-parse scaffold

WO-044 posts previewed spec to existing handler:

```216:234:src/ui/tabs/Components.tsx
parent.postMessage({
  pluginMessage: { type: 'scaffold/run', spec: draft },
}, '*');
```

WO-041 does not call scaffold directly.

---

## Validated evidence

| Path | Role |
| ---- | ---- |
| `src/core/components/scaffold/specAdapter.ts:52-78` | `inferArchetype` |
| `src/core/components/scaffold/propTypeMap.ts` | Type coercion patterns |
| `tests/fixtures/component-spec-button-canonical.json` | Golden expected output |
| `package.json` | `"typescript": "^6.0.3"` |

### Test fixtures to add in `/plan`

```
tests/fixtures/sources/
  button.tsx              # minimal shadcn-like source for golden test
  button.figma.tsx        # optional merge test
tests/unit/core/import/templates/
  react.parseButton.test.ts
```

---

## Decision log

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D1 | Single-file AST only | Figma sandbox |
| D2 | `issues[]` + `confidence` both | FR-IMP-7 dual signaling |
| D3 | Don't parse `node_modules` imports for types | Resolve one level: `./types` |
| D4 | Default `framework: 'react'` on spec | Contract required field |
| D5 | `name` from PascalCase export | Match registry key convention |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass | Status |
| -------- | --------- | ---- | ------ |
| SPK-041-1 | Parse `button.tsx` fixture → deepEqual canonical (key fields) | Vitest | ☐ |
| SPK-041-2 | Resolver mock always unresolved → `confidence.bindings === 'low'` | Vitest | ☐ |
| SPK-041-3 | Parse with `.figma.tsx` → extra prop mapping merged | Vitest | ☐ |
| SPK-041-4 | E2E scaffold round-trip | Manual WO-044 | ☐ deferred |

---

## Risk register

| Risk | Mitigation |
| ---- | ---------- |
| Generic types obscure props | Fallback: parse destructuring in function params |
| Tailwind arbitrary values `bg-[#fff]` | Skip / unresolved |
| Bundle size +200KB from typescript | Accept; already in dist for other uses |

---

## Recommendations for `/plan`

1. Create **`tests/fixtures/sources/button.tsx`** first (minimal compilable shadcn shape).
2. Implement passes incrementally with one Vitest per pass.
3. **`propTypeMapper.ts`** (WO-039 stub) — real impl here or co-located in `parseProps.ts` and re-export.
4. Wire **`buildSubComponents.ts`** only when dependency node `status === 'registered'`.
5. Plan step: run golden test before WO-044 UI integration.

---

## Open questions

| Q | Status |
| - | ------ |
| Parse `.jsx` without types | **DEFERRED** Phase 4a React TSX only |
| Auto-offer CC PR after import (FR-IMP-9) | **WO-044 UI** checkbox after successful preview |

---

## References

- TypeScript Compiler API: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
- WO-039, WO-042, WO-043 research docs
