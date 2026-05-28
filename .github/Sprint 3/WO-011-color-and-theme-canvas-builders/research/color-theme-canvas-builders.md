# Color & Theme Canvas Builders — Research (WO-011)

> **Status:** ✅ Research complete — module split, input contract, and bench strategy locked for `/plan`.
> **Date:** 2026-05-27
> **Owner:** WO-011 (Sprint 3)
> **PRD anchors:** §6.1 FR-BOOT-7, §7.3 (`src/core/canvas/`), §12 phasing (Sprint 3 style-guide builders)
> **Upstream:** [WO-055 canonical token model](../../Sprint%201/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md), [WO-008 push engine](../../Sprint%202/WO-008-variable-collection-push-engine-5-collections-modes/research/variable-push-engine-design.md), [WO-010 audit rules](../../Sprint%202/WO-010-audit-reporter-post-build-validation/research/post-push-audit-rules.md)

---

## Summary

WO-011 ports **Step 15a (Primitives page)** and **Step 15b (Theme page)** canvas-table builders from DesignOps-plugin into FigHub TypeScript. Per `Docs/lift-sources.md` §0, **`step-15a-primitives.mcp.js` and `step-15b-theme.mcp.js` are CANVAS builders — they read variables that already exist and draw style-guide tables; they do NOT create variables.** Variable creation remains WO-008.

**Locked decisions:**

1. **Readable lift sources:** Port from modular `canvas-templates/{_lib,primitives,theme}.js` — **not** the bundled `.mcp.js` files. Delete-equivalent runner glue (`bundles/_step15a-runner.fragment.js`, `_step15b-runner.fragment.js`) is **row-projection + page-resolution logic** to re-home in TS, not MCP transport.
2. **Module split:** Shared table/page/variable helpers under `src/core/canvas/lib/`; page builders at `colorTables.ts` (full 15a) and `themeTables.ts` (15b). WO-014 auto-layout gotchas (`resizeWithAutoLayout`, `columnSpec`, `buildOrder`) are **consumers**, not duplicates of `_lib.js`.
3. **Input contract:** Public API accepts `TokensV1` + target page slug/id. Row DTOs are **projected from `TokensV1` via pure functions**; paint binding uses **live Figma variables** rebuilt by `ensureLocalVariableMap` after WO-008 push.
4. **Idempotency:** Full page redraw — `buildPageContent` deletes every non-header node and rebuilds `_PageContent` from scratch (same as legacy). No slug-level merge/patch.
5. **Bench target:** Each builder **< 3 s** for ~100 swatches (ticket AC). Separate from WO-008 push bench; canvas + font loading dominate full bootstrap per WO-008 research §dominant risk.
6. **Audit:** WO-010 `scope: 'canvas'` is **not implemented yet** — builders should emit node names/hierarchy matching legacy so Sprint 3 canvas audit rules (`14-audit.md` Canvas/Tables section) can plug in later.

---

## Key Findings

### A. Corrected lift-source pointer (§0 drift)

| Ticket / plan text                                    | Reality                                                                             | Correct source                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Primary source = `bundles/step-15a-primitives.mcp.js` | Bundle = `_lib.js` + `primitives.js` + runner fragment (~57 KB). Canvas only.       | `canvas-templates/primitives.js` + `_lib.js`; runner logic → TS row projectors |
| Same for 15b                                          | Bundle = `_lib.js` + `theme.js` + runner (~50 KB).                                  | `canvas-templates/theme.js` + `_lib.js`; runner logic → TS row projectors      |
| "Variable push IS in 15a"                             | **False.** 15a calls `ensureLocalVariableMapOnCtx` then `setBoundVariableForPaint`. | WO-008 `src/core/variables/push.ts`                                            |

Bundle size reference (`Docs/lift-sources.md` §3):

| Legacy bundle | Lines | Bytes  | FigHub target                   |
| ------------- | ----- | ------ | -------------------------------- |
| step-15a      | 1,314 | 57,033 | `colorTables.ts` + shared `lib/` |
| step-15b      | 1,163 | 49,916 | `themeTables.ts` + shared `lib/` |

### B. Legacy architecture (what to port vs delete)

**Port (from `_lib.js`):**

