# Layout & Effects canvas builders — WO-013 research

> **Status:** ✅ Research complete — row-resolution contract, preview rules, WO-014 split, and bench plan locked for `/plan`.
> **Date:** 2026-05-27
> **Owner:** WO-013 (Sprint 3)
> **PRD anchors:** §6.1 FR-BOOT-7 (style-guide canvas pages), §7.3 `src/core/canvas/` layout
> **Primary lift:** `DesignOps-plugin/skills/create-design-system/canvas-templates/{layout.js,effects.js,_lib.js}` + runner fragments `_step15c-{layout,effects}-runner.fragment.js`
> **Upstream:** WO-008 push engine, WO-009 codeSyntax, WO-010 audit (`scope: 'canvas'` deferred), WO-014 auto-layout helpers

---

## Summary

Eight decisions unblock WO-013 `/plan`:

1. **Port modular sources, not bundles.** Readable inputs are `canvas-templates/layout.js` (~210 lines) and `effects.js` (~293 lines). Bundles (`step-15c-*.mcp.js`) inline `_lib.js` + runner glue — do not lift wholesale (`Docs/lift-sources.md` §0, §3).

2. **Split `_lib.js` vs page builders.** Shared table/page primitives (`buildTable`, `buildPageContent`, `makeBodyCell`, `rehugCell`, variable binding) land in **WO-014** `src/core/canvas/helpers/`. WO-013 owns **page-specific row builders + row-resolution from `TokensV1`**.

3. **Layout = dynamic group tables; no legacy grid page.** Legacy Step 15c Layout renders **one table per first-path-segment group** (`space`, `radius`, optional `padding`/`gap`/`border`) — not a separate grid specimen. Ticket AC “grids” maps to **spacing scale rows** (semantic aliases → primitive space steps). Do not invent a grid matrix unless product adds one later.

4. **Effects = two fixed tables** (`effects/shadows`, `effects/color`) with **Light/Dark dual previews** via `setExplicitVariableModeForCollection` on Effects + Theme collections.

5. **Row data is resolved in TypeScript from `TokensV1` + live Figma variables** after push — port runner-fragment logic (`_step15c-*-runner.fragment.js`) into pure resolvers; keep draw functions thin.

6. **Idempotency = full page redraw.** `buildPageContent()` deletes every non-header node and rebuilds `_PageContent` — safe to call repeatedly; no incremental patch.

7. **Bench target `<3 s` each** is conservative. WO-008 idempotent re-push = 490 ms for 400 vars; two-table layout/effects draws are DOM-light compared to variable push. Log `performance.now()` around each builder; store results beside this file.

8. **Audit scope `canvas` activates in Sprint 3** — wire WO-010 `runAudit({ scope: 'canvas' })` after style-guide draw; layout/effects-specific rules from `14-audit.md` § Canvas / Tables.

---

## Key Findings

### 1. File map — legacy → FigHub

| Legacy                                | Lines | FigHub target                           | Notes                          |
| ------------------------------------- | ----- | ---------------------------------------- | ------------------------------ |
| `layout.js`                           | ~210  | `src/core/canvas/layout.ts`              | `buildLayoutPage(ctx)` export  |
| `effects.js`                          | ~293  | `src/core/canvas/effects.ts`             | `buildEffectsPage(ctx)` export |
| `_step15c-layout-runner.fragment.js`  | ~142  | `src/core/canvas/resolveLayoutRows.ts`   | Pure row resolution            |
| `_step15c-effects-runner.fragment.js` | ~195  | `src/core/canvas/resolveEffectsRows.ts`  | Pure row resolution            |
| `_lib.js` (shared)                    | ~724  | `src/core/canvas/helpers/*` (**WO-014**) | Do not duplicate in WO-013     |

Reference data: `DesignOps-plugin/skills/create-design-system/data/layout-effects.json` — canonical token paths for fixtures/tests.

### 2. Layout builder — spacing, radius, previews

**Collection:** Layout · single mode `Default` (`TokensV1` + WO-008).

**Row resolution** (from layout runner):

- Scope to Layout collection FLOAT vars only (registry id → exact name → fuzzy → float-dominant heuristic — reuse WO-008 collection resolver pattern).
- Group by **first slash segment** (`space/*`, `radius/*`, …).
- Sort rows within group by resolved px ascending.
- `radius/full` or px ≥ 9999 → display `∞`, preview uses `cornerRadius: 32` (pill cap).

**Known group order** (`LAYOUT_KNOWN_ORDER` in `layout.js`):

`space` → `spacing` → `padding` → `radius` → `corner` → `border` → `gap` → unknown groups alphabetically.

**Table manifest per group:**

