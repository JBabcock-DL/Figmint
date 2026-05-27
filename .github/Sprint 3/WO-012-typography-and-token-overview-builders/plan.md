# Plan — WO-012: Typography & Token Overview canvas builders

## Approach

Port **`text-styles.js`** (Typography specimen) and **`token-overview.js`** (Step 17 scaffold refresh) into `textStyles.ts` and `tokenOverview.ts`. Reuse WO-011 `src/core/canvas/lib/*` — **do not duplicate** table/page/font/binding modules. Typography = **27 slot rows + 5 category sub-headers** at Typography mode **100**. Token overview = **platform-mapping table sync** (22+ rows) + arch boxes — **not** five full per-collection token tables. Live Figma variables/text styles authoritative at draw; `TokensV1` drives expected counts and audit. Extend WO-010 with **`runAudit('canvas')`** subset for typography + token-overview rules from `14-audit.md`.

**Prerequisite module (shared):** `publishTypographyStyles.ts` runs **before** text-styles draw (bootstrap orchestrator calls it — WO-012 builder throws structured error if `< 27` slot styles).

---

## Steps

### Data lift + shared prep

- [x] **Step 1** — Lift JSON data to `src/core/canvas/data/`:

  | Source (DesignOps)                | Target                       |
  | --------------------------------- | ---------------------------- |
  | `data/typography-slots.json`      | `typography-slots.json`      |
  | `data/platform-mapping-rows.json` | `platform-mapping-rows.json` |

  Add typed parsers: `loadTypographySlots()`, `loadPlatformMappingRows()` returning validated arrays.

  **Done when:** Vitest asserts 27 slot definitions + ≥22 platform rows.

- [x] **Step 2** — Implement `src/core/canvas/publishTypographyStyles.ts`:

  ```ts
  export async function publishTypographyStyles(tokens: TokensV1): Promise<PublishTypographyResult>;
  ```

  Responsibilities (from Step 15c §0 / research):
  1. Publish local `_Doc/*` text styles (Section, TokenName, Code, Caption) bound to Typography mode-100 variables
  2. Publish **27 slot** text styles bound to `{Slot}/font-size`, `font-family`, `font-weight`, `line-height`
  3. Return `{ docStyles: number; slotStyles: number; missing: string[] }`

  **Out of WO-012 draw path** — called by WO-015 `runBootstrap` before `buildTextStylesPage`. WO-012 only **verifies** styles exist.

  **Done when:** unit test with mock `figma.createTextStyle` counts; missing list populated when slots absent.

### Row projectors

- [x] **Step 3** — Implement `src/core/canvas/projectRows/typographyRows.ts`:

  Port discovery from `_step15c-text-styles-runner.fragment.js`:
  1. Input: `TokensV1` + optional live text style index
  2. Group styles by category (Display, Headline, Title, Body, Label)
  3. Sort within category by size priority (2XL→XS)
  4. Body variants: `regular`, `emphasis`, `italic`, `link`, `strikethrough`
  5. Emit interleaved `{ type: 'category', label }` + `{ type: 'slot', ... }` rows totaling **27 slots + 5 headers**

  **Done when:** Vitest output row count = 32; category order matches `typography-slots.json`.

- [x] **Step 4** — Implement `src/core/canvas/projectRows/tokenOverviewRows.ts`:
  - Map `platform-mapping-rows.json` → row DTOs with `collection` tag (Theme, Typography, Primitives, Layout, Effects)
  - Merge live variable `codeSyntax` when path exists in `variableMap`
  - Fallback: `defaultHex` or append ` · stale` to token cell when variable missing

  **Done when:** Vitest with mock map syncs WEB/ANDROID/iOS cells.

### Typography builder