| Helper                                                    | Role                                                                                       | FigHub target                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `ensureLocalVariableMapOnCtx`                             | Rebuild `path → variableId` from `getLocalVariablesAsync()` — ignores host-injected maps   | `lib/variables.ts` → `ensureLocalVariableMap()`                                          |
| `bindPaintToVar` / `bindStrokeToVar`                      | §0.7: clone paint → `setBoundVariableForPaint` → reassign fills/strokes                    | `lib/variables.ts`                                                                       |
| `buildPageContent`                                        | Delete non-header nodes; create `_PageContent` frame at y=320                              | `lib/pages.ts`                                                                           |
| `findDesignOpsPage`                                       | Resolve page by shared slug `primitives` / `theme`, then legacy names                      | `lib/pages.ts` (FigHub namespace TBD — see Open Questions)                              |
| `buildTable`                                              | Detached-build table (C1): group → table → header/body → single append                     | `lib/table.ts`                                                                           |
| `makeThemeModeColumn`                                     | Light/Dark swatch + hex (+ optional HSL stack) with `setExplicitVariableModeForCollection` | `lib/themeCells.ts` or inline in `themeTables.ts`                                        |
| `makeBodyCell`, `makeHeaderCell`, `rehugCell`, `rehugRow` | Cell recipes + §0.1 hug rules                                                              | `lib/cells.ts` — **delegate sizing to WO-014** where applicable                          |
| `ensureCanonicalMapOnCtx` / `resolveCanonicalPath`        | Chrome-variable alias fallback for non-standard file layouts                               | `lib/variables.ts` — optional v1; full Foundations files use canonical paths post-WO-008 |

**Port (from `primitives.js`):**

- Color ramp tables (dynamic ramp discovery, `RAMP_ORDER`, column spec 1640 px total)
- Optional tables when rows present: `space`, `radius`, `elevation`, `typeface`, `fontWeight`
- Row builders: `buildColorRow`, `buildSpaceRow`, `buildRadiusRow`, `buildMonoRow`, `buildTypefaceRow`
- C2 pattern: suspend `_PageContent` auto-layout (`layoutMode = 'NONE'`) during bulk insert, restore `VERTICAL` + `HUG` after

**Port (from `theme.js`):**

- Seven+ semantic group tables (`background`, `border`, `primary`, …) — dynamic keys with `THEME_GROUP_KNOWN_ORDER`
- `buildThemeRow` with LIGHT/DARK preview columns, ALIAS → column, platform codeSyntax columns
- `THEME_COLUMNS` width spec (sums to 1640)

**Re-home from runner fragments (NOT port as files):**

| Runner logic                                 | Purpose                                                 | FigHub target                                                                         |
| -------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `_step15a-runner` collection finder          | Fuzzy match Primitives collection                       | Use WO-008 canonical names first; fuzzy fallback for foreign files                     |
| `_step15a-runner` ramp discovery             | COLOR vars with numeric last segment → ramp key         | `projectColorRampsFromTokens()` + optional `discoverColorRampsFromFigma()`             |
| `_step15a-runner` FLOAT categorization       | Regex buckets: space, radius, elevation, weight         | `projectPrimitiveFloatRowsFromTokens()`                                                |
| `_step15b-runner` theme grouping             | Group by `color/{role}/…` second segment                | `projectThemeGroupsFromTokens()`                                                       |
| `_step15b-runner` `resolveColorFormats`      | Hex + HSL for alpha tokens                              | `colorFormats.ts` pure helpers                                                         |
| `_step15b-runner` `ensureCodeSyntax` healing | Patch missing codeSyntax on raw literals / state tokens | **Prefer WO-009 at push time**; canvas may log warning if missing (see Open Questions) |

**Delete (MCP glue only):** `bundles/_step15*-runner.fragment.js` return payloads, `canvas-bundle-runner` skill, payload QA scripts.

### C. Module split recommendation

