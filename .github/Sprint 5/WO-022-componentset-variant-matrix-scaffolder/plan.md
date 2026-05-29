# Plan — WO-022: ComponentSet variant matrix scaffolder

## Approach

Implement the **forward-path scaffold core** as `src/core/components/scaffold/`: a single deterministic Plugin API entry point `scaffold(spec, target, options?)` that replaces DesignOps's five sequential MCP Step 6 bundles (`cc-scaffold` → `cc-component-*` only — **no** doc-frame sections). Given a validated `ComponentSpecV1`, the engine expands `variantMatrix` to a full cross-product, builds one `ComponentNode` per combo via the correct layout archetype builder, stages variants in a hidden frame, calls `figma.combineAsVariants`, and returns a grid-layout `ComponentSetNode` named `{spec.name} — ComponentSet` with WO-023-ready layer naming.

**In scope:** `variantMatrix.ts`, `types.ts`, `context.ts`, `specAdapter.ts`, `index.ts` orchestration, eight builder modules under `archetypes/` (`chip`, `surfaceStack`, `field`, `rowItem`, `tiny`, `container`, `control`, `composed` + `shared`), hex-fallback geometry, WO-014 auto-layout helpers, idempotent replace via `pluginData`, inline scaffold audit rows, Vitest unit + integration tests per archetype, golden fixtures under `tests/fixtures/component-spec/`.

**Out of scope (ticket verbatim):** variable bindings (WO-023), property definitions (WO-024), usage frame (WO-025), registry write (WO-026). Do **not** port `buildPropertiesTable`, matrix specimen grid, usage cards, bundle runners, or MCP preamble duplication.

**Drift guard:** Port from modular `cc-arch-*.js` + chip bundle inline `buildVariant` — **not** full 45–65 KB `component-*.mcp.js` bundles. `composed` dispatches when `spec.composes?.length > 0` (not an eighth layout enum). Geometry uses hex fallbacks only; optional `RegistryV1` **read** for composed child instances.

---

## Acceptance criteria traceability

| Ticket AC / requirement                             | Plan step(s)    | Verification                                                                                        |
| --------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| AC: 3 × 2 × 2 axes → 12 children, Figma naming      | Steps 3, 10, 19 | `variantMatrix.test.ts` + `scaffold.integration.test.ts`                                            |
| AC: Each archetype passes integration test          | Steps 9, 11–17  | `tests/unit/core/components/scaffold/archetypes/*.test.ts`                                          |
| AC: Re-run idempotent                               | Steps 10, 20    | `idempotency.test.ts`                                                                               |
| AC: Audit reports cleanly                           | Step 18         | `auditRows.test.ts`; rows `comp/scaffold-*` all pass (full `runAudit('component')` wired in WO-023) |
| Req 1: `scaffold()` entry in `index.ts`             | Step 10         | typecheck + integration test                                                                        |
| Req 2: `variantMatrix.ts` cross-product             | Step 3          | unit tests                                                                                          |
| Req 3: archetypes/ one module per layout + composed | Steps 8–17      | per-archetype tests                                                                                 |
| Req 4: variant pipeline + combineAsVariants + grid  | Step 10         | integration test                                                                                    |
| Req 5: layer naming contract                        | Steps 8–17      | grep + archetype tests assert paths                                                                 |
| Req 6: idempotency pluginData                       | Steps 2, 10, 20 | idempotency test                                                                                    |
| Req 7: hex fallbacks; optional registry read        | Steps 5, 17     | composed test + no bind imports                                                                     |
| Req 8: WO-014 helpers                               | Steps 8–17      | `assertNoOnePxMaster` in audit                                                                      |

---

## Wrong vs correct lift

