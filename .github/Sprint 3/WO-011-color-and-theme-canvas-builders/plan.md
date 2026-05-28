# Plan — WO-011: Color & Theme canvas builders

## Approach

Port Step **15a (Primitives page)** and **15b (Theme page)** from modular DesignOps sources (`primitives.js`, `theme.js`, shared `_lib.js` glue) into FigHub TypeScript. **Variable push is WO-008 — these builders only read/bind existing variables and draw tables.** Split: `lib/` (shared Figma draw helpers reused by WO-012/013) → `projectRows/` (pure `TokensV1` projectors, Vitest-only) → `colorTables.ts` / `themeTables.ts` (page orchestrators). All cell geometry via **WO-014 imports only** — grep gate: zero `node.resize(` in builder files except inside WO-014 re-exports. Idempotency = `buildPageContent` destructive wipe + full redraw.

**Drift guard:** Do **not** open `bundles/step-15a-primitives.mcp.js` or `step-15b-theme.mcp.js` for porting (wire format only). Do **not** call `createVariable` / `setValueForMode` in canvas code.

---

## Steps

### Shared types + lib foundation

- [x] **Step 1** — Extend `src/core/canvas/types.ts` (create if WO-014 didn't):

  ```ts
  export interface CanvasPageTarget {
    pageSlug: 'primitives' | 'theme';
    pageId?: string; // optional explicit PageNode id
  }

  export interface CanvasBuildResult {
    ok: boolean;
    builder: 'primitives' | 'theme';
    durationMs: number;
    pageId: string;
    pageName: string;
    tableCount: number;
    swatchCount: number;
    warnings: string[];
  }

  export interface ColorRampRow {
    tokenPath: string;
    resolvedHex: string;
    codeSyntax: { WEB: string; ANDROID: string; iOS: string };
  }
  export interface ThemeRow {
    /* per research — aliasLight/Dark, hex/HSL per mode, codeSyntax */
  }
  ```

  **Done when:** types exported from `@/core/canvas`.

- [x] **Step 2** — Implement `src/core/canvas/lib/variables.ts`:

  | Function                                                      | Lift from `_lib.js`                          | Notes                                                                               |
  | ------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
  | `ensureLocalVariableMap(): Promise<Record<string, Variable>>` | `ensureLocalVariableMapOnCtx`                | Rebuild from `getLocalVariablesAsync()` every build — **ignore host-injected maps** |
  | `resolvePath(map, path: string): Variable \| null`            | `resolvePath`                                | Slash paths only                                                                    |
  | `bindPaintToVar` / `bindStrokeToVar`                          | delegate to `@/core/canvas/helpers/bindings` |                                                                                     |
  | `resolveCanonicalPath(path, map, aliasMap)`                   | optional v1                                  | Only if Theme chrome fails on foreign files                                         |

  **Done when:** unit test builds map from mock variables; path lookup returns correct entry.

- [x] **Step 3** — Implement `src/core/canvas/lib/pages.ts`:

  | Function                                                      | Behavior                                                                                                                                |
  | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
  | `findStyleGuidePage(slug: 'primitives' \| 'theme'): PageNode` | 1) `getSharedPluginData('labs.designops','pageSlug')` match 2) legacy names `↳ Primitives` / `↳ Theme` 3) regex fallbacks from research |
  | `isHeaderNode(node): boolean`                                 | name matches `_Header` or `/^header/i`                                                                                                  |
  | `buildPageContent(page): FrameNode`                           | Delete all children except headers; create `_PageContent` at y=320, width 1800, VERTICAL + HUG                                          |

  **Done when:** mock page test verifies non-header children removed, `_PageContent` created once.

- [x] **Step 4** — Implement `src/core/canvas/lib/table.ts`:
  - `buildTable(manifest: TableManifest): FrameNode` — C1 detached-build: create group → table → header/body off-page → single append to `_PageContent`
  - Uses WO-014: `createTableGroup`, `createTableRoot`, `createHeaderRow`, `createEmptyBody`, `getColumnSpec`
  - `TableManifest`: `{ slug, tableKey: ColumnTableKey, rows: RowBuilderFn[] }`
  - **C2 bulk-insert:** set `_PageContent.layoutMode = 'NONE'` during loop; restore `VERTICAL` + HUG after

  **Done when:** builds empty table shell with correct node names `doc/table-group/{slug}/doc/table/{slug}/header|body`.

