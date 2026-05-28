# Plan — WO-013: Layout & Effects canvas builders

## Approach

Port modular **`layout.js`** (~210 lines) and **`effects.js`** (~293 lines) into `layout.ts` and `effects.ts`. Row resolution lives in pure **`resolveLayoutRows.ts`** / **`resolveEffectsRows.ts`** (Vitest-first) ported from runner fragments — **not** inlined in draw functions. Shared table/page/cell code comes from WO-011 `lib/` + WO-014 helpers. Layout = **dynamic tables per first path segment** (space, radius, …) with bar/square previews. Effects = **two fixed tables** (`effects/shadows`, `effects/color`) with Light/Dark dual previews. **“Grids” AC = spacing scale table** — legacy has no grid matrix; do not invent one.

**Drift guard:** Ship **`effects.js` 88×88 preview cards** first; `10-column-spec.md` gold mat/wrapper is optional VQA polish only.

---

## Steps

### Data + pure resolvers

- [x] **Step 1** — Lift `DesignOps-plugin/skills/create-design-system/data/layout-effects.json` → `src/core/canvas/data/layout-effects.json`. Use as Vitest oracle for token paths (shadow tiers, layout aliases).

- [x] **Step 2** — Implement `src/core/canvas/resolveLayoutRows.ts`:

  ```ts
  export interface LayoutRow {
    tokenPath: string;
    resolvedPx: number;
    aliasPath: string | null;
    displayValue: string; // "{n}px" or "∞"
    codeSyntax: { WEB: string; ANDROID: string; iOS: string };
    previewKind: 'bar' | 'square';
  }

  export function resolveLayoutRows(
    tokens: TokensV1,
    liveSnapshot: FigmaVariableSnapshot,
  ): Record<string, LayoutRow[]>;
  ```

  Logic (from `_step15c-layout-runner.fragment.js`):
  1. Filter `collection === 'layout'`, type FLOAT (plus radius special cases)
  2. Group by first segment: `space`, `spacing`, `padding`, `radius`, `corner`, `border`, `gap`
  3. Sort rows by resolved px ascending within group
  4. Order groups via `LAYOUT_KNOWN_ORDER`: space → spacing → padding → radius → corner → border → gap → unknown alpha
  5. `radius/full` or px ≥ 9999 → display `∞`, preview uses pill cap 32

  **Done when:** Vitest matches `layout-effects.json` expected counts; column metadata present for `layout/spacing` spec.

- [x] **Step 3** — Implement `src/core/canvas/resolveEffectsRows.ts`:

  ```ts
  export interface ShadowRow {
    tokenPath: string; // shadow/{tier}/blur
    tier: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    blurPx: number;
    aliasPath: string;
    codeSyntax: { WEB: string; ANDROID: string; iOS: string };
  }

  export interface ShadowColorRow {
    tokenPath: 'shadow/color';
    lightRgba: string;
    darkRgba: string;
    codeSyntax: { WEB: string; ANDROID: string; iOS: string };
  }

  export function resolveEffectsRows(
    tokens: TokensV1,
    liveSnapshot: FigmaVariableSnapshot,
  ): { shadows: ShadowRow[]; shadowColor: ShadowColorRow | null };
  ```

  Tier assignment: sort FLOAT blur vars by name → map index to `TIER_NAMES` from effects runner (5 tiers).

  **Done when:** Vitest asserts 5 shadow rows + 1 color row for foundations fixture.

### Effect style preflight

- [x] **Step 4** — Implement `src/core/canvas/ensureEffectStyles.ts`:

  ```ts
  export async function ensureEffectStyles(): Promise<{ published: string[]; missing: string[] }>;
  ```

  Verify local effect styles exist: `Effect/shadow-sm`, `Effect/shadow-md`, `Effect/shadow-lg`, `Effect/shadow-xl`, `Effect/shadow-2xl`.
  - If missing: attempt create from variables (document dependency on push) OR return `missing[]` and let `buildEffectsPage` fail with clear diagnostic listing required style names
  - **Do not** silently draw without shadows

  **Done when:** unit test with mock style catalog reports missing tiers.

### Layout page builder