| Field    | Spacing groups          | Radius groups          |
| -------- | ----------------------- | ---------------------- |
| slug     | `layout/{key}`          | `layout/{key}`         |
| columns  | 7 × 1640 spec           | same                   |
| buildRow | `buildLayoutSpacingRow` | `buildLayoutRadiusRow` |

**Column spec** (`10-column-spec.md` ↳ Layout) — sum **1640**:

| Col                 | Width           | Content                                     |
| ------------------- | --------------- | ------------------------------------------- |
| TOKEN               | 280             | slash path                                  |
| VALUE               | 100             | `{resolvedPx}px` or `∞`                     |
| ALIAS →             | 280             | primitive alias path                        |
| PREVIEW             | 240             | bar or square                               |
| WEB / ANDROID / iOS | 320 / 220 / 200 | from variable `codeSyntax` or WO-009 derive |

**Preview cells (critical gotchas):**

- PREVIEW cells flip to `layoutMode: 'HORIZONTAL'` — must re-assert `primaryAxisSizingMode: 'FIXED'` + `counterAxisSizingMode: 'AUTO'` **immediately** after flip (`00-gotchas.md` §0.1.H).
- **Spacing bar:** width = `min(resolvedPx, colWidth - 40)`, height 16, `cornerRadius: 4`, fill bound to `color/primary/200`.
- **Radius square:** 64×64, `cornerRadius = min(resolvedPx, 32)`, stroke `color/border/subtle`, fill `color/neutral/100`.

**“Grids” clarification:** PRD FR-BOOT-7 says “layout grids” generically. Legacy Step 15c has **no grid matrix table** — only alias tables with spacing-bar previews. Foundations spacing tokens (`space/xs` … `space/4xl`) are the grid-gap scale. WO-013 AC “spacing scale, radii, grids” = **spacing + radius tables**; defer a dedicated grid specimen unless product revises scope.

### 3. Effects builder — shadows, blur, Light/Dark

**Collection:** Effects · modes `Light` / `Dark`. Only `shadow/color` alpha differs across modes per `layout-effects.json`.

**Two tables (fixed, not dynamic groups):**

#### `effects/shadows` — 5 FLOAT blur tiers

| Col                 | Width           | Content                               |
| ------------------- | --------------- | ------------------------------------- |
| TOKEN               | 140             | e.g. `shadow/sm/blur`                 |
| LIGHT               | 180             | shadow preview card (Light modes)     |
| DARK                | 180             | shadow preview card (Dark modes)      |
| BLUR                | 120             | `{blurPx}px` (resolved in Light mode) |
| ALIAS →             | 200             | elevation primitive path              |
| WEB / ANDROID / iOS | 300 / 260 / 260 | codeSyntax                            |

Tier assignment: sort FLOAT vars by name; map index → `sm | md | lg | xl | 2xl` (`TIER_NAMES` in effects runner).

#### `effects/color` — 1 COLOR row

| Col                 | Width           |
| ------------------- | --------------- |
| TOKEN               | 320             |
| LIGHT / DARK        | 220 each        |
| WEB / ANDROID / iOS | 340 / 280 / 260 |

LIGHT/DARK use `makeThemeModeColumn` with **Effects mode override** on the preview chip (bound to `shadow/color` variable).

**Shadow preview card** (`makeShadowPreviewCell` in `effects.js`):

- 88×88 card, `cornerRadius: 8`, fill bound to Theme `color/background/default`.
- `effectStyleId` → local style `Effect/shadow-{tier}` (must exist — published at variable push / Step 11 close).
- Wrapper cell tinted with `color/background/container-highest` or `variant` so **Light column white card stays visible** against white table body.
- Per card: `setExplicitVariableModeForCollection(effectsCollectionId, light|darkModeId)` + same for Theme collection.

**Drift — gold spec vs shipped JS:** `10-column-spec.md` describes a richer preview stack (`doc/effect-preview-mat`, 96×96 mat, 180×96 wrapper). Current `effects.js` uses a **simpler** 88×88 card without mat frames. **Recommendation:** ship the `effects.js` behavior first (proven in production); add mat/wrapper upgrade as optional polish if VQA fails contrast checks.

**Blur previews:** Blur is **not** a separate visual — it appears as numeric BLUR column + drop shadow on preview card via `Effect/shadow-{tier}` style (style composes blur + shadow/color from variables).

### 4. Light / Dark mode handling

| Page            | Mode strategy                                                             |
| --------------- | ------------------------------------------------------------------------- |
| Layout          | None — single Default mode; no Light/Dark columns                         |
| Effects shadows | Dual preview columns; card overrides Effects + Theme modes independently  |
| Effects color   | Dual columns; chip + rgba text per mode; Effects mode override on preview |

**Ctx fields required for effects** (extend `LayoutEffectsCanvasContext`):

