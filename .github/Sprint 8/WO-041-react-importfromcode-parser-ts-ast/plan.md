# Plan — WO-041: React ImportTemplate — TypeScript AST parser

## Approach

Replace the WO-039 React **`ImportTemplate` stub** with a production **`ReactImportTemplate`** that parses a single `.tsx` source file via the bundled **`typescript`** compiler API (single-file AST — no `createProgram`, no filesystem), optionally enriches from a sibling **`.figma.tsx`** Code Connect mapping file, and emits a validated **`ComponentSpecV1`** ready for scaffold (WO-022) and preview (WO-044).

The parser runs an **ordered multi-pass pipeline** under `src/core/import/templates/react/`: discover exported component → extract props + variant matrix from `cva` / `VariantProps` patterns → merge Figma enum mappings → scan JSX dependencies via **WO-043 `scanDependencies`** → resolve Tailwind class tokens via **WO-042 `TokenResolver`** in **`extractBindings`** → infer layout from root JSX class lists in **`parseJsxLayout`** → map TS prop types in **`propTypeMapper`** → build registered subcomponents → call **`inferArchetype()`** from existing scaffold code → attach **`confidence`** flags per FR-IMP-7.

**Golden acceptance:** parse `tests/fixtures/sources/button.tsx` with a mocked resolver configured for canonical token paths → deep-equal key fields against **`tests/fixtures/component-spec-button-canonical.json`**. Unresolvable tokens (e.g. `bg-muted/40` when resolver returns `{ ok: false }`) must produce **`confidence.bindings: 'low'`** and an **`issues[]`** entry — never silent-apply.

**In scope:** React `.tsx` only; `src/core/import/templates/react.ts` + module tree; Vitest unit + integration tests; round-trip integration test parse → `runScaffold` (WO-022) with mocked Figma.

**Out of scope (ticket verbatim):** other frameworks; `.jsx` without types; auto-resolution of low-confidence flags (designer accepts in WO-044 preview); `main.ts` import handlers (WO-044); FR-IMP-9 CC PR checkbox; parsing `node_modules` for types.

---

## Acceptance criteria traceability

| Ticket AC / requirement | Plan steps |
| ----------------------- | ---------- |
| R1 `src/core/import/templates/react.ts` — `ImportTemplate` using TS compiler API | Steps 1–3, 14 |
| R2 Parse shadcn Button → `ComponentSpecV1` with variant × size matrix | Steps 4–6, 10, 16 |
| R3 `mergeFigmaMapping.ts` — enrich from `.figma.tsx` (FR-IMP-6) | Step 7 |
| R4 `parseJsxLayout.ts` + `propTypeMapper.ts` — layout/bindings + confidence (FR-IMP-7) | Steps 8–9, 11 |
| R5 Integrate WO-042 `TokenResolver` + WO-043 `scanDependencies` | Steps 9, 12 |
| AC parse Button → correct variant matrix + props + bindings | Step 16 |
| AC unresolvable className → `confidence: low` | Step 17 |
| AC round-trip parse → scaffold valid ComponentSet | Step 18 |
| Testing: Vitest unit + integration | Steps 16–19 |

---

## Module tree (create in this ticket)