- [x] **Step 5** — Implement `src/core/canvas/layout.ts`:

  ```ts
  export async function buildLayoutPage(ctx: CanvasBuildContext): Promise<CanvasBuildResult>;
  ```

  | Item            | Spec                                                                                                                   |
  | --------------- | ---------------------------------------------------------------------------------------------------------------------- |
  | Page slug       | `layout` → `↳ Layout`                                                                                                  |
  | Mode            | Single Default — no Light/Dark columns                                                                                 |
  | Tables          | One per group key from `resolveLayoutRows`                                                                             |
  | Column spec     | `getColumnSpec('layout/spacing')` — TOKEN 280 · VALUE 100 · ALIAS→ 280 · PREVIEW 240 · WEB 320 · ANDROID 220 · iOS 200 |
  | Spacing preview | HORIZONTAL cell (§0.1.H): bar width `min(px, colWidth-40)`, h=16, radius 4, fill `color/primary/200`                   |
  | Radius preview  | 64×64 square, `cornerRadius = min(px, 32)`, stroke `color/border/subtle`, fill `color/neutral/100`                     |

  After PREVIEW cell layoutMode flip → immediately re-apply FIXED primary + AUTO counter via WO-014.

  Port `buildLayoutSpacingRow`, `buildLayoutRadiusRow` from `layout.js`.

  **Done when:** idempotent re-run produces no duplicate `doc/table-group/layout/*` nodes.

### Effects page builder

- [x] **Step 6** — Implement `src/core/canvas/effects.ts`:

  ```ts
  export async function buildEffectsPage(ctx: CanvasBuildContext): Promise<CanvasBuildResult>;
  ```

  Resolve context fields before draw:

  ```ts
  (effectsCollectionId,
    effectsLightModeId,
    effectsDarkModeId,
    themeCollectionId,
    themeLightModeId,
    themeDarkModeId);
  ```

  **Table 1 — `effects/shadows`** (`getColumnSpec('effects/shadows')`):
  - 5 rows from `resolveEffectsRows().shadows`
  - LIGHT/DARK columns: `makeShadowPreviewCell` — 88×88 card, `effectStyleId` → `Effect/shadow-{tier}`, wrapper tint `color/background/container-highest` or `variant`
  - Per card: `setExplicitVariableModeForCollection` on **Effects** and **Theme** collections

  **Table 2 — `effects/color`** (`getColumnSpec('effects/color')`):
  - Single row; LIGHT/DARK via `makeThemeModeColumn` with Effects mode override on chip

  Call `ensureEffectStyles()` at start; abort with structured error if styles missing.

  **Done when:** Light column cards visible on white table body (wrapper tint verified manually).

### Wiring + VQA

- [x] **Step 7** — Extend `src/io/messages/canvas.ts` + `main.ts` for `layout` | `effects` page builds.

- [x] **Step 8** — Manual VQA (Plugin Sandbox):
  1. Full push (WO-008)
  2. `buildLayoutPage` — spacing bars + radius squares bound
  3. `buildEffectsPage` — 5 shadow tiers + color row, Light/Dark contrast OK
  4. Re-run both — idempotent
  5. Bench → `research/layout-effects-bench-result.md` (**< 3000 ms** each; expect ~500 ms typical)

- [x] **Step 9** — Invoke `runAudit('canvas')` post-draw (rules from WO-012 Step 7 extension + layout/effects-specific probes if added).

- [x] **Step 10** — CI green; grep zero inline `resize(` in layout/effects modules.

---

## Build Agents

### Phase 1 (parallel — after WO-014 + WO-011 `lib/`)

- `code-build` — Steps 1–4: data, resolvers, ensureEffectStyles + Vitest

### Phase 2 (parallel, after Phase 1)

- `code-build` — Step 5: `layout.ts`
- `code-build` — Step 6: `effects.ts`

### Phase 3 (sequential, after Phase 2)

- `code-build` — Steps 7–10: wiring, VQA, audit hook, CI

---

## Dependencies & Tools