```ts
effectsCollectionId: string;
effectsLightModeId: string;
effectsDarkModeId: string;
themeCollectionId: string | null;
themeLightModeId: string | null;
themeDarkModeId: string | null;
```

Resolve from live collections after WO-008 push (same heuristics as effects runner).

### 5. WO-014 helper dependency

WO-013 **must import** from WO-014 — no inline `resize()` or hand-rolled cell sizing:

| Helper (WO-014)                                          | Used by layout/effects                        |
| -------------------------------------------------------- | --------------------------------------------- |
| `buildPageContent(page)`                                 | Both — idempotent wipe + `_PageContent` frame |
| `buildTable(manifest, …)`                                | Both — detached-build C1 pattern              |
| `makeBodyCell` / `rehugCell`                             | All row builders                              |
| `makeBodyRow` / `rehugRow`                               | All data rows                                 |
| `makeText`                                               | TOKEN, VALUE, codeSyntax columns              |
| `makeHeaderCell`                                         | Via `buildTable`                              |
| `bindPaintToVar` / `bindStrokeToVar`                     | Preview fills                                 |
| `makeThemeModeColumn`                                    | Effects shadow/color Light/Dark               |
| `columnSpec.layoutSpacing` / `columnSpec.effectsShadows` | From `10-column-spec.md`                      |

**Build order:** WO-014 Phase 1 should land shared helpers before WO-013 row builders, or WO-013 stubs imports behind a minimal WO-014 MVP (`buildTable` + `makeBodyCell` subset).

### 6. TokensV1 consumption

**Input:** canonical `TokensV1` document (post-adapter) + post-push Figma state.

**Resolver pattern:**

```ts
// resolveLayoutRows.ts — pure, unit-testable
export function resolveLayoutRows(
  tokens: TokensV1,
  liveVars: FigmaVariableSnapshot,
): Record<string, LayoutRow[]>;

// resolveEffectsRows.ts
export function resolveEffectsRows(
  tokens: TokensV1,
  liveVars: FigmaVariableSnapshot,
): { shadows: ShadowRow[]; shadowColor: ShadowColorRow[] };
```

- Filter `tokens.tokens` where `collection === 'layout' | 'effects'`.
- Resolve alias chains (max depth 10) matching runner logic.
- Prefer live variable `codeSyntax` when present; fallback to WO-009 `deriveCodeSyntax(token)`.
- Layout aliases: read `valuesByMode.Default` alias target name.
- Effects blur aliases: identical Light/Dark; color: resolve per mode.

**Page discovery:** `findDesignOpsPage('layout' | 'effects')` — port slug + legacy name fallbacks (`↳ Layout`, `↳ Effects`). FigHub should write page slugs at bootstrap (Sprint 4); until then, keep legacy regex fallbacks.

### 7. Idempotency

| Mechanism          | Behavior                                                                      |
| ------------------ | ----------------------------------------------------------------------------- |
| `buildPageContent` | Removes all page children except `_Header`; creates fresh `_PageContent`      |
| Table slugs        | Stable names `doc/table-group/{slug}` — full replace, not merge               |
| Re-run safety      | Second call produces identical structure; no duplicate headers                |
| Variable map       | `ensureLocalVariableMapOnCtx` always rebuilds from `getLocalVariablesAsync()` |

No snapshot diff for canvas in Sprint 3 — idempotency is **destructive redraw**, same as legacy.

### 8. Tests

**Unit (Vitest, no Figma):**

| Module                    | Cases                                                                      |
| ------------------------- | -------------------------------------------------------------------------- |
| `resolveLayoutRows`       | group by segment; sort by px; pill/`full` → 9999; alias path extraction    |
| `resolveEffectsRows`      | 5-tier ordering; blur px resolution; shadow/color hex + rgba Light vs Dark |
| `columnSpec`              | layout + effects column widths sum to 1640                                 |
| Row builders (mock nodes) | PREVIEW HORIZONTAL sizing re-assert; radius ∞ label                        |

**Fixtures:** copy `layout-effects.json` + `foundations-minimal.v1.json` slices into `src/core/canvas/__fixtures__/`.

**Integration (Figma sandbox `cVdPraIafWFBRZnzMPhtrW`):**

- Push foundations-minimal → build layout → build effects → re-build (idempotent) → assert table group counts.
- Manual VQA: spacing bar widths monotonic; shadow Light ≠ Dark visibility.

### 9. Benchmark

**AC:** each builder `<3 s` on Foundations-scale file.

**Method** (mirror WO-008 `push-bench-result.md`):

```ts
const t0 = performance.now();
await buildLayoutPage(ctx);
const layoutMs = performance.now() - t0;
pluginLog('bench/layout', { layoutMs, tableGroups });
```