```
src/core/import/templates/
  react.ts                          # ReactImportTemplate class — implements ImportTemplate
  react/
    index.ts                        # barrel re-exports for tests
    types.ts                        # ReactParseInternal, CvaVariantMap, ClassTokenContext
    createSource.ts                 # ts.createSourceFile wrapper (ScriptKind.TSX)
    findExportedComponent.ts        # export default | named export detection
    parseCvaVariants.ts             # read cva(...) first-arg object keys
    parseProps.ts                   # Props interface + destructuring → ComponentSpecProp[]
    buildVariantMatrix.ts           # enum props → variantMatrix Record
    mergeFigmaMapping.ts            # parse .figma.tsx figma.enum(...) pairs
    propTypeMapper.ts               # TS type nodes → ComponentSpecProp (real impl)
    extractBindings.ts              # className tokens → bindings via TokenResolver
    parseJsxLayout.ts               # flex/gap/padding from root JSX className
    buildSubComponents.ts           # DependencyTree registered nodes → subComponents
    attachConfidence.ts             # FR-IMP-7 confidence + unresolved[]
    collectClassTokens.ts           # split cn(...) / string literals
    tokenToSelector.ts              # heuristics table bg-* → root.fill

tests/fixtures/sources/
  button.tsx                        # minimal shadcn-like compilable source
  button.figma.tsx                  # optional merge test fixture

tests/unit/core/import/templates/
  react.createSource.test.ts
  react.findExportedComponent.test.ts
  react.parseCvaVariants.test.ts
  react.parseProps.test.ts
  react.mergeFigmaMapping.test.ts
  react.propTypeMapper.test.ts
  react.extractBindings.test.ts
  react.parseJsxLayout.test.ts
  react.buildSubComponents.test.ts
  react.attachConfidence.test.ts
  react.parseButton.test.ts         # golden test vs canonical fixture
  react.unresolvedTokens.test.ts
  react.scaffoldRoundTrip.test.ts
```

---

## Steps

- [x] **Step 1** — Create shared AST helper `src/core/import/templates/react/createSource.ts`:

```typescript
import ts from 'typescript';

export function createTsxSourceFile(sourcePath: string, sourceText: string): ts.SourceFile {
  return ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );
}
```

- **Done when:** `tests/unit/core/import/templates/react.createSource.test.ts` — parses minimal JSX without throwing; `sourceFile.languageVariant === ts.LanguageVariant.JSX`.

- [x] **Step 2** — Implement `src/core/import/templates/react/findExportedComponent.ts`:

```typescript
import ts from 'typescript';

export type ExportedComponentKind = 'function' | 'forwardRef' | 'memo';

export interface ExportedComponentMatch {
  name: string;                    // PascalCase export name
  kind: ExportedComponentKind;
  node: ts.Node;                   // function decl | variable decl initializer
  propsParameter?: ts.ParameterDeclaration;
}

export function findExportedComponent(sourceFile: ts.SourceFile): ExportedComponentMatch | null;
```

| Detection rule | Action |
| -------------- | ------ |
| `export function Button(` | Match name `Button`, kind `function` |
| `export const Button = forwardRef(` | Unwrap to inner function, kind `forwardRef` |
| `export const Button = memo(` | Unwrap one level, kind `memo` |
| `export default function` / `export default memo(...)` | Name from function id or filename fallback |
| Multiple exports | Prefer named `Button` over default; error issue if ambiguous |

- **Done when:** fixture with forwardRef + memo wrappers resolves to same component name; no-export file returns `null`.

- [x] **Step 3** — Wire registry entry `src/core/import/templates/react.ts`:

```typescript
import type { ImportTemplate, ImportTemplateContext, ImportTemplateResult } from '@/core/import/types';
import { parseReactComponent } from './react/parseReactComponent';

export class ReactImportTemplate implements ImportTemplate {
  readonly framework = 'react' as const;

  parse(ctx: ImportTemplateContext): ImportTemplateResult {
    return parseReactComponent(ctx);
  }
}
```

Update `src/core/import/registry.ts` — replace stub import with `ReactImportTemplate`.

- **Done when:** `getImportTemplate('react')` returns non-null instance; `parse()` callable (may throw not-implemented until Step 14 completes).

- [x] **Step 4** — Implement `src/core/import/templates/react/parseCvaVariants.ts`:

```typescript
export interface CvaVariantMap {
  /** prop name → enum values, e.g. variant → ['default','destructive',…] */
  axes: Record<string, string[]>;
  /** local binding name, e.g. 'buttonVariants' */
  bindingName: string;
}

export function findCvaVariantMap(sourceFile: ts.SourceFile): CvaVariantMap | null;
```

| Pattern | Parser action |
| ------- | ------------- |
| `const buttonVariants = cva('base', { variants: { variant: { default: '…', … } } })` | Read keys under `variants.variant`, `variants.size` |
| `VariantProps<typeof buttonVariants>` on props type | Link props interface to `bindingName` |
| Missing cva | Return `null`; variant matrix built from props enums only |