| Wrong (do not copy)                                            | Why                                           | Correct lift                                                                   |
| -------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| Entire `component-chip.mcp.js` (45+ KB bundle)                 | Inlined preamble, variable bind, doc sections | `buildVariant` inline L281–536 + `cc-arch-shared.js` → `chip.ts` + `shared.ts` |
| Five-call Step 6 sequence as internal TS steps                 | MCP budget artifact only                      | Single `scaffold()` in `index.ts`                                              |
| `cc-scaffold` doc frame tree                                   | WO-025 scope                                  | ComponentSet on `target: PageNode` directly                                    |
| `buildPropertiesTable` / `addComponentProperty` before combine | WO-024 scope                                  | Defer; structure nodes for future wiring                                       |
| `bindColor` / `bindNum` in builders                            | WO-023 scope                                  | Hex fallbacks via `context.ts` palette                                         |
| Eighth `composed` layout enum on contract                      | Not in `ComponentSpecV1`                      | `if (spec.composes?.length)` → `composed.ts`                                   |
| Legacy `variant=${v}, size=${s}` naming                        | Replaced by `variantMatrix` record            | Alphabetical keys → `key=value` comma pairs                                    |
| `console.debug` in main thread                                 | Project convention                            | `pluginLog('[scaffold]', …)` from `@/core/pluginLog`                           |
| ES2020 syntax (`?.`, `??`, `replaceAll`)                       | Figma QuickJS ES2017                          | Explicit null checks; `indexOf`/`split`                                        |

---

## Steps

### Foundation — types, matrix, adapter, context

- [x] **Step 1** — Create directory scaffold and barrel exports:

  ```
  src/core/components/scaffold/
    index.ts
    types.ts
    variantMatrix.ts
    context.ts
    specAdapter.ts
    archetypes/
      shared.ts
      chip.ts
      surfaceStack.ts
      field.ts
      rowItem.ts
      tiny.ts
      container.ts
      control.ts
      composed.ts
  tests/unit/core/components/scaffold/
    __mocks__/figmaScaffold.ts
    variantMatrix.test.ts
    specAdapter.test.ts
    idempotency.test.ts
    auditRows.test.ts
    scaffold.integration.test.ts
    archetypes/
      chip.test.ts
      surfaceStack.test.ts
      field.test.ts
      rowItem.test.ts
      tiny.test.ts
      container.test.ts
      control.test.ts
      composed.test.ts
  tests/fixtures/component-spec/
    chip-button-minimal.v1.json
    chip-button-3x2x2.v1.json
    surface-stack-minimal.v1.json
    field-minimal.v1.json
    row-item-minimal.v1.json
    tiny-minimal.v1.json
    container-minimal.v1.json
    control-checkbox-minimal.v1.json
    composed-button-group.v1.json
    registry-button-child.v1.json
  ```

  Add `src/core/components/index.ts` re-exporting `scaffold` if missing.

  **Done when:** `npm run typecheck` passes with stub exports.

- [x] **Step 2** — Implement `src/core/components/scaffold/types.ts`:

  ```ts
  import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';
  import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';
  import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

  export type VariantCombo = Record<string, string | boolean>;

  export interface ExpandedVariant {
    name: string; // Figma variant layer name, e.g. "disabled=false, size=sm, variant=primary"
    combo: VariantCombo;
  }

  export interface ScaffoldOptions {
    registry?: RegistryV1;
    displayTitle?: string; // default spec.name — ComponentSet suffix only
  }

  export interface ScaffoldBuildContext {
    spec: ComponentSpecV1;
    displayTitle: string;
    combo: VariantCombo;
    variantName: string;
    fills: { primary: RGB; onPrimary: RGB; surface: RGB; outline: RGB };
    spacing: { padH: number; padV: number; gap: number; iconSize: number };
    fonts: { labelFamily: string; labelStyle: string };
    styleByVariantKey: Record<string, { fill: RGB; text: RGB }>;
  }

  export interface VariantBuildResult {
    component: ComponentNode;
    warnings?: string[];
  }

  export interface ScaffoldResult {
    componentSet: ComponentSetNode;
    variantCount: number;
    variantByKey: Record<string, ComponentNode>;
    replacedExisting: boolean;
    scaffoldId: string;
    auditRows: AuditRuleResult[];
    unresolvedTokens: string[]; // always [] in WO-022
  }

  export type ArchetypeBuilder = (ctx: ScaffoldBuildContext) => Promise<VariantBuildResult>;

  export const PLUGIN_DATA_SCAFFOLD_ID = 'fighub.scaffoldId';
  export const PLUGIN_DATA_SPEC_VERSION = 'fighub.specVersion';
  ```

  **Done when:** types exported; no optional chaining in file (ES2017).