**Expectation:** ~15 layout rows + ~6 effects rows → **<500 ms** typical (DOM ops only; no variable creation). `<3 s` is headroom for slow files. Log to `research/layout-effects-bench-result.md` during `/build` VQA.

**Pre-requisites on file:** variables pushed (WO-008), local `Effect/shadow-{tier}` styles exist (push close / effect-style step — may need WO-008 extension or bootstrap preflight).

### 10. Audit integration (WO-010)

Sprint 2 audit is `scope: 'variables'` only. After layout/effects draw, invoke:

```ts
runAudit({ scope: 'canvas', operation: 'build-style-guide', pages: ['layout', 'effects'] });
```

Relevant `14-audit.md` rules for WO-013:

- `_PageContent` Hug height, not fixed clip height
- Header cells HORIZONTAL + FIXED/FIXED + explicit height
- Body row `minHeight` ≥ 56, counter-axis AUTO
- `doc/table/{slug}` gets single `Effect/shadow-sm` (except token-overview platform-mapping)
- Effects previews: both Light and Dark columns populated when Effects collection has two modes

### 11. Module layout (recommended)

```
src/core/canvas/
  layout.ts                 # buildLayoutPage
  effects.ts                # buildEffectsPage
  resolveLayoutRows.ts      # pure
  resolveEffectsRows.ts     # pure
  types.ts                  # LayoutRow, ShadowRow, CanvasBuildContext
  __fixtures__/
  layout.test.ts
  effects.test.ts
  resolveLayoutRows.test.ts
  resolveEffectsRows.test.ts
helpers/                    # WO-014
  autoLayout.ts
  buildTable.ts
  buildPageContent.ts
  columnSpec.ts
  ...
```

**Public API:**

```ts
export async function buildLayoutPage(input: {
  tokens: TokensV1;
  pageId?: string;
}): Promise<CanvasBuildResult>;

export async function buildEffectsPage(input: {
  tokens: TokensV1;
  pageId?: string;
}): Promise<CanvasBuildResult>;
```

`CanvasBuildResult`: `{ pageId, tableGroups, durationMs, audit?: AuditReportV1 }`.

---

## Recommendations

1. **Sequence WO-014 helpers before WO-013 row builders** — at minimum `buildTable`, `buildPageContent`, `makeBodyCell`, `columnSpec`.

2. **Do not port runner fragments as runtime JS** — translate to typed resolvers + tests.

3. **Match `layout.js` / `effects.js` preview fidelity first** — upgrade to `10-column-spec.md` mat treatment only if VQA fails.

4. **Clarify ticket AC:** “grids” = spacing scale table, not a separate grid specimen.

5. **Ensure Effect styles exist before effects draw** — document dependency on push pipeline publishing `Effect/shadow-{tier}` (or add preflight guard with clear audit failure).

6. **Use `pluginLog()` not `console.debug`** on main thread (`memory.md` do-not-repeat).

7. **Bench during `/build` VQA** — write `research/layout-effects-bench-result.md` with measured ms.

---

## Open Questions

| #   | Question                                                                                | Proposed default                                            |
| --- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Ship simple shadow preview (`effects.js`) or full mat stack (`10-column-spec.md`)?      | Simple first                                                |
| 2   | Support extra layout groups (`padding`, `gap`, `border`) when present in custom tokens? | Yes — dynamic groups already in `layout.js`                 |
| 3   | Who publishes `Effect/shadow-*` styles — WO-008 push close or WO-013 preflight?         | WO-008 push engine extension (Sprint 3 spike)               |
| 4   | Parallel WO-011/012/013 builds sharing WO-014?                                          | WO-014 Phase 1 is shared gate; page builders parallel after |

---

## References

- `DesignOps-plugin/skills/create-design-system/canvas-templates/layout.js`
- `DesignOps-plugin/skills/create-design-system/canvas-templates/effects.js`
- `DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js`
- `DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/_step15c-layout-runner.fragment.js`
- `DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/_step15c-effects-runner.fragment.js`
- `DesignOps-plugin/skills/create-design-system/data/layout-effects.json`
- `DesignOps-plugin/skills/create-design-system/conventions/10-column-spec.md` (↳ Layout, ↳ Effects)
- `DesignOps-plugin/skills/create-design-system/conventions/00-gotchas.md` §0.1.H, §0.4, §0.9
- `DesignOps-plugin/skills/create-design-system/phases/07-steps15a-15c.md`
- `Docs/lift-sources.md` §3 (canvas bundle map)
- `packages/contracts/src/tokens.v1.ts`
- WO-008 `research/push-bench-result.md` (bench pattern)
- WO-010 `research/post-push-audit-rules.md` (`scope: 'canvas'` deferral)