- **Done when:** unit test reads 6 variant keys + 4 size keys matching canonical fixture.

- [x] **Step 5** — Implement `src/core/import/templates/react/propTypeMapper.ts` (replaces WO-039 stub body):

```typescript
import type { ComponentSpecProp } from '@detroitlabs/fighub-contracts';
import ts from 'typescript';
import { coerceBooleanDefault, coerceTextDefault } from '@/core/components/scaffold/propTypeMap';

export function mapTsTypeToSpecProp(
  name: string,
  typeNode: ts.TypeNode | undefined,
  initializer?: ts.Expression,
  cvaEnums?: Record<string, string[]>,
): ComponentSpecProp | null;

export function mapPropsInterface(
  members: ts.TypeElement[],
  cvaEnums?: Record<string, string[]>,
): ComponentSpecProp[];
```

| TS pattern | Spec type |
| ---------- | --------- |
| `boolean` / `boolean \| undefined` | `{ type: 'boolean', default: coerceBooleanDefault(...) }` |
| `string` | `{ type: 'string', default: coerceTextDefault(...) }` |
| union of string literals | `{ type: 'enum', enum: [...], default: first or initializer }` |
| key in `cvaEnums` | prefer cva enum list over inferred union |
| `React.ComponentProps<'button'>['type']` | `{ type: 'enum', enum: ['button','submit','reset'] }` |
| `Slot` / `asChild` from Radix | keep `asChild` boolean |
| Unknown generic | skip with warning issue; try destructuring fallback in Step 6 |

- **Done when:** `tests/unit/core/import/templates/react.propTypeMapper.test.ts` — all 7 canonical props (`variant`, `size`, `disabled`, `asChild`, `type`, `className`, `loading`).

- [x] **Step 6** — Implement `src/core/import/templates/react/parseProps.ts` + `buildVariantMatrix.ts`:

```typescript
export function parsePropsFromComponent(
  match: ExportedComponentMatch,
  sourceFile: ts.SourceFile,
  cvaMap: CvaVariantMap | null,
): { props: ComponentSpecProp[]; variantMatrix: Record<string, string[]> };
```

Rules:

1. Resolve props type: `interface ButtonProps extends VariantProps<typeof buttonVariants>` → read interface + extends.
2. Fallback: destructure `{ variant, size, className, ...props }` parameter — infer prop names.
3. **`buildVariantMatrix`:** for each prop with `type: 'enum'` whose name appears in cva axes OR is `variant`/`size`, add axis to matrix. **Do not emit legacy `state` axis** (WO-057).
4. Set `componentProps: { label: true, leadingIcon: true, trailingIcon: true }` and `iconSlots: { leading: true, trailing: true }` when JSX contains text child + icon slot patterns (Loader2, SVG) — match canonical fixture for Button.

- **Done when:** variant matrix `{ variant: 6 values, size: 4 values }`; props array length 7.

- [x] **Step 7** — Implement `src/core/import/templates/react/mergeFigmaMapping.ts` (FR-IMP-6):

```typescript
export interface FigmaEnumMapping {
  /** Figma property name → code value */
  propRenames: Record<string, string>;
  /** axis → { figmaLabel: codeValue } */
  enumOverrides: Record<string, Record<string, string>>;
}

export function parseFigmaMappingText(figmaMappingText: string): FigmaEnumMapping;

export function mergeFigmaMappingIntoSpec(
  props: ComponentSpecProp[],
  variantMatrix: Record<string, string[]>,
  mapping: FigmaEnumMapping,
): { props: ComponentSpecProp[]; variantMatrix: Record<string, string[]> };
```

Parse patterns from sibling `.figma.tsx`:

- `figma.enum('Variant', { Primary: 'default', … })`
- `figma.boolean('Disabled')` → confirm prop name alignment only

When conflict: **prefer Figma mapping labels** for enum display strings; code values stay as in source.

- **Done when:** `tests/fixtures/sources/button.figma.tsx` merged test adds/renames at least one enum label; parse without mapping unchanged.