```
src/core/canvas/
├── lib/
│   ├── variables.ts      # ensureLocalVariableMap, bindPaintToVar, resolvePath, canonical map
│   ├── pages.ts          # findStyleGuidePage, buildPageContent, isHeaderNode
│   ├── table.ts          # buildTable (uses WO-014 columnSpec + buildOrder when available)
│   ├── cells.ts          # makeBodyCell, makeHeaderCell, makeText, rehug*
│   ├── fonts.ts          # loadFonts, loadFontsForTextStyles
│   └── colorFormats.ts   # colorToHex, colorToHsl, hexToRgb (0..1 RGBA)
├── projectRows/
│   ├── primitivesRows.ts # TokensV1 → ColorRampRows, SpaceRows, …
│   └── themeRows.ts      # TokensV1 → ThemeGroupRows (alias + per-mode hex/hsl)
├── colorTables.ts        # buildPrimitivesPage(tokens, pageTarget) — Step 15a orchestrator
├── themeTables.ts        # buildThemePage(tokens, pageTarget) — Step 15b orchestrator
├── bench.ts              # runCanvasBench (mirrors variables/bench.ts)
└── index.ts              # re-exports
```

**Naming note:** `colorTables.ts` is the lift target for the **entire** Primitives page (color ramps + space/radius/elevation/typeface/font-weight), not color-only — matches `Docs/lift-sources.md` §3 mapping.

**WO-014 boundary:**

| WO-014 module           | Used by WO-011 for                                                        |
| ----------------------- | ------------------------------------------------------------------------- |
| `helpers/autoLayout.ts` | `resizeWithAutoLayout`, counter-axis AUTO, §0.10 resize-then-sizing order |
| `helpers/columnSpec.ts` | Locked column widths from `10-column-spec.md` (color + theme tables)      |
| `helpers/buildOrder.ts` | Header-before-body, detached-build append order                           |

WO-011 **must not** re-implement §0.10 gotchas inline once WO-014 lands. If WO-014 is incomplete at build time, stub minimal `resizeWithAutoLayout` in `lib/cells.ts` with a `// WO-014: migrate` comment.

### D. TokensV1 input shape & row projection

**Public builder signatures (proposed):**

```typescript
interface CanvasPageTarget {
  pageSlug: 'primitives' | 'theme';
  // Optional explicit page id — if omitted, findStyleGuidePage(pageSlug)
}

interface PrimitivesBuildResult {
  tableCount: number;
  swatchCount: number;
  durationMs: number;
}

async function buildPrimitivesPage(
  tokens: TokensV1,
  target: CanvasPageTarget,
): Promise<PrimitivesBuildResult>;

async function buildThemePage(
  tokens: TokensV1,
  target: CanvasPageTarget,
): Promise<PrimitivesBuildResult>;
```

**Row DTOs** (match legacy `ctx.rows` shapes from template headers):

```typescript
// primitives — from primitives.js header comment
interface ColorRampRow {
  tokenPath: string; // e.g. 'color/primary/500'
  resolvedHex: string;
  codeSyntax: { WEB: string; ANDROID: string; iOS: string };
}
interface ThemeRow {
  tokenPath: string;
  resolvedHexLight: string;
  resolvedHexDark: string;
  resolvedHslLight?: string | null; // alpha tokens only
  resolvedHslDark?: string | null;
  aliasLight: string | null;
  aliasDark: string | null;
  codeSyntax: { WEB: string; ANDROID: string; iOS: string };
  themeVariableId?: string; // override; default from variableMap[tokenPath]
}
```

**Projection pipeline:**

1. Filter `tokens.tokens` by `collection === 'primitives' | 'theme'`.
2. Run existing `resolveTokens(tokens)` (`src/core/variables/resolveTokens.ts`) for alias-expanded literals.
3. **Color ramps:** COLOR tokens whose name matches `color/{ramp}/{numericStop}` → group by ramp key; sort stops numerically; `RAMP_ORDER` for table sequence.
4. **Primitive floats:** FLOAT tokens bucketed by path prefix (`space/`, `corner/`, `elevation/`, `font/weight/`).
5. **Primitive strings:** STRING tokens matching typeface paths (`typeface/display`, `typeface/body`).
6. **Theme groups:** Theme COLOR tokens grouped by second path segment after `color/` (same as 15b runner).
7. **Alias columns:** For theme rows, if `valuesByMode.Light|Dark` is `TokenAliasRef`, emit `aliasLight|Dark` as target `name` (full slash path).
8. **Hex/HSL:** Convert resolved `ColorValue` → `#RRGGBB` and optional CSS HSL when `a < 1`.

**Dual source of truth at runtime:**