- [x] **Step 5** — Implement `src/core/canvas/textStyles.ts`:

  ```ts
  export async function buildTextStylesPage(ctx: CanvasBuildContext): Promise<CanvasBuildResult>;
  ```

  | Requirement   | Detail                                                                                                                               |
  | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
  | Page slug     | `text-styles` → `↳ Text Styles`                                                                                                      |
  | Table slug    | `doc/table/typography/styles`                                                                                                        |
  | Column spec   | `getColumnSpec('typography/styles')` — SLOT 220 · SPECIMEN 360 · SIZE/LINE 140 · WEIGHT/FAMILY 180 · WEB 280 · ANDROID 200 · iOS 260 |
  | Specimen      | `textStyleId` binding at mode **100**; caption notes 8 Android-scale modes in collection                                             |
  | Variant fills | link → `color/primary/default`; strikethrough → `color/background/content-muted`; else → `color/background/content`                  |

  Pre-flight: if local slot text styles `< 27`, throw `CanvasBuildError` listing missing slot names (do not create styles inline).

  Port row builder `buildTypographyRow` from `text-styles.js`.

  **Done when:** manual VQA shows 27 specimens + 5 category headers; grep shows no inline `resize(`.

### Token overview builder

- [x] **Step 6** — Implement `src/core/canvas/tokenOverview.ts`:

  ```ts
  export async function buildTokenOverviewPage(ctx: CanvasBuildContext): Promise<CanvasBuildResult>;
  ```

  Step 17 passes (order matters):
  1. `findStyleGuidePage('token-overview')`
  2. Locate sections: `token-overview/architecture`, `platform-mapping`, `mode-row`, `how-to-bind`
  3. **Delete** `token-overview/claude-commands` section (Figmint — agent artifact) OR replace with static Figmint help frame
  4. Rebind `arch-box/{Primitives,Theme,Typography,Layout,Effects}` fills from variable map
  5. Sync `doc/table/token-overview/platform-mapping` rows — columns TOKEN 400 · WEB 420 · ANDROID 340 · iOS 480
  6. §0.9 shadow hygiene: strip effects from platform-mapping subtree; elevation only on outer shell
  7. Upgrade `_PageContent` text nodes to `_Doc/*` styles (heuristic by fontSize/weight)
  8. Rebind `phone-frame/light|dark` fills; delete `placeholder/*`; replace `TBD` with `color/primary/500` hex

  **Defer:** font-scale panel mode binding (appendix) unless 05d scaffold nodes exist in sandbox.

  **Done when:** platform-mapping shows live codeSyntax; arch boxes bound.

### Canvas audit extension

- [x] **Step 7** — Extend `src/core/audit/runAudit.ts`:
  - Add `scope: 'canvas'` branch (alongside existing `'variables'`)
  - Implement minimum rules from `14-audit.md` for typography + token-overview:

    | Rule id (proposed)                     | Probe                                   |
    | -------------------------------------- | --------------------------------------- |
    | `canvas-typography-row-count`          | 27 slot rows present                    |
    | `canvas-typography-column-sum`         | table width 1640                        |
    | `canvas-token-overview-platform-rows`  | ≥22 platform-mapping rows               |
    | `canvas-token-overview-shadow-hygiene` | no effects on platform-mapping subtree  |
    | `canvas-bad-header-cells`              | use WO-014 `assertHeaderCellGeometry`   |
    | `canvas-bad-table-text`                | text nodes have `textAutoResize` HEIGHT |
    | `canvas-no-one-px-masters`             | WO-014 `assertNoOnePxMaster` scan       |
    | `canvas-page-content-width`            | `_PageContent` width 1800               |

  Return `AuditReportV1` with `meta.operation: 'canvas'`.

  **Done when:** Vitest with mock Figma tree triggers pass/fail per rule.

### Wiring + bench

- [x] **Step 8** — Wire `canvas/build-page` handler for `text-styles` | `token-overview` in `src/main.ts` (extend `src/io/messages/canvas.ts`).

- [x] **Step 9** — Manual VQA on Plugin Sandbox after full Foundations push:
  1. Run `publishTypographyStyles` (or full bootstrap)
  2. `buildTextStylesPage` + `buildTokenOverviewPage`
  3. `runAudit('canvas', …)` → expect pass on clean file
  4. Bench each builder **p50 < 3000 ms** → append to `research/canvas-bench-result.md`