- [x] **Step 3** — Implement `src/core/components/scaffold/variantMatrix.ts`:

  ```ts
  export function sortAxisKeys(matrix: Record<string, (string | boolean)[]>): string[];
  export function expandVariantMatrix(
    matrix: Record<string, (string | boolean)[]>,
  ): ExpandedVariant[];
  export function formatVariantName(combo: VariantCombo): string;
  export function hashVariantMatrix(matrix: Record<string, (string | boolean)[]>): string;
  export function buildScaffoldId(
    specName: string,
    matrix: Record<string, (string | boolean)[]>,
  ): string;
  export function parseVariantName(name: string): VariantCombo | null;
  export function expectedVariantCount(matrix: Record<string, (string | boolean)[]>): number;
  ```

  **Behavior (locked from research D2):**
  1. Sort axis keys alphabetically.
  2. Cartesian product in stable nested-loop order (outer = first sorted key).
  3. Booleans → `"true"` / `"false"` strings in names.
  4. `hashVariantMatrix`: canonical JSON of sorted keys + values → FNV-1a 32-bit hex (match WO-005 generator pattern).
  5. `buildScaffoldId`: `` `fighub:scaffold:v1:${specName}:${hash}` ``.

  **Done when:** `variantMatrix.test.ts` asserts 3×2×2 → 12 combos; sample name `disabled=false, size=sm, variant=a`; hash stable across key insertion order; `parseVariantName` round-trips.

- [x] **Step 4** — Implement `src/core/components/scaffold/specAdapter.ts`:

  ```ts
  export function inferArchetype(spec: ComponentSpecV1): ComponentSpecLayoutArchetype;
  export function resolveArchetypeRoute(
    spec: ComponentSpecV1,
  ): 'composed' | ComponentSpecLayoutArchetype;
  export function buildStyleByVariantKey(
    spec: ComponentSpecV1,
    ctx: ScaffoldBuildContext,
  ): Record<string, { fill: RGB; text: RGB }>;
  export function projectBuildContext(
    spec: ComponentSpecV1,
    combo: VariantCombo,
    variantName: string,
    options?: ScaffoldOptions,
  ): ScaffoldBuildContext;
  ```

  **Behavior:**
  - `resolveArchetypeRoute`: if `spec.composes && spec.composes.length > 0` → `'composed'`; else `spec.archetype ?? inferArchetype(spec)`.
  - `inferArchetype`: when unknown → `'chip'` (caller logs warn).
  - `buildStyleByVariantKey`: synthesize legacy `CONFIG.style` from `surface`/`control`/archetype blobs + FNV-1a hex per variant value when spec lacks explicit fills (OQ-3 default path).
  - Map `spec.layout.padding` string tokens to numeric `padH`/`padV` via simple px parse or defaults `{ padH: 16, padV: 8, gap: 8, iconSize: 18 }`.

  **Done when:** `specAdapter.test.ts` covers composed route, chip fallback, style map non-empty for chip-button-minimal fixture.

- [x] **Step 5** — Implement `src/core/components/scaffold/context.ts`:

  ```ts
  export const HEX_FALLBACK_PALETTE: { primary: RGB; onPrimary: RGB; surface: RGB; outline: RGB };
  export function createScaffoldContext(
    spec: ComponentSpecV1,
    combo: VariantCombo,
    variantName: string,
    options?: ScaffoldOptions,
  ): ScaffoldBuildContext;
  export async function ensureScaffoldFonts(ctx: ScaffoldBuildContext): Promise<void>;
  export function resolveRegistryNodeId(
    registry: RegistryV1 | undefined,
    registryRef: string,
  ): string | null;
  ```

  **Behavior:**
  - Hex palette locked constants (M3-ish defaults): primary `#6750A4`, onPrimary `#FFFFFF`, surface `#FFFBFE`, outline `#79747E`.
  - `ensureScaffoldFonts`: `figma.loadFontAsync({ family, style })` before any `text.characters` assignment.
  - `resolveRegistryNodeId`: lookup `registry.components[registryRef].nodeId`; return `null` when missing (composed throws structured error).
  - **Do not** call `bindPaintToVar` or `ensureLocalVariableMap` for geometry (WO-023 only).

  **Done when:** unit test verifies palette values; font loader invoked via mock spy.