- [x] **Step 8** — Implement `src/core/import/templates/react/parseJsxLayout.ts`:

```typescript
import type { ComponentSpecLayout, ComponentSpecConfidenceLevel } from '@detroitlabs/fighub-contracts';

export interface LayoutInferenceResult {
  layout: ComponentSpecLayout;
  confidence: ComponentSpecConfidenceLevel;
  ambiguousTokens: string[];
}

export function inferLayoutFromRootJsx(
  match: ExportedComponentMatch,
  sourceFile: ts.SourceFile,
  classTokens: string[],
): LayoutInferenceResult;
```

| Class token | Layout field |
| ----------- | ------------ |
| `inline-flex`, `flex` (no `flex-col`) | `direction: 'horizontal'` |
| `flex-col`, `flex-col-reverse` | `direction: 'vertical'` |
| `gap-*` | `gap` as numeric string (strip `px` if present) |
| `p-*`, `px-*`, `py-*` | `padding` — prefer horizontal padding for chip |
| default | `sizing: { horizontal: 'hug', vertical: 'hug' }` |

Confidence: **`layout: 'high'`** when direction + gap resolved; **`'low'`** when direction inferred from ambiguous class list (both flex-row and flex-col tokens) or no layout classes found (use canonical defaults).

- **Done when:** Button fixture → `{ direction: 'horizontal', gap: '8', padding: '16', sizing: { horizontal: 'hug', vertical: 'hug' } }`.

- [x] **Step 9** — Implement `src/core/import/templates/react/collectClassTokens.ts` + `tokenToSelector.ts` + `extractBindings.ts`:

```typescript
// collectClassTokens.ts
export function collectClassTokensFromComponent(
  match: ExportedComponentMatch,
  sourceFile: ts.SourceFile,
  cvaMap: CvaVariantMap | null,
): string[];

// tokenToSelector.ts — MVP heuristics
export function mapTokenToBindingSelector(token: string): string | null;
// bg-* → root.fill; text-* → text/label.fill; rounded-* → root.radius;
// p-*/px-*/py-* → root.padding; gap-* → root.gap;
// hover:bg-* → state-layer/hover.fill; ring-* → focus-ring.stroke

// extractBindings.ts
import type { ComponentSpecBinding } from '@detroitlabs/fighub-contracts';
import type { TokenResolver } from '@/core/import/shared/types';

export interface ExtractBindingsResult {
  bindings: ComponentSpecBinding[];
  unresolvedTokens: string[];
}

export function extractBindings(
  classTokens: string[],
  tokenResolver: TokenResolver,
): ExtractBindingsResult;
```

Pipeline per token:

1. Strip responsive/state prefixes for resolver call (`hover:`, `sm:`, `dark:`) — resolve base fragment only (WO-042 MVP limitation).
2. `tokenResolver.resolve(baseToken)` → `{ ok: true, variable }` → push `{ selector, variable }`.
3. `{ ok: false }` → push token to `unresolvedTokens`; emit `issues` entry `{ code: 'unresolved-token', severity: 'warning' }`.
4. Skip duplicates (same selector + variable).
5. **Do not** bind arbitrary values `bg-[#fff]` — treat as unresolved.

- **Done when:** mocked resolver returning canonical paths yields 8 bindings matching fixture; `bg-muted/40` with always-unresolved mock adds to `unresolvedTokens`.

- [x] **Step 10** — Create golden source fixture `tests/fixtures/sources/button.tsx`:

Minimal compilable shadcn-like Button containing:

- `cva` with 6 variants × 4 sizes
- Props: `variant`, `size`, `disabled`, `asChild`, `type`, `className`, `loading`
- Root JSX: `inline-flex`, `gap-2`, `px-4`, `rounded-md`, `bg-primary`, focus ring classes
- Optional `Loader2` icon import for loading state

- **Done when:** file exists; `findExportedComponent` + `findCvaVariantMap` both succeed on it.

- [x] **Step 11** — Implement `src/core/import/templates/react/attachConfidence.ts`:

```typescript
import type { ComponentSpecConfidence } from '@detroitlabs/fighub-contracts';

export function attachConfidence(
  unresolvedTokens: string[],
  layoutConfidence: ComponentSpecConfidenceLevel,
): ComponentSpecConfidence;
```

Rules (FR-IMP-7):

| Condition | Result |
| --------- | ------ |
| any `unresolvedTokens.length > 0` | `bindings: 'low'`, populate `unresolved: unresolvedTokens` |
| all tokens resolved | `bindings: 'high'` |
| layout inference returned `'low'` | `layout: 'low'` |
| otherwise | `layout: 'high'` or `'medium'` if gap/padding defaulted |

- **Done when:** unresolved test → `{ bindings: 'low', layout: 'high' | 'low', unresolved: ['bg-muted/40'] }`.

- [x] **Step 12** — Integrate **WO-043 `scanDependencies`** + `buildSubComponents.ts`:

```typescript
import { scanDependencies } from '@/core/import/shared/dependencyScanner';
import type { ComponentSpecSubComponent } from '@detroitlabs/fighub-contracts';

export function buildSubComponents(
  dependencyTree: DependencyTree,
  nameToKey?: Record<string, string>,
): ComponentSpecSubComponent[];
```

In orchestrator: call `scanDependencies(ctx.sourceText, ctx.sourcePath, { registryKeys: ctx.registryKeys })` **after** props merge, **before** bindings.

`buildSubComponents`: filter `tree.nodes` where `status === 'registered'` → `{ name, registryRef: kebabCase(name) }`. Unknown/circular nodes stay in `dependencyTree` for WO-044 UI — do not throw.

- **Done when:** test with mocked registry keys `['icon']` and JSX `<Icon />` produces one subComponent entry.

- [x] **Step 13** — Implement orchestrator `src/core/import/templates/react/parseReactComponent.ts`:

```typescript
import type { ImportTemplateContext, ImportTemplateResult } from '@/core/import/types';
import { inferArchetype } from '@/core/components/scaffold/specAdapter';
import { pluginLog } from '@/core/pluginLog';

export function parseReactComponent(ctx: ImportTemplateContext): ImportTemplateResult;
```

Ordered pipeline (log `console.debug` / `pluginLog` at each pass):

```
createTsxSourceFile
→ findExportedComponent (error if null)
→ findCvaVariantMap
→ parsePropsFromComponent + buildVariantMatrix
→ mergeFigmaMapping (if ctx.figmaMappingText)
→ scanDependencies (WO-043)
→ collectClassTokensFromComponent
→ extractBindings (WO-042 TokenResolver from ctx)
→ inferLayoutFromRootJsx
→ buildSubComponents
→ assemble ComponentSpecV1 { v:1, kind:'component-spec', name, framework:'react', … }
→ inferArchetype(spec) — set spec.archetype if absent
→ attachConfidence
→ return { spec, dependencyTree, issues }
```

`name`: PascalCase export name (`Button`). `framework`: always `'react'`.

- **Done when:** end-to-end parse of button fixture returns valid shape; `inferArchetype` yields `'chip'` for Button.

- [x] **Step 14** — Export barrel `src/core/import/templates/react/index.ts` and update `src/core/import/index.ts` to export `ReactImportTemplate`.

- **Done when:** `import { ReactImportTemplate } from '@/core/import'` resolves in Vitest.

- [x] **Step 15** — Create mock resolver helper `tests/mocks/tokenResolverCanonical.ts`:

```typescript
import type { TokenResolver } from '@/core/import/shared/types';

/** Maps canonical button tokens → paths in component-spec-button-canonical.json */
export function createCanonicalButtonTokenResolver(): TokenResolver;
```

Map at minimum: `bg-primary` → `color/primary/default`, `rounded-md` → `radius/md`, `px-4` → `space/md`, `gap-2` → `space/sm`, `text-primary-foreground` → `color/primary/content`, hover/subtle, focus ring tokens.

- **Done when:** used by Steps 16–17.

- [x] **Step 16** — Golden test `tests/unit/core/import/templates/react.parseButton.test.ts`:

```typescript
import canonical from '@/../tests/fixtures/component-spec-button-canonical.json';
import buttonSource from '@/../tests/fixtures/sources/button.tsx?raw';
import { createCanonicalButtonTokenResolver } from '@/../tests/mocks/tokenResolverCanonical';

it('parses shadcn Button → canonical ComponentSpecV1', () => {
  const result = new ReactImportTemplate().parse({
    sourcePath: 'components/ui/button.tsx',
    sourceText: buttonSource,
    tokenResolver: createCanonicalButtonTokenResolver(),
    registryKeys: [],
  });
  expect(result.spec.variantMatrix).toEqual(canonical.variantMatrix);
  expect(result.spec.props).toEqual(canonical.props);
  expect(result.spec.bindings).toEqual(canonical.bindings);
  expect(result.spec.layout).toEqual(canonical.layout);
  expect(result.spec.archetype).toBe('chip');
  expect(result.spec.framework).toBe('react');
  expect(result.spec.name).toBe('Button');
});
```

- **Done when:** test green; satisfies ticket AC #1.

- [x] **Step 17** — Unresolved token test `tests/unit/core/import/templates/react.unresolvedTokens.test.ts`:

- Inject resolver that returns `{ ok: false, reason: 'unresolved' }` for `bg-muted/40`.
- Source includes `bg-muted/40` in cva base string.
- **Done when:** `result.spec.confidence?.bindings === 'low'`; `result.spec.confidence?.unresolved` contains `'bg-muted/40'`; `issues` has `unresolved-token` warning.

- [x] **Step 18** — Scaffold round-trip `tests/unit/core/import/templates/react.scaffoldRoundTrip.test.ts`:

```typescript
import { runScaffold } from '@/core/components/scaffold';
// mock figma globals + registry snapshot
```

Flow: parse button fixture → pass `result.spec` to scaffold runner (existing test patterns from `tests/unit/core/components/scaffold/`).

- **Done when:** scaffold returns valid `ComponentSet` node count === `6 × 4 === 24` variants; satisfies ticket AC round-trip.

- [x] **Step 19** — CI gate: run full unit suite for import templates:

```bash
npm run test -- tests/unit/core/import/templates
```

- **Done when:** all new tests pass; `npm run build` succeeds (typescript bundle size acceptable per research D1).

- [x] **Step 20** — Manual smoke checklist (defer full WO-044 E2E):

| # | Procedure | Expected |
| - | --------- | -------- |
| 1 | Import `ReactImportTemplate` in Vitest REPL / node | `parse()` returns spec |
| 2 | Compare spec JSON to canonical fixture diff | Only ordering differences allowed |
| 3 | Confirm no `state` axis in variantMatrix | WO-057 compliance |

Document results in PR description — not blocking if WO-044 UI not merged.

- **Done when:** checklist recorded in PR; no parser regressions.

---

## Build Agents

### Phase 1 (parallel, after WO-039 + WO-042 + WO-043 merged)

- `code-build` — **Steps 1–3:** AST foundation + registry wiring + `findExportedComponent`
- `code-build` — **Steps 10, 15:** golden source fixture + canonical token resolver mock

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 4–6:** cva variant detection + propTypeMapper + props/variant matrix
- `code-build` — **Step 7:** mergeFigmaMapping from `.figma.tsx`

### Phase 3 (parallel, after Phase 2)

- `code-build` — **Steps 8–9, 11:** parseJsxLayout + extractBindings + attachConfidence
- `code-build` — **Steps 12–14:** scanDependencies integration + orchestrator + exports

### Phase 4 (sequential, after Phase 3)

- `code-build` — **Steps 16–20:** golden test, unresolved test, scaffold round-trip, CI gate, manual smoke

---

## Dependencies & Tools