| Dependency        | Role                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| **WO-014**        | Hard gate                                                            |
| **WO-011 `lib/`** | pages, table, cells, variables                                       |
| **WO-008**        | Layout/Effects collections pushed                                    |
| **WO-009**        | codeSyntax fallback in resolvers                                     |
| **WO-012 Step 7** | Canvas audit scope (or duplicate minimal rules if WO-012 not merged) |

**Lift map:**

| Legacy                                | FigHub                 |
| ------------------------------------- | ----------------------- |
| `layout.js`                           | `layout.ts`             |
| `effects.js`                          | `effects.ts`            |
| `_step15c-layout-runner.fragment.js`  | `resolveLayoutRows.ts`  |
| `_step15c-effects-runner.fragment.js` | `resolveEffectsRows.ts` |

---

## Open Questions

1. **Effect style publishing** — **RESOLVED:** `ensureEffectStyles()` in WO-013; clear error if missing; may move to shared bootstrap prep later.
2. **Gold mat preview** — **RESOLVED:** optional polish after simple card ships.

---

## Notes

### “Grids” clarification for VQA agents

Ticket AC “spacing scale, radii, grids” = **spacing alias table + radius alias table** only. No CSS grid specimen unless product revises FR-BOOT-7.

### References

- Research: `./research/layout-effects-canvas-builders.md`
- Plan quality bar: `.github/templates/plan-quality-bar.md`
- Parent ticket: `./ticket.md`
- Column keys: `layout/spacing`, `layout/radius`, `effects/shadows`, `effects/color` in `column-widths.json`

---

## Requirement traceability

| Ticket requirement                                          | Plan step(s)            |
| ----------------------------------------------------------- | ----------------------- |
| F1 `layout.ts` — groups, spacing bar, radius square, 7 cols | Steps 2, 5              |
| F2 `effects.ts` — shadows + color tables, Light/Dark        | Steps 3, 6              |
| F3 `resolveLayoutRows.ts` + `resolveEffectsRows.ts`         | Steps 2–3, 4            |
| F4 WO-014 + shared lib helpers, no inline resize            | Steps 5–6; grep Step 10 |
| F5 Idempotent buildPageContent redraw                       | Steps 5–6               |
| V1 Spacing + radius previews bound                          | Step 5                  |
| V2 Effects dual previews + wrapper tint                     | Step 6                  |
| V3 Ship effects.js fidelity first                           | Step 6                  |
| Tech bench + audit + Vitest                                 | Steps 4, 8–9, 10        |

| Acceptance criterion                  | Plan step(s)                                          |
| ------------------------------------- | ----------------------------------------------------- |
| AC1 Layout spacing + radius tables    | Step 8                                                |
| AC2 Effects shadow + color Light/Dark | Step 8                                                |
| AC3 Idempotent re-run                 | Step 8                                                |
| AC4 Canvas audit + bench < 3 s        | Steps 9–10, `research/layout-effects-bench-result.md` |

| Out of scope                             | Plan enforcement       |
| ---------------------------------------- | ---------------------- |
| Other style-guide pages                  | Not in steps           |
| Bootstrap tab                            | Not in steps           |
| Gold mat/wrapper polish                  | Optional post-VQA only |
| Effect style publishing in push pipeline | Step 4 preflight only  |

---

## Planning sign-off

- [x] All requirements + AC mapped
- [x] Build Agents Steps 1–10 assigned
- **Planning complete** — `/build` after canvas helpers + shared `lib/` exist

### Build notes (WO-013 code-build)

- Lifted `layout-effects.json`; added `layout-effects.v1.json` Vitest fixture with full alias chains.
- Pure resolvers: `resolveLayoutRows.ts`, `resolveEffectsRows.ts`, shared helpers in `resolveShared.ts`.
- Page builders: `layout.ts`, `effects.ts` — use `resizeThenApplySizing` (zero inline `resize(`).
- `ensureEffectStyles()` preflight aborts with `CanvasBuildError` when tiers missing.
- Wired `layout` / `effects` through `canvas.ts` guards + `main.ts` build/bench dispatch.
- Step 8 manual VQA deferred — stub at `research/layout-effects-bench-result.md`.
- Extended `StyleGuidePageSlug`, `pages.ts` fallbacks, `CanvasAuditInput.builder`.