- [x] **Step 5** — Implement `src/core/canvas/lib/cells.ts` — thin wrappers calling WO-014 `createHeaderCell`, `createBodyCell`, `configureTableText`, `reassertBodyCell/Row`. Add `makeThemeModeColumn(...)` for Theme LIGHT/DARK previews:
  - Bound swatch rect + hex label (+ optional HSL stack for alpha tokens)
  - `figma.variables.setExplicitVariableModeForCollection(themeCollectionId, light|darkModeId)`

  **Done when:** no raw `resize()` in this file except via WO-014 imports.

- [x] **Step 6** — Implement `src/core/canvas/lib/colorFormats.ts` — pure helpers: `colorToHex`, `colorToHsl`, `hexToRgb` (0..1 RGBA for fallback fills). Port logic from `_step15b-runner` `resolveColorFormats` / `_lib.js` `hexToRgb`.

  **Done when:** Vitest covers `#RRGGBB`, alpha → HSL string, invalid hex throws or returns null per legacy behavior.

- [x] **Step 7** — Implement `src/core/canvas/lib/fonts.ts` — `loadFontsForCanvas(): Promise<void>` loading Inter, Roboto Mono, SF Mono (match `_lib.js` font list). Call once at start of each page build; cache module-level `fontsLoaded` flag.

  **Done when:** second call in same session is no-op (spy `loadFontAsync` count).

### Pure row projectors (Vitest-first)

- [x] **Step 8** — Implement `src/core/canvas/projectRows/primitivesRows.ts`:

  | Export                                                                           | Logic                                                                                                                                  |
  | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
  | `projectColorRampsFromTokens(tokens: TokensV1): Record<rampKey, ColorRampRow[]>` | COLOR tokens matching `color/{ramp}/{numericStop}`; sort stops numerically; order ramps via `RAMP_ORDER` constant from `primitives.js` |
  | `projectPrimitiveFloatRows(tokens)`                                              | FLOAT buckets: `space/`, `corner/`, `elevation/`, `font/weight/`                                                                       |
  | `projectPrimitiveStringRows(tokens)`                                             | STRING typeface paths                                                                                                                  |

  Use `resolveTokens(tokens)` from `@/core/variables/resolveTokens` for alias-expanded literals.

  **Done when:** Vitest with `foundations-minimal.v1.json` + generated `primitives-100.v1.json` fixture.

- [x] **Step 9** — Implement `src/core/canvas/projectRows/themeRows.ts`:
  - `projectThemeGroupsFromTokens(tokens): Record<semanticRole, ThemeRow[]>`
  - Group Theme COLOR tokens by second segment after `color/` (`background`, `border`, `primary`, …)
  - Order groups via `THEME_GROUP_KNOWN_ORDER` from `theme.js`
  - Emit alias columns when `valuesByMode.Light|Dark` is alias ref

  **Done when:** Vitest covers alias chain, alpha HSL fields, empty group omission.

- [x] **Step 10** — Add fixtures:
  - `src/core/canvas/__fixtures__/foundations-minimal.v1.json` (or reuse WO-008 fixture path)
  - `src/core/canvas/__fixtures__/primitives-100.v1.json` — 5 ramps × 20 stops via FNV-1a pattern (mirror WO-005 generator script in ticket folder if needed)

  **Done when:** fixtures committed; referenced in tests.

### Page orchestrators

- [x] **Step 11** — Implement `src/core/canvas/colorTables.ts`:

  ```ts
  export async function buildPrimitivesPage(
    tokens: TokensV1,
    target: CanvasPageTarget,
  ): Promise<CanvasBuildResult>;
  ```

  Sequence:
  1. `loadFontsForCanvas()`
  2. `variableMap = await ensureLocalVariableMap()`
  3. `page = findStyleGuidePage('primitives')`
  4. `content = buildPageContent(page)`
  5. For each ramp in `projectColorRampsFromTokens`: `buildTable` with `tableKey: 'primitives/color-ramp'`, rows via `buildColorRow` (swatch bind §0.7, hex + codeSyntax columns)
  6. Optional tables when rows exist: `primitives/space`, `primitives/radius`, `primitives/elevation`, `primitives/typeface`, `primitives/font-weight`
  7. Return counts + `Date.now()` duration

  Row builders port from `primitives.js`: `buildColorRow`, `buildSpaceRow`, `buildRadiusRow`, `buildMonoRow`, `buildTypefaceRow`.

  **Done when:** manual smoke on Plugin Sandbox after WO-008 push shows Primitives tables with bound swatches.