- [x] **Step 6** — Extend Figma test harness `tests/unit/core/components/scaffold/__mocks__/figmaScaffold.ts`:
  - Reuse patterns from `tests/unit/core/canvas/__mocks__/figmaFrames.ts`.
  - Add `MockComponent`, `MockComponentSet`, `pluginData: Record<string, string>` on nodes.
  - Implement `combineAsVariants(components, parent): MockComponentSet` — moves components under set, sets `type = 'COMPONENT_SET'`.
  - Implement `figma.createComponent()`, `figma.combineAsVariants` stubs on global `figma` for tests.
  - `findOne` helper scanning page children by predicate.

  **Done when:** mock demonstrates combineAsVariants parent assignment + pluginData round-trip.

- [x] **Step 7** — Author golden fixtures under `tests/fixtures/component-spec/`:
  - `chip-button-minimal.v1.json` — 1×1 variant matrix; `archetype: "chip"`; layers exercise `text/label`, optional `icon-slot/leading`.
  - `chip-button-3x2x2.v1.json` — `{ variant: [a,b,c], size: [sm,md], disabled: [false,true] }` for AC matrix test.
  - One minimal valid spec per remaining archetype (surface-stack, field, row-item, tiny, container, control-checkbox).
  - `composed-button-group.v1.json` + `registry-button-child.v1.json` for composed path.
  - **Do not** use drifted `src/io/formats/__fixtures__/component-spec-button.json`.

  **Done when:** each fixture validates against `ComponentSpecV1` schema / type import in test helper.

### Shared helpers + chip (proves pipeline)

- [x] **Step 8** — Implement `src/core/components/scaffold/archetypes/shared.ts` porting `cc-arch-shared.js`:
  - `createDashedIconSlot(name: string, size: number): FrameNode` → `icon-slot/{leading|trailing|center}`
  - `createStateLayer(role: 'hover' | 'pressed' | 'focus', parent: FrameNode): FrameNode` → `state-layer/*`
  - `createFocusRing(parent: FrameNode): FrameNode` → `focus-ring`
  - `applyHexFill(node: GeometryMixin, color: RGB): void`
  - All parent frames call `assertValidAxisAlign` from `@/core/canvas/helpers/autoLayout`.

  **Done when:** shared helpers covered by chip test indirectly; no variable binding imports.

- [x] **Step 9** — Implement `src/core/components/scaffold/archetypes/chip.ts`:

  ```ts
  export async function buildChipVariant(ctx: ScaffoldBuildContext): Promise<VariantBuildResult>;
  ```

  **Lift:** `DesignOps-plugin/.../component-chip.mcp.js` L281–536 (`buildVariant` inline).

  **Behavior:**
  - Create `ComponentNode`; root auto-layout HORIZONTAL; `resizeThenApplySizing` / `createHugFrame` per WO-014.
  - Name label text node `text/label` (FigHub fix — legacy left unnamed).
  - Optional leading/trailing icon slots from `ctx.spec.iconSlots`.
  - Hex fills from `ctx.styleByVariantKey[variantKey]`.
  - Return `{ component }`.

  **Done when:** `archetypes/chip.test.ts` builds 1 variant; asserts `text/label` exists; `assertNoOnePxMaster(component)` null.

### Orchestration — index.ts scaffold()