| Dependency | Required for | Notes |
| ---------- | ------------ | ----- |
| **WO-039** | Steps 1–3 | `ImportTemplate`, `ImportTemplateContext`, registry, shared type stubs |
| **WO-042** | Step 9 | `TokenResolver` interface + `createTokenResolver` (tests use mock) |
| **WO-043** | Step 12 | `scanDependencies` real implementation + optional `tsAst.ts` shared helpers |
| **WO-022** | Step 18 | Existing scaffold pipeline |
| `typescript@^6` | All AST steps | Already in `package.json`; bundled for plugin main |
| `@detroitlabs/fighub-contracts` | Output shape | `ComponentSpecV1`, `ComponentSpecConfidence` |
| `src/core/components/scaffold/specAdapter.ts` | Step 13 | `inferArchetype()` |
| `src/core/components/scaffold/propTypeMap.ts` | Step 5 | `coerceBooleanDefault`, `coerceTextDefault` only |

**MCP / external:** none — pure in-plugin parsing.

**Hard gate:** do not start Phase 3 until WO-042 `TokenResolver.resolve` and WO-043 `scanDependencies` are importable from `@/core/import/shared/`.

---

## Open Questions

| # | Question | Status |
| - | -------- | ------ |
| Q1 | Share `tsAst.ts` between WO-041 and WO-043 vs duplicate visit helpers | **RESOLVED:** import from `@/core/import/shared/tsAst` if WO-043 lands it; otherwise inline in WO-041 and refactor in follow-up |
| Q2 | Parse `.jsx` without types | **DEFERRED** — ticket out of scope |
| Q3 | `loading` prop not in stock shadcn Button — include in fixture? | **RESOLVED:** yes — canonical fixture includes it; add to test source |
| Q4 | E2E via WO-044 UI before merge | **DEFERRED** to WO-044 — Step 20 manual smoke only |

---

## Notes

### Build completion (2026-05-29)

- Replaced `ReactImportTemplateStub` with full `ReactImportTemplate` + `src/core/import/templates/react/*` module tree (20 files).
- Registry wired to `ReactImportTemplate`; exports added to `@/core/import`.
- Golden parse matches `component-spec-button-canonical.json`; scaffold round-trip yields 24 variants.
- `reactStub.ts` left in tree but unused — safe to delete in cleanup.
- Tests: `npm run test -- tests/unit/core/import/templates` → 20/20 pass; full `tests/unit/core/import` → 62/62 pass; `npm run typecheck` + `npm run build` green.
- Step 20 smoke: verified via golden test (no `state` axis; spec ordering stable after canonical sort helpers).

### ES2017 + logging

- Plugin main thread: no `async` generators; prefer sync AST walks.
- Log each pipeline pass: `pluginLog('import:react:pass', { pass: 'extractBindings', tokenCount })`.
- Avoid `ts.createProgram` — Figma sandbox has no filesystem access to `node_modules` types.

### Confidence policy (FR-IMP-7)

Parser **sets** `confidence` — never auto-clears. WO-044 preview UI shows warnings; designer must accept before `scaffold/run`. Dual signal: `issues[]` for dev console + `confidence` on spec for UI badges.

### Binding variable path convention

Use slash paths **without** collection prefix, matching `tests/fixtures/component-spec-button-canonical.json` (`color/primary/default`, not `Theme/Primary`). WO-042 resolver may return theme-prefixed paths — normalize in `extractBindings` if needed.

### Wrong vs correct

| Wrong | Correct |
| ----- | ------- |
| Spawn subprocess `tsc` / `createProgram` | Single-file `createSourceFile` |
| Silent skip unresolved Tailwind tokens | `confidence.bindings: 'low'` + `issues` |
| Emit `state` variant axis | Only `variant` × `size` per WO-057 |
| Call `scaffold/run` from parser | Return `ImportTemplateResult`; WO-044 posts message |
| Parse types from `node_modules` | One-level `./` relative imports only |

### Bibliography

- Ticket: [ticket.md](ticket.md)
- Research: [research/react-importfromcode-parser-ts-ast.md](research/react-importfromcode-parser-ts-ast.md)
- Golden fixture: `tests/fixtures/component-spec-button-canonical.json`
- Plan quality bar: `.github/templates/plan-quality-bar.md`
- PRD: `Docs/PRD.md` §6.3 FR-IMP-4..8