- [x] **Step 12** — Implement `src/core/canvas/themeTables.ts`:

  ```ts
  export async function buildThemePage(
    tokens: TokensV1,
    target: CanvasPageTarget,
  ): Promise<CanvasBuildResult>;
  ```

  Resolve `themeCollectionId`, `themeLightModeId`, `themeDarkModeId` from live collections (display name `Theme`, modes `Light`/`Dark`).

  For each semantic group: table `theme/semantic-group` columns from `getColumnSpec('theme/semantic-group')`, rows via `buildThemeRow` with LIGHT/DARK preview columns.

  **Do not** mutate variables for missing codeSyntax (WO-009 owns push-time syntax); log warning via `pluginLog`.

  **Done when:** Theme page shows dual-preview columns with correct mode override.

- [x] **Step 13** — Implement `src/core/canvas/bench.ts`:

  ```ts
  export async function runCanvasBench(
    label: string,
    buildFn: () => Promise<{ swatchCount: number }>,
  ): Promise<{ totalDurationMs: number; swatchCount: number }>;
  ```

  Log via `pluginLog`. Document warm vs cold font load in output.

  **Done when:** bench callable from dev message handler.

### Wiring + VQA

- [x] **Step 14** — Add main-thread dev handler in `src/main.ts`:

  ```ts
  // message: { type: 'canvas/build-page', page: 'primitives' | 'theme', tokens: TokensV1 }
  ```

  Guard with `isCanvasBuildPageMessage` in `src/io/messages/canvas.ts` (new file, ES2017 guards).

  **Done when:** UI or console can trigger single-page build without WO-015.

- [x] **Step 15** — Manual VQA checklist (Plugin Sandbox `file_key=cVdPraIafWFBRZnzMPhtrW`):
  1. Push `spike-400` or foundations fixture via existing push UI
  2. Run `buildPrimitivesPage` + `buildThemePage`
  3. Verify: column sums 1640, swatch paints bound (not hardcoded hex when var exists), node names `doc/table-group/*`, re-run idempotent (no duplicate tables)
  4. Record bench to `research/canvas-bench-result.md` — target **p50 < 3000 ms** each (~100 swatches)

  **Done when:** bench file written; ticket AC checked.

- [x] **Step 16** — CI: `typecheck`, `lint`, `test`, `build:community` green. Grep guard: `rg 'node\.resize\(' src/core/canvas/colorTables.ts src/core/canvas/themeTables.ts src/core/canvas/lib/` should return **zero** (only WO-014 helpers may call resize).

---

## Build Agents

### Phase 1 (parallel — **requires WO-014 merged**)

- `code-build` — Steps 1, 8–10: types, row projectors, fixtures, Vitest

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 2–7: `lib/` modules (variables, pages, table, cells, colorFormats, fonts)

### Phase 3 (sequential, after Phase 2)

- `code-build` — Steps 11–12: `colorTables.ts` + `themeTables.ts`

### Phase 4 (after Phase 3)

- `code-build` — Steps 13–16: bench, main handler, manual VQA, CI + grep gate

---

## Dependencies & Tools

| Dependency | Role                                                                 |
| ---------- | -------------------------------------------------------------------- |
| **WO-014** | **Hard gate** — all resize/sizing via `@/core/canvas` helpers        |
| **WO-008** | Variables must exist before draw; canonical collection names         |
| **WO-009** | codeSyntax on variables at push; no canvas-time healing              |
| **WO-010** | `scope: 'canvas'` deferred — emit legacy node names for future audit |

**Lift sources:**

| Read                                           | Do not read                          |
| ---------------------------------------------- | ------------------------------------ |
| `canvas-templates/primitives.js`               | `bundles/step-15a-primitives.mcp.js` |
| `canvas-templates/theme.js`                    | `bundles/step-15b-theme.mcp.js`      |
| `canvas-templates/_lib.js` (glue only)         | Runner return payloads               |
| `_step15a-runner.fragment.js` (row logic only) | MCP transport                        |