- [x] **Step 10** — Implement `src/core/components/scaffold/index.ts`:

  ```ts
  export async function scaffold(
    spec: ComponentSpecV1,
    target: PageNode,
    options?: ScaffoldOptions,
  ): Promise<ScaffoldResult>;

  export function findExistingComponentSet(
    target: PageNode,
    scaffoldId: string,
    displayTitle: string,
  ): ComponentSetNode | null;

  export function removeScaffoldArtifacts(target: PageNode, displayTitle: string): void;

  async function stageVariants(
    target: PageNode,
    specName: string,
    components: ComponentNode[],
  ): Promise<FrameNode>;

  function finalizeComponentSet(
    componentSet: ComponentSetNode,
    displayTitle: string,
    scaffoldId: string,
  ): void;

  function buildVariantByKey(componentSet: ComponentSetNode): Record<string, ComponentNode>;

  function dispatchArchetypeBuilder(
    route: ReturnType<typeof resolveArchetypeRoute>,
  ): ArchetypeBuilder;
  ```

  **Pipeline (locked sequence):**
  1. Validate `spec.v === 1 && spec.kind === 'component-spec'`.
  2. `displayTitle = options.displayTitle ?? spec.name`.
  3. `scaffoldId = buildScaffoldId(spec.name, spec.variantMatrix)`.
  4. `findExistingComponentSet` → if found: `remove()` + `removeScaffoldArtifacts` (`_ccVariantBuild/{name}` frames); set `replacedExisting = true`.
  5. `expandVariantMatrix(spec.variantMatrix)` → loop: `projectBuildContext` → `dispatchArchetypeBuilder` → `VariantBuildResult`.
  6. `stageVariants` hidden frame `_ccVariantBuild/{spec.name}`; horizontal offset `cx += width + 16`.
  7. `figma.combineAsVariants(comps, target)` (or `{name}/scaffold` wrapper frame if page pollution concerns — default direct child of `target`).
  8. Remove staging frame.
  9. `finalizeComponentSet`: name `` `${displayTitle} — ComponentSet` ``; grid `layoutMode = 'HORIZONTAL'`, `layoutWrap = 'WRAP'`; `resizeThenApplySizing(set, set.width, 1, { primary: 'FIXED', counter: 'AUTO' })`.
  10. `setPluginData(PLUGIN_DATA_SCAFFOLD_ID, scaffoldId)` + `setPluginData(PLUGIN_DATA_SPEC_VERSION, '1')`.
  11. Build `variantByKey` via `parseVariantName`.
  12. `pluginLog('[scaffold]', { name: spec.name, variantCount, replacedExisting })`.
  13. Return `ScaffoldResult` with audit rows from Step 18 helper.

  **Dispatch table:**
  | Route | Builder |
  | ----- | ------- |
  | `chip` | `buildChipVariant` |
  | `surface-stack` | `buildSurfaceStackVariant` |
  | `field` | `buildFieldVariant` |
  | `row-item` | `buildRowItemVariant` |
  | `tiny` | `buildTinyVariant` |
  | `container` | `buildContainerVariant` |
  | `control` | `buildControlVariant` |
  | `composed` | `buildComposedVariant` |

  Missing archetype → warn + chip fallback.

  **Done when:** `scaffold.integration.test.ts` scaffolds `chip-button-3x2x2.v1.json` → 12 children with parseable names; staging frame removed after combine.

### Remaining archetypes (parallelizable)

- [x] **Step 11** — `src/core/components/scaffold/archetypes/surfaceStack.ts` — `buildSurfaceStackVariant(ctx)` port `cc-arch-surface-stack.js`. Layer paths per legacy. **Done when:** `surfaceStack.test.ts` green with `surface-stack-minimal.v1.json`.

- [x] **Step 12** — `src/core/components/scaffold/archetypes/field.ts` — `buildFieldVariant(ctx)` port `cc-arch-field.js`. Include label/helper text slots. **Done when:** `field.test.ts` green.

- [x] **Step 13** — `src/core/components/scaffold/archetypes/rowItem.ts` — `buildRowItemVariant(ctx)` port `cc-arch-row-item.js`. **Done when:** `rowItem.test.ts` green.

- [x] **Step 14** — `src/core/components/scaffold/archetypes/tiny.ts` — `buildTinyVariant(ctx)` port `cc-arch-tiny.js`; respect `spec.tiny.shape` enum. **Done when:** `tiny.test.ts` green.

- [x] **Step 15** — `src/core/components/scaffold/archetypes/container.ts` — `buildContainerVariant(ctx)` port `cc-arch-container.js`; `spec.container.kind` accordion/tabs. **Done when:** `container.test.ts` green.

- [x] **Step 16** — `src/core/components/scaffold/archetypes/control.ts` — `buildControlVariant(ctx)` port `cc-arch-control.js`:
  - Checked-state detection: `/checked=true|pressed=true|on/.test(variantName)` (preserve verbatim in comment).
  - Switch thumb layer `switch/thumb` when `shape === 'switch'`.
    **Done when:** `control.test.ts` green; checked variant asserts glyph/on state branch.

- [x] **Step 17** — `src/core/components/scaffold/archetypes/composed.ts` — `buildComposedVariant(ctx)` port `cc-arch-composed.js`:
  - Requires `options.registry` with child `nodeId`s.
  - Throw `Error('COMPOSED_CHILD_MISSING: {ref}')` when registry lookup fails (beta — see OQ-5).
  - Create `InstanceNode`s per `spec.composes[]` entry.
    **Done when:** `composed.test.ts` green with mock registry + child component id; documents beta status in thrown error message shape.

### Audit, idempotency, CI