| Concern                                   | Source                                                         |
| ----------------------------------------- | -------------------------------------------------------------- | ------------ |
| Cell text (hex, codeSyntax, alias labels) | Projected from `TokensV1` (deterministic, testable)            |
| Swatch paint binding                      | Live Figma variable IDs via `ensureLocalVariableMap()`         |
| Theme mode preview                        | `setExplicitVariableModeForCollection(themeCollectionId, light | darkModeId)` |

If a token exists in `TokensV1` but not in Figma (push skipped/failed), fall back to hardcoded hex fill (legacy behavior) and collect a warning for audit.

### E. Variable binding approach

Legacy §0.7 pattern (must preserve):

```javascript
// bindPaintToVar — clone existing paint, bind, reassign array
const bound = figma.variables.setBoundVariableForPaint(base, 'color', variable);
node.fills = [bound];
```

**Chrome variables** (table borders, backgrounds, text fills) resolved by canonical paths:

- `color/border/subtle`, `color/background/default`, `color/background/variant`, `color/background/content`, `color/background/content-muted`, `color/neutral/100`, `color/primary/200`

**Swatch binding:** Prefer variable bind when `variableMap[tokenPath]` exists; else `hexToRgb(resolvedHex)` fallback.

**Theme previews:** Rectangle bound to theme variable + preview frame gets explicit mode via `setExplicitVariableModeForCollection` so Light/Dark columns show correct mode without duplicating nodes per collection mode.

**Primitives page mode:** Single Default mode on Primitives collection — no explicit mode override needed for color swatches.

### F. Page targets

| Builder       | Shared slug  | Legacy exact name | Legacy regex     |
| ------------- | ------------ | ----------------- | ---------------- |
| `colorTables` | `primitives` | `↳ Primitives`    | `/primitives/i`  |
| `themeTables` | `theme`      | `↳ Theme`         | `/^↳?\s*theme/i` |

Legacy uses `getSharedPluginData('labs.designops', 'pageSlug')` on pages. FigHub should read the same slug namespace until Sprint 4 foundations shell defines a FigHub-native registry (`foundations-shell-and-preflight.md`).

**Precondition:** Target page exists with `_Header` (or `/^header/i`) child. `buildPageContent` preserves header, wipes everything else.

**Collection IDs for theme builder:** Pass `themeCollectionId`, `themeLightModeId`, `themeDarkModeId` from WO-008 collection snapshot or resolve by display name `Theme` + mode names `Light`/`Dark`.

### G. Idempotency strategy

Legacy idempotency is **destructive redraw**, not incremental update:

1. `buildPageContent(page)` → remove all children except header nodes.
2. Create fresh `_PageContent` frame.
3. Append all table groups anew.

**Implications for FigHub:**