**Chrome variable paths (must bind when present):**

`color/border/subtle`, `color/background/default`, `color/background/variant`, `color/background/content`, `color/background/content-muted`, `color/neutral/100`, `color/primary/200`

---

## Open Questions

1. **WO-014 soft vs hard gate** — **RESOLVED for build:** hard gate; do not start Phase 2 until WO-014 merged.
2. **Page slug namespace** — **RESOLVED:** read `labs.designops` slug; write both legacy + slug when creating pages (Sprint 4 owns migration).
3. **Non-color primitive tables in 15a** — **RESOLVED:** include all 15a tables in `colorTables.ts` per lift-sources §3.

---

## Notes

### ES2017 (main-thread: `colorTables.ts`, `themeTables.ts`, `lib/*`)

Same checklist as WO-014. UI message guards may use modern TS.

### Step 15 VQA note (build agent)

Manual Plugin Sandbox VQA deferred — Figma MCP unavailable in build session. Vitest covers row projection + lib helpers; dev handlers `canvas/build-page` and `canvas/bench` wired in `src/main.ts`. Bench stub: `research/canvas-bench-result.md`.

### Node naming contract (for future canvas audit)

```
doc/table-group/{slug}
  doc/table/{slug}
    header/row/header/cell/{COL_ID}
    body/row/{tokenPath}/body/cell/{COL_ID}
doc/theme-preview/light|dark  (theme rows only)
```

### References

- Research: `./research/color-theme-canvas-builders.md`
- Plan quality bar: `.github/templates/plan-quality-bar.md`
- Parent ticket: `./ticket.md`

---

## Requirement traceability

| Ticket requirement                             | Plan step(s)                     |
| ---------------------------------------------- | -------------------------------- |
| F1 `lib/` shared port                          | Steps 2–7                        |
| F2 `projectRows/` primitives + theme           | Steps 8–9                        |
| F3 `colorTables.ts`                            | Step 11                          |
| F4 `themeTables.ts`                            | Step 12                          |
| F5 Input contract TokensV1 + CanvasPageTarget  | Steps 1, 11–12                   |
| F6 Variable binding §0.7 + theme mode override | Steps 2, 5, 11–12                |
| F7 Page slugs + buildPageContent idempotency   | Steps 3, 11–12                   |
| F8 Full page redraw                            | Steps 3, 11–12                   |
| F9 WO-014 helpers (hard gate)                  | Steps 4–5, 11–12; grep Step 16   |
| F10 `bench.ts`                                 | Step 13                          |
| V1 Table hierarchy node names                  | Steps 4–5, 11–12                 |
| V2 Column widths 1640                          | Steps 4, 11–12 (`getColumnSpec`) |
| V3 C2 bulk-insert suspend/restore              | Step 4                           |

| Acceptance criterion                           | Plan step(s)                                |
| ---------------------------------------------- | ------------------------------------------- |
| AC1 Visual correct Primitives + Theme pages    | Step 15 manual VQA                          |
| AC2 Legacy node naming for future canvas audit | Steps 4–5, 11–12; Notes naming contract     |
| AC3 Vitest row projection fixtures             | Steps 8–10                                  |
| AC4 Bench < 3 s per builder                    | Step 15 → `research/canvas-bench-result.md` |

| User story                                    | Plan step(s)    |
| --------------------------------------------- | --------------- |
| Designer: bound swatches + columns after push | Steps 11–12, 15 |
| Engineer: unit-testable row projection        | Steps 8–10      |

| Out of scope (ticket)               | Plan enforcement  |
| ----------------------------------- | ----------------- |
| WO-012/013 builders                 | Not in steps      |
| WO-015 Bootstrap UI                 | Not in steps      |
| `runAudit('canvas')` implementation | Not in steps      |
| Canvas-time codeSyntax healing      | Step 12 logs only |

---

## Planning sign-off

- [x] All Functional + Visual requirements mapped to steps
- [x] All acceptance criteria mapped to steps
- [x] Build Agents assigns Steps 1–16 exactly once
- [x] Sub-agent slices self-contained per phase
- **Planning complete** — ready for `/build` after dependency `src/core/canvas/helpers/` (WO-014) is merged