- [x] **Step 18** — Implement `src/core/components/scaffold/auditRows.ts`:

  ```ts
  export function buildScaffoldAuditRows(
    componentSet: ComponentSetNode,
    expectedCount: number,
  ): AuditRuleResult[];
  ```

  **Rules (WO-022 ownership):**
  | ruleId | pass when |
  | ------ | --------- |
  | `comp/scaffold-variant-count` | `children.length === expectedCount` |
  | `comp/scaffold-naming` | every child `parseVariantName(name) !== null` |
  | `comp/scaffold-one-px-master` | `assertNoOnePxMaster(each child)` all null |

  Wire into `scaffold()` return value. **Do not** extend `runAudit('component')` in WO-022 — WO-023 adds binding rules (OQ-4).

  **Done when:** `auditRows.test.ts` passes/fails each rule deterministically.

- [x] **Step 19** — `tests/unit/core/components/scaffold/scaffold.integration.test.ts`:
  - Matrix AC: load `chip-button-3x2x2.v1.json` → `variantCount === 12`.
  - Assert sorted naming grammar on all children.
  - Assert `variantByKey` lookup by combo object works.

  **Done when:** test green in CI.

- [x] **Step 20** — `tests/unit/core/components/scaffold/idempotency.test.ts`:
  - First `scaffold()` → `replacedExisting === false`.
  - Second call same spec → `replacedExisting === true`; still exactly one ComponentSet on page; same `scaffoldId` pluginData; child count unchanged.

  **Done when:** test green; no duplicate `_ccVariantBuild` orphans.

- [x] **Step 21** — Export public API from `src/core/components/scaffold/index.ts` and `src/core/components/index.ts`. Ensure esbuild/tsconfig target remains ES2017 for plugin bundle. Grep gate: no `?.` or `??` under `src/core/components/scaffold/`.

  **Done when:** `npm run lint && npm run typecheck && npm test -- tests/unit/core/components/scaffold` all pass.

- [x] **Step 22** — Document pre-plan spikes in test skip markers:
  - SPK-022-1 covered by Step 19 integration test.
  - SPK-022-2 covered by chip.test.ts.
  - SPK-022-3 composed sandbox — `@figma/sandbox` optional describe block skipped in CI until registry fixture exists.
  - SPK-022-4 latency — defer to WO-027 VQA.

  **Done when:** CI green on default test run; sandbox tests documented in Notes.

---

## Build Agents

### Phase 1 (sequential — foundation + pipeline proof)

- `code-build` — **Steps 1–10:** Scaffold module tree, `types.ts`, `variantMatrix.ts`, `specAdapter.ts`, `context.ts`, test mocks, golden fixtures, `shared.ts`, `chip.ts`, `index.ts` `scaffold()` orchestration with combineAsVariants + grid layout.

### Phase 2 (parallel — after Phase 1 green)

- `code-build` — **Steps 11–12:** `surfaceStack.ts` + `field.ts` + tests/fixtures.
- `code-build` — **Steps 13–14:** `rowItem.ts` + `tiny.ts` + tests/fixtures.
- `code-build` — **Steps 15–16:** `container.ts` + `control.ts` + tests/fixtures.

### Phase 3 (sequential — composed + gates)

- `code-build` — **Steps 17–22:** `composed.ts`, `auditRows.ts`, integration + idempotency tests, barrel exports, CI gate, spike documentation.

---

## Dependencies & Tools

| Dependency               | Role in WO-022                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **WO-003**               | `ComponentSpecV1`, `RegistryV1`, `AuditRuleResult` from `@detroitlabs/fighub-contracts`                                          |
| **WO-008**               | Variables exist in file for optional manual smoke — not required for unit tests                                                  |
| **WO-014**               | `resizeThenApplySizing`, `createHugFrame`, `assertValidAxisAlign`, `assertNoOnePxMaster` from `@/core/canvas/helpers/autoLayout` |
| **WO-010**               | `AuditRuleResult` shape — full `runAudit('component')` extension deferred                                                        |
| **DesignOps lift**       | `cc-arch-*.js`, chip inline `buildVariant`, `02-archetype-routing.md`, `03-auto-layout-invariants.md`, `EXECUTOR.md` §6.2a       |
| **Vitest**               | Unit + integration tests                                                                                                         |
| **Figma Plugin Sandbox** | Manual SPK-022-3/4 validation (optional, non-blocking CI)                                                                        |