- Re-running `buildPrimitivesPage` / `buildThemePage` is safe — output replaces prior tables.
- No need to diff `doc/table-group/{slug}` nodes by slug (legacy doesn't).
- Snapshot/drift (FR-DRIFT-1) is a separate concern — canvas builders don't write pluginData in 15a/15b.

### H. Dependency on WO-008 and WO-014

| Dependency | Requirement                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WO-008** | Variables must be pushed before canvas build. Builders assume canonical collection display names and slash-separated variable paths.                                   |
| **WO-014** | Auto-layout helpers + column spec + build order. WO-011 build should either wait for WO-014 or ship with thin stubs migrated in a follow-up commit on the same sprint. |

**WO-010 audit:** Sprint 2 implements `scope: 'variables'` only. Canvas table rules (`14-audit.md` → no 1px masters, header≠body, bound swatches) deferred to `scope: 'canvas'`. WO-011 should structure output to match legacy node names (`doc/table-group/…`, `doc/table/…/header|body`, `doc/theme-preview/light|dark`) so canvas audit rules can be added without builder rewrites.

### I. Bench approach (~100 swatches, < 3 s)

**Pattern:** Mirror `src/core/variables/bench.ts`:

```typescript
// src/core/canvas/bench.ts
export async function runCanvasBench(
  label: string,
  buildFn: () => Promise<{ swatchCount: number }>,
): Promise<{ totalDurationMs: number; swatchCount: number }>;
```

**Fixture strategy:**

1. Generate ~100-color `TokensV1` fixture (extend WO-005 FNV-1a pattern or 5 ramps × 20 stops) under `src/core/canvas/__fixtures__/primitives-100.v1.json`.
2. Push fixture via WO-008 (setup step, not timed).
3. Time **canvas build only** — exclude push and font cold-load if repeating runs (document first-run vs warm-run separately).
4. Log via `pluginLog()` on main thread (not `console.debug` — Figma sandbox lacks it).

**Budget rationale:** WO-008 idempotent re-push = 490 ms for 400 vars. Canvas creates ~6–10 nodes per swatch row (cell frames, text, rectangle) → ~600–1000 node ops for 100 swatches. At WO-005 Plugin API rates (~0.3–0.5 ms per light call), 100 swatches should land **well under 3 s** if C2 bulk-insert pattern is preserved (suspend parent auto-layout during insert). **Risk:** `loadFontAsync` for Inter + Roboto Mono + SF Mono on cold start — preload once per session.

**Acceptance metric:** p50 **< 3000 ms** per builder on ~100 swatches in Plugin Sandbox (`file_key=cVdPraIafWFBRZnzMPhtrW`), warm font cache.

### J. Test strategy

| Layer               | What                                                                                      | How                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Pure projection** | `projectColorRampsFromTokens`, `projectThemeGroupsFromTokens`, `colorToHex`, `colorToHsl` | Vitest + `foundations-minimal.v1.json` + generated 100-token fixture       |
| **Row builders**    | Cell content choices given mock row DTO                                                   | Vitest with figma mock (`vitest-figma` or existing project mock pattern)   |
| **Integration**     | Full page build node counts, table slugs                                                  | Figma manual / dev UI button (Sprint 3 scratch — not WO-015 Bootstrap tab) |
| **Visual**          | Match DesignOps reference output                                                          | Figma VQA against Plugin Sandbox after push + build                        |
| **Perf**            | < 3 s bench                                                                               | `runCanvasBench` logged to `research/canvas-bench-result.md` at VQA        |

**Not in WO-011:** `scope: 'canvas'` audit rule implementation (separate ticket or WO-010 extension).

---

## Recommendations

1. **Correct ticket lift pointers** to modular `canvas-templates/{_lib,primitives,theme}.js`; mark `.mcp.js` bundles as wire-format reference only.
2. **Extract `_lib.js` first** into `src/core/canvas/lib/` before page builders — single port surface shared with WO-012/013.
3. **Implement pure row projectors** (`projectRows/`) with Vitest coverage against `TokensV1` fixtures — keeps Figma sandbox tests minimal.
4. **Coordinate with WO-014** — plan/build order: WO-014 Phase 1 helpers before WO-011 table drawing, or shared sprint branch with explicit stub migration task.
5. **Public API takes `TokensV1`** for deterministic text/labels; always call `ensureLocalVariableMap()` at build start for bindings.
6. **Preserve legacy idempotency** (full page wipe + redraw) — do not invent slug-diff patching.
7. **Add `runCanvasBench`** parallel to push bench; record results in ticket research at VQA.
8. **Defer `ensureCodeSyntax` healing** to WO-009 push path; canvas logs missing codeSyntax as warnings, does not mutate variables unless product explicitly requires parity with legacy runner.
9. **Use `pluginLog()`** for main-thread bench/event logging per memory.md.

---

## Open Questions

1. **WO-014 sequencing:** Can WO-011 `/build` start before WO-014 lands, or is WO-014 a hard gate? Recommendation: soft gate — stubs OK if migrated before VQA.
2. **FigHub page slug namespace:** Keep `labs.designops` shared plugin data for Sprint 3 compatibility, or introduce `fighub.pageSlug` now? Recommendation: read legacy slug first, write both when creating pages (Sprint 4 shell owns final call).
3. **Non-color primitive tables in WO-011:** Ticket name says "color and theme" but 15a includes space/radius/elevation/typeface/font-weight. Recommendation: include all 15a tables in `colorTables.ts` per lift-sources §3 — out-of-scope only typography/layout/effects/overview (WO-012/013).
4. **Runner `ensureCodeSyntax` side effects:** Legacy 15b runner mutates variables missing codeSyntax. FigHub push (WO-009) should make this redundant — confirm no canvas-time mutation unless audit finds gaps.
5. **Canvas audit scope:** New WO-010 rules ticket vs fold into WO-011 acceptance — recommend separate thin ticket for `scope: 'canvas'` after builders land.