- [x] **Step 10** — CI green; check off ticket AC; confirm zero inline `resize(` in `textStyles.ts` / `tokenOverview.ts`.

---

## Build Agents

### Phase 1 (parallel — after WO-014 + WO-011 `lib/`)

- `code-build` — Steps 1–4: data lift, publishTypographyStyles, row projectors + Vitest

### Phase 2 (parallel, after Phase 1)

- `code-build` — Step 5: `textStyles.ts`
- `code-build` — Step 6: `tokenOverview.ts`

### Phase 3 (sequential, after Phase 2)

- `code-build` — Steps 7–10: canvas audit extension, main wiring, VQA, CI

---

## Dependencies & Tools

| Dependency        | Role                                                   |
| ----------------- | ------------------------------------------------------ |
| **WO-014**        | Hard gate — zero inline resize                         |
| **WO-011 `lib/`** | Shared `pages`, `table`, `cells`, `fonts`, `variables` |
| **WO-008**        | Variables + text style targets exist                   |
| **WO-010**        | Extend with canvas scope                               |

**Lift:**

| Modular source                            | Avoid                           |
| ----------------------------------------- | ------------------------------- |
| `text-styles.js`                          | `step-15c-text-styles.mcp.js`   |
| `token-overview.js`                       | `step-17-token-overview.mcp.js` |
| `_step15c-text-styles-runner.fragment.js` | Full bundle                     |

---

## Open Questions

1. **`publishTypographyStyles` ownership** — **RESOLVED:** shared module; bootstrap calls before canvas; WO-012 verifies only.
2. **Font-scale panel** — **RESOLVED:** defer unless scaffold exists.

---

## Notes

### Drift guard

- Do not invent five full per-collection token tables — legacy Step 17 does not have them.
- Do not load typography + token-overview bundles in one agent context (~90 KB combined).

### References

- Research: `./research/typography-token-overview-builders.md`
- Plan quality bar: `.github/templates/plan-quality-bar.md`
- Parent ticket: `./ticket.md`

---

## Requirement traceability

| Ticket requirement                                                              | Plan step(s)          |
| ------------------------------------------------------------------------------- | --------------------- |
| F1 `textStyles.ts` — 27 rows + 5 headers, mode 100, columns 1640, variant fills | Step 5                |
| F2 `tokenOverview.ts` — platform-mapping, arch boxes, §0.9, placeholders        | Step 6                |
| F3 `CanvasBuildContext` + live Figma at draw                                    | Steps 5–6             |
| F4 Shared `lib/*` from WO-011 (no duplicate)                                    | Steps 5–6 import only |
| F5 `runAudit('canvas')` typography + overview rules                             | Step 7                |
| F6 Bench p50 < 3 s                                                              | Step 9                |

| Acceptance criterion                                        | Plan step(s)           |
| ----------------------------------------------------------- | ---------------------- |
| AC1 Typography 27 rows + 5 headers + codeSyntax cols        | Step 5, 9              |
| AC2 Token overview platform-mapping + arch + shadow hygiene | Step 6, 9              |
| AC3 WO-014 helpers only for resize/sizing                   | Step 5–6; grep Step 10 |
| AC4 `CanvasBuildResult` audit.passed on clean file          | Steps 7, 9             |
| AC5 Bench logged                                            | Step 9                 |

| Out of scope                        | Plan enforcement                             |
| ----------------------------------- | -------------------------------------------- |
| Color/theme/layout/effects builders | Not in steps                                 |
| Publishing `_Doc/*` in WO-012 core  | Step 2 separate module; Step 5 verifies only |
| Font-scale panel                    | Deferred — not in steps                      |
| Bootstrap tab                       | Not in steps                                 |

---

## Planning sign-off

- [x] All requirements + AC mapped
- [x] Build Agents Steps 1–10 assigned
- **Planning complete** — `/build` after WO-014 merged + shared `src/core/canvas/lib/` from color/theme builder ticket