**Tools:** npm scripts `lint`, `typecheck`, `test`; no MCP/`use_figma` in CI.

---

## Open Questions

| ID   | Question                                             | Status                                                                                                                                              |
| ---- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-1 | Separate `displayTitle` from `spec.name`?            | **RESOLVED** — `ScaffoldOptions.displayTitle` optional; default `spec.name`                                                                         |
| OQ-2 | Missing archetype — fail or default chip?            | **RESOLVED** — default `chip` + `pluginLog` warn                                                                                                    |
| OQ-3 | Per-variant `style` fills without Mode A extraction? | **OPEN** — `specAdapter.buildStyleByVariantKey` FNV-1a defaults; validate in SPK-022-2 / chip test                                                  |
| OQ-4 | Extend `runAudit('component')` here or WO-023?       | **RESOLVED** — WO-022 returns inline `comp/scaffold-*` rows in `ScaffoldResult`; WO-023 extends `runAudit('component')` with `comp/binding-*` rules |
| OQ-5 | Composed GA vs beta when registry empty?             | **OPEN** — beta: throw `COMPOSED_CHILD_MISSING`; document in composed.test.ts                                                                       |

---

## Notes

### ES2017 / main-thread constraints

- All files under `src/core/components/scaffold/**` compile to **ES2017** (Figma QuickJS). Forbidden: optional chaining, nullish coalescing, `replaceAll`, top-level await in plugin entry path.
- Use explicit guards: `if (x !== undefined && x !== null)` instead of `??`.
- Logging: **`pluginLog('[scaffold]', event, payload)`** — not `console.debug` (production telemetry deferred per ticket).

### Idempotency pluginData contract

- Key `fighub.scaffoldId` — value `fighub:scaffold:v1:{spec.name}:{hashVariantMatrix}`.
- Key `fighub.specVersion` — value `'1'`.
- Replace semantics: remove prior ComponentSet + staging frames; no in-place patch (research D4).
- 100 kB pluginData limit per key — id string well under cap.

### Layer naming (WO-023 selector grammar)

Minimum paths all archetypes must preserve: `text/label`, `icon-slot/leading|trailing|center`, `state-layer/hover|pressed|focus`, `focus-ring`, `switch/thumb`.

### Pre-plan spikes

| Spike                               | Plan coverage              |
| ----------------------------------- | -------------------------- |
| SPK-022-1 (3×2×2 combineAsVariants) | Step 19 integration test   |
| SPK-022-2 (chip minimal)            | Step 9 chip.test.ts        |
| SPK-022-3 (composed + registry)     | Step 17 — sandbox optional |
| SPK-022-4 (latency 24-variant)      | WO-027 VQA                 |

### Bibliography

- Ticket: `./ticket.md`
- Research: `./research/component-scaffold-engine.md`
- Plan quality bar: `.github/templates/plan-quality-bar.md`
- Lift map: `Docs/lift-sources.md` §Component archetype bundles
- PRD: `Docs/PRD.md` §6.2 FR-SCAF-1..2, FR-SCAF-7

### Phase 3 build notes (2026-05-28)

- **`composed.ts`** — full port from `cc-arch-composed.js`; registry lookup via `ctx.registry`; throws `COMPOSED_CHILD_MISSING: {ref}` (beta).
- **`auditRows.ts`** — extracted from `index.ts`; rules `comp/scaffold-variant-count`, `comp/scaffold-naming`, `comp/scaffold-one-px-master`.
- **`ScaffoldBuildContext.registry`** — threaded from `ScaffoldOptions` in `projectBuildContext`.
- **Tests:** `composed.test.ts`, `auditRows.test.ts`, `idempotency.test.ts`; integration naming grammar tightened; spike markers SPK-022-1..4 in test files.
- **CI:** `npm test -- tests/unit/core/components/scaffold` → 39 passed, 1 skipped (SPK-022-3 sandbox).

### Stub Notes preserved from pre-plan (2026-05-28)

- **Scope boundary:** ComponentSet + variant cross-product only — no doc pipeline.
- **Single call:** Collapse legacy five MCP Step 6 bundles into one `scaffold()`.
- **Variant naming:** Alphabetical axis sort → `disabled=false, size=md, variant=primary`.
- **Bindings / properties:** Hex fallbacks; WO-023 binds; WO-024 adds properties.
