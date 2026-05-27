# Typography + Token Overview Canvas Builders — WO-012 research

> **Status:** ✅ Research complete — port strategy, row model, audit extension, and bench budget locked for `/plan`.
> **Date:** 2026-05-27
> **Owner:** WO-012 (Sprint 3)
> **PRD anchors:** §6.1 FR-BOOT-7 (style-guide canvas pages), §11.4 (preview/confirm — N/A for deterministic builders)
> **Primary lift (modular source — not bundles):**
>
> - `DesignOps-plugin/skills/create-design-system/canvas-templates/text-styles.js`
> - `DesignOps-plugin/skills/create-design-system/canvas-templates/token-overview.js`
> - `DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js` (shared table helpers)
> - `DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/_step15c-text-styles-runner.fragment.js` (row discovery + post-audit)
>   **Upstream:** WO-008 push engine, WO-010 audit (`scope: 'canvas'` extension), WO-014 auto-layout helpers

---

## Summary

WO-012 ports two style-guide canvas builders into `src/core/canvas/`:

1. **`textStyles.ts`** — rebuilds the `↳ Text Styles` page table `doc/table/typography/styles` (27 specimen slot rows + 5 category sub-headers).
2. **`tokenOverview.ts`** — refreshes the `↳ Token Overview` page scaffold (architecture bindings, platform-mapping `codeSyntax` cells, shadow hygiene, placeholder cleanup).

**Locked decisions:**

1. **Modular source wins.** Port from `canvas-templates/{text-styles,token-overview}.js` + shared `_lib.js` helpers — **not** the 1k-line `.mcp.js` bundles. Runner fragments supply orchestration logic only (`_step15c-text-styles-runner.fragment.js` for dynamic row assembly; `_step17-runner.fragment.js` is page lookup + `build(ctx)` only).
2. **WO-014 is a hard dependency.** All `resize()` / sizing-mode sequencing goes through `src/core/canvas/helpers/autoLayout.ts` (`resizeWithAutoLayout`, `rehugCell`, `rehugRow`). No inline `node.resize()` in builder modules.
3. **Live Figma state is authoritative at draw time; `TokensV1` is the contract input.** Builders accept `{ tokens: TokensV1, pushResult?: PushResult }` but always call `ensureLocalVariableMapOnCtx` (rebuild path→id from `getLocalVariablesAsync()`). `TokensV1` drives expected counts, codeSyntax fallbacks, and audit comparisons — not a substitute for reading pushed variables/text styles.
4. **Typography specimen renders at Typography mode `100`.** The 8 Android-scale modes (`85` → `200`) live in the Typography **variable collection** (WO-008); the canvas table caption documents this. Specimen `textStyleId` bindings use mode-100 resolved sizes; font-scale panel refresh on Token Overview is best-effort (legacy appendix — bind `Body/LG/font-size` per mode cell when variables exist).
5. **Token overview “grouped by collection” = architecture section + collection-tagged platform-mapping rows.** Legacy Step 17 does **not** emit five full per-collection token tables. It syncs the cross-collection `doc/table/token-overview/platform-mapping` table (22 minimum rows spanning all five collections per `platform-mapping-rows.json`) plus five `arch-box/{Collection}` frames. Match legacy parity for Sprint 3; do not invent per-collection full token tables unless product revises FR-BOOT-7.
6. **Audit extends to `scope: 'canvas'`.** WO-010 deferred canvas rules from `14-audit.md`; WO-012 adds the typography + token-overview subset and invokes `runAudit('canvas', …)` after each builder. Variable-scope rules from push remain separate.
7. **Bench budget: < 3 s per builder** on Plugin Sandbox (`file_key=cVdPraIafWFBRZnzMPhtrW`) after a full Foundations push (~400+ variables). WO-005/WO-008 measured Plugin API at ~0.2–0.5 ms per variable op; canvas builders are DOM-heavy but an order of magnitude smaller than push — 3 s is conservative with ~10× headroom vs push.

---

## Key Findings

### 1. Lift-source correction (bundles → modular)

Per `Docs/lift-sources.md` §0 and §3:

| Ticket pointer                  | Correct port input                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `step-15c-text-styles.mcp.js`   | `canvas-templates/text-styles.js` + `_step15c-text-styles-runner.fragment.js` + `_lib.js` |
| `step-17-token-overview.mcp.js` | `canvas-templates/token-overview.js` + `_lib.js`                                          |

Bundles inline `_lib.js` (~724 lines) + page template + runner. Figmint splits `_lib.js` into:

| Legacy `_lib.js` concern                                 | Figmint target                                               |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| Font loading                                             | `src/core/canvas/lib/fonts.ts`                               |
| Variable map + canonical alias map                       | `src/core/canvas/lib/variableMap.ts`                         |
| Paint binding (`bindPaintToVar`)                         | `src/core/canvas/lib/bindings.ts`                            |
| Text pipeline (`makeText`)                               | `src/core/canvas/lib/text.ts`                                |
| Table shell (`buildTable`, `buildPageContent`)           | `src/core/canvas/lib/table.ts`                               |
| DesignOps page slug / registry                           | `src/core/canvas/lib/designOpsShell.ts`                      |
| Resize / rehug (`rehugCell`, `rehugRow`, `makeBodyCell`) | **WO-014** `helpers/autoLayout.ts` + `helpers/columnSpec.ts` |

WO-011/WO-013 share the same lib split; WO-012 should not duplicate — import shared lib modules.

### 2. Typography specimen — 27 rows + Android-scale modes

**Row model** (from `phases/07-steps15a-15c.md` + `data/typography-slots.json`):

| Group               | Slot rows                 | Notes                                                              |
| ------------------- | ------------------------- | ------------------------------------------------------------------ |
| Display             | 3 (LG/MD/SM)              | Specimen copy: _"Dream design systems"_                            |
| Headline            | 3                         | _"Ship it with confidence"_                                        |
| Title               | 3                         | _"Tokens keep us honest"_                                          |
| Body                | 15 (3 sizes × 5 variants) | Variants: `regular`, `emphasis`, `italic`, `link`, `strikethrough` |
| Label               | 3                         | _"STATUS — ACTIVE"_                                                |
| **Total slot rows** | **27**                    | Plus **5** `{ type: 'category', label }` sub-headers               |

**Android-scale modes (Typography collection — not canvas rows):**

- 8 modes: `85`, `100`, `110`, `120`, `130`, `150`, `175`, `200` (base mode `100`).
- `font-family` + `font-weight` identical across modes; `font-size` + `line-height` scale per `typography-slots.json` `scaleRules` (sqrt curve for large display text above 1.3× scale).
- Canvas table shows mode-100 resolved metrics in SIZE/LINE and WEIGHT/FAMILY columns; caption explains full scale ships via variables.

**Dynamic row discovery** (`_step15c-text-styles-runner.fragment.js`):

1. `getLocalTextStylesAsync()` — exclude `Doc/*` and `Effect/*`.
2. Group by first path segment (`Display`, `Headline`, …).
3. Sort within category by size priority (2XL→XS).
4. Derive `variant` from third path segment for Body styles.
5. Read `codeSyntax` from text style if present; else derive via kebab rules (`csFor()`).

**Column spec** (`text-styles.js` `TYPO_COLUMNS`, sums to **1640**):

| Column          | Width | Content                                                   |
| --------------- | ----- | --------------------------------------------------------- |
| SLOT            | 220   | Token path (`Doc/TokenName`)                              |
| SPECIMEN        | 360   | `text/specimen` with `textStyleId`; variant fill bindings |
| SIZE / LINE     | 140   | Two `Doc/Code` lines (px size + line height)              |
| WEIGHT / FAMILY | 180   | Two `Doc/Code` lines (weight + family)                    |
| WEB             | 280   | Platform codeSyntax                                       |
| ANDROID         | 200   | Platform codeSyntax                                       |
| iOS             | 260   | Platform codeSyntax                                       |

**Variant fill bindings** (`buildTypographyRow`):

| Variant                      | Fill variable                    |
| ---------------------------- | -------------------------------- |
| `base`, `emphasis`, `italic` | `color/background/content`       |
| `link`                       | `color/primary/default`          |
| `strikethrough`              | `color/background/content-muted` |

**Prerequisites (push / 15c §0):**

- Local `_Doc/*` text styles (Section, TokenName, Code, Caption) bound to Typography mode-100 variables.
- 27 slot text styles published locally, each bound to `{Slot}/font-size`, `font-family`, `font-weight`, `line-height`.
- Theme chrome variables for table borders/backgrounds.

WO-012 **does not** create text styles — assumes WO-008 push + a `publishDocStyles()` helper (shared with WO-011, likely Sprint 3 bootstrap prep op) ran first. Builder throws a structured `CanvasBuildError` listing missing styles if `< 27` slot styles.

### 3. Token overview — scaffold refresh, not greenfield draw

Legacy Step 17 is an **update pass** on the `/new-project` 05d scaffold, not a from-scratch page builder.

**Page sections** (existing node names — builder finds or skips):

| Section shell                     | Purpose                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `token-overview/architecture`     | Five `arch-box/{Primitives,Theme,Typography,Layout,Effects}` — rebind fills    |
| `token-overview/platform-mapping` | Cross-collection platform-mapping table                                        |
| `token-overview/mode-row`         | Dark-mode + font-scale panels                                                  |
| `token-overview/how-to-bind`      | Static doc                                                                     |
| `token-overview/claude-commands`  | Static doc (sunsets in Figmint — replace with plugin Output pointer or delete) |

**Platform-mapping table** (`doc/table/token-overview/platform-mapping`):

- Columns (sum **1640**): TOKEN 400 · WEB 420 · ANDROID 340 · iOS 480.
- Minimum **22 rows** in `platform-mapping-rows.json` / `STEP17_MIN_PLATFORM_ROWS` — each row tagged with `collection` (`Theme`, `Typography`, `Primitives`, `Layout`, `Effects`).
- For each row `doc/table/token-overview/platform-mapping/row/{tokenPath}`:
  - Read live variable by path (via `variableMap` + `resolveCanonicalPath`).
  - Sync WEB/ANDROID/iOS cell text from variable `codeSyntax`.
  - Missing variable → `defaultHex` fallback or append ` · stale` to token cell.
- **§0.9 shadow hygiene:** strip all effects from platform-mapping subtree; elevation only on outer `token-overview/platform-mapping` shell.

**Other Step 17 passes:**

- Upgrade `_PageContent` text nodes to `_Doc/*` styles (heuristic by fontSize/weight).
- Apply `Effect/shadow-sm` to section shells (`token-overview/*`, `dark-mode-panel`, `font-scale-panel`) — **not** platform-mapping table.
- Rebind `phone-frame/light|dark` fills.
- Delete `placeholder/*` nodes; replace `TBD` text with resolved `color/primary/500` hex.

**Figmint delta vs legacy:**

- Remove `token-overview/claude-commands` section (agent-orchestration artifact) OR replace with static “Figmint Bootstrap” help — **recommend delete** during port; WO-015 UI owns commands.
- Font-scale panel: implement appendix bind (`scale-cell/{mode}` → Typography variable per mode) when time permits; mark optional in plan if scaffold nodes missing.

### 4. TokensV1 + pushed variables — data flow

```
TokensV1 (canonical input)
    │
    ├─► WO-008 pushTokens() ──► Figma variables + codeSyntax on each variable
    │
    ├─► (prep) publishDocStyles + slot text styles ──► Figma text styles
    │
    └─► WO-012 builders
            │
            ├─ ensureLocalVariableMapOnCtx()  ← live variables (authoritative paths)
            ├─ ensureCanonicalMapOnCtx()      ← alias resolution for theme paths
            ├─ indexCanonicalTokens(tokens)   ← expected paths, codeSyntax, counts
            └─ draw / refresh canvas nodes
```

| Field                                | Source at draw time                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Variable paths / IDs                 | Live `getLocalVariablesAsync()`                                                               |
| codeSyntax in platform-mapping cells | Live variable `codeSyntax` (set by WO-008/WO-009)                                             |
| codeSyntax in typography table       | Text style `codeSyntax` if set; else derive from style name; else `TokensV1` typography token |
| Specimen metrics (size/weight)       | Local text style properties (mode 100 bindings)                                               |
| Expected row/slot counts             | `typography-slots.json` semantics via `TokensV1` typography collection                        |
| Theme chrome paints                  | Bound variables (`color/border/subtle`, etc.)                                                 |

**Contract module:** export `CanvasBuildContext` from `src/core/canvas/types.ts`:

```ts
export interface CanvasBuildContext {
  tokens: TokensV1;
  pushResult?: PushResult;
  pageId?: string; // optional override; default findDesignOpsPage(slug)
}

export interface CanvasBuildResult {
  ok: boolean;
  builder: 'text-styles' | 'token-overview';
  durationMs: number;
  pageId: string;
  pageName: string;
  audit: AuditReportV1;
  stats: Record<string, number>; // row counts, cells updated, etc.
  errors?: string[];
}
```

### 5. WO-014 dependency (blocking)

WO-014 delivers:

- `resizeWithAutoLayout(node, w, h, sizing)` — §0.10 ordering from `00-gotchas.md`
- `rehugCell` / `rehugRow` — post-appendChild re-assert
- `columnSpec` widths per page (typography columns locked above)
- `buildOrder` — table build sequence from `11-cells-12-bindings-13-build-order.md`

**Build order for WO-012:** WO-014 must merge (or stub with same signatures in a shared branch) before WO-012 `/build`. Plan should schedule WO-014 Phase 1 ahead of WO-012, or WO-012 Phase 1 imports WO-014 helpers in the same Sprint 3 batch with explicit merge gate.

Ticket AC from WO-014: _"Every canvas builder (WO-011, WO-012, WO-013) imports from these helpers — no inline `resize()` calls."_

### 6. Audit compatibility — extend `scope: 'canvas'`

WO-010 ships `runAudit('variables')` only. WO-012 extends the engine per deferred Sprint 3 scope.

**New meta:**

```ts
operation: 'build-canvas-text-styles' | 'build-canvas-token-overview';
scope: 'canvas';
```

**Rule catalog (WO-012 subset from `14-audit.md`):**

| ruleId                                   | Source                     | Pass condition                                                                              |
| ---------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| `canvas/typography-table-exists`         | §14                        | `doc/table/typography/styles` + `body` present on Text Styles page                          |
| `canvas/typography-specimen-styles`      | §14 optional gate          | Every `text/specimen` under typography table has `textStyleId` matching expected slot style |
| `canvas/typography-row-count`            | 07-steps15a-15c            | ≥ 27 slot rows (+ 5 categories)                                                             |
| `canvas/token-overview-platform-table`   | §14                        | `doc/table/token-overview/platform-mapping` exists with § H hierarchy                       |
| `canvas/token-overview-no-double-shadow` | §0.9                       | Platform-mapping subtree: `effects=[]`, `effectStyleId=''`                                  |
| `canvas/token-overview-codesyntax-sync`  | Step 17                    | Minimum platform rows: WEB/ANDROID/iOS cells match live variable `codeSyntax`               |
| `canvas/token-overview-min-rows`         | platform-mapping-rows.json | All 22 minimum `tokenPath` values resolve or show documented fallback                       |
| `canvas/page-content-hug`                | §14 optional               | `_PageContent` not clipping tables (`badPageContent` / `badTableGroups` checks)             |

**Input to canvas audit:**

- `CanvasBuildResult.stats` (row counts, cells updated)
- Optional `FigmaCanvasSnapshot` — lightweight JSON snapshot of table node names + text content hashes (no screenshot); read via Plugin API walk, mock in Vitest.

**Integration:** each builder returns `{ …result, audit: await runAudit('canvas', { tokens, canvasSnapshot, buildResult }) }`. Bootstrap orchestrator (WO-015) checks `audit.passed` before marking style-guide complete.

Do **not** re-run variable-scope rules inside canvas builders — push audit already ran on `pushTokens()`.

### 7. Performance — bench < 3 s

**Reference timings (WO-005 / WO-008):**

| Operation                        | Median rate |
| -------------------------------- | ----------- |
| Full 400-var push (re-push skip) | 490 ms      |
| createVariable                   | 0.50 ms     |
| setValueForMode                  | 0.30 ms     |
| setVariableCodeSyntax            | 0.23 ms     |

**Canvas builder cost model:**

| Builder            | Dominant work                                                        | Estimated ops                             |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------- |
| `textStyles.ts`    | 32 rows × 7 cells × (createText + bind) + 1 buildTable               | ~250 node ops + font loads                |
| `tokenOverview.ts` | Walk existing page + sync ~22 rows × 3 cells + shadow/style upgrades | ~150 mutations (mostly text char updates) |

Font loading (`loadFontsForTextStyles` for 27 styles) is the main fixed cost — batch once per builder invocation.

**Bench harness:** add `src/core/canvas/bench.ts` mirroring `src/core/variables/bench.ts`:

- `benchTextStylesBuild(ctx)` → `{ durationMs, rowCount, auditPassed }`
- `benchTokenOverviewBuild(ctx)` → `{ durationMs, platformCellsUpdated, auditPassed }`

Log via `pluginLog()` (not `console.debug` — Figma main thread lacks it). Target: **p50 < 3000 ms each** on Plugin Sandbox post-push.

**Optimizations if bench fails:**

1. Suspend `_PageContent` autolayout during bulk insert (`layoutMode = 'NONE'` — already in legacy templates).
2. Detached `buildTable` pattern (append once — `_lib.js` C1).
3. Cache `getLocalTextStylesAsync()` / `getLocalVariablesAsync()` — single call per builder.
4. Skip no-op text updates in token overview (legacy already diffs `characters`).

---

## Recommendations

### For `/plan`

1. **Phase 0 — dependency gate:** WO-014 helpers merged; shared `src/core/canvas/lib/*` extracted (coordinate with WO-011 if parallel).
2. **Phase 1 — `textStyles.ts`:**
   - Port row discovery from runner fragment → `buildTypographyRowsFromTextStyles()`.
   - Port `buildTypographyRow` + `buildTable` call.
   - Vitest: row count, column widths sum, variant mapping, codeSyntax derivation (no Figma).
   - Figma integration test: mock `figma` globals or snapshot fixture.
3. **Phase 2 — `tokenOverview.ts`:**
   - Port `build()` from `token-overview.js` (platform sync, shadow hygiene, arch rebind).
   - Lift `STEP17_MIN_PLATFORM_ROWS` → `src/core/canvas/fixtures/platform-mapping-rows.ts` (from JSON).
   - Delete/skip `claude-commands` section cleanup.
4. **Phase 3 — audit + bench:**
   - Add `src/core/audit/rules/canvas-*.ts` (8 rules above).
   - Extend `runAudit` to accept `'canvas'` scope.
   - Bench script + ticket-folder `research/canvas-bench-result.md` template.
5. **Phase 4 — wire into ops:** export builders from `src/core/canvas/index.ts`; stub `build-style-guide` op step for WO-015 (full UI deferred).

### Refine ticket Requirements (applied in ticket.md)

- Modular lift paths (not `.mcp.js` bundles).
- Explicit 27+5 row model and mode-100 specimen rule.
- Token overview = platform-mapping sync + architecture (not full per-collection tables).
- WO-014 hard dependency; canvas audit rules; bench harness.
- Shared canvas lib modules with WO-011/WO-013.

### Testing strategy

| Layer       | Coverage                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Unit        | Row discovery sort, `csFor`/`readCS`, column width sums, variant detection, platform row fallback         |
| Snapshot    | `FigmaCanvasSnapshot` fixtures for audit rule pass/fail pairs                                             |
| Integration | Mock Plugin API: full `buildTextStyles` + `buildTokenOverview` return `ok: true`                          |
| Manual VQA  | Plugin Sandbox: push Foundations fixture → run both builders → visual compare to DesignOps reference file |

---

## Open Questions

1. **Doc/slot text style publisher:** Legacy Step 15c §0 creates `_Doc/*` + 27 slot styles before canvas draw. Should this live in WO-012, WO-008 push tail, or a shared `src/core/canvas/publishTypographyStyles.ts` used by WO-015 bootstrap? **Recommend:** shared prep module called by bootstrap orchestrator before any canvas builder — WO-012 assumes it ran.
2. **Font-scale panel binding:** Legacy appendix is optional. Include in WO-012 MVP or defer to WO-013/WO-015? **Recommend:** defer unless 05d scaffold nodes exist in Plugin Sandbox test file.
3. **`token-overview/claude-commands` section:** Delete on refresh or leave untouched? **Recommend:** delete placeholders + claude section; replace with single Figmint help caption.
4. **Parallel WO-011 lib extraction:** If WO-011 builds `src/core/canvas/lib/table.ts` first, WO-012 imports it. Plan should assign lib extraction to WO-011 Phase 0 or a shared Sprint 3 spike to avoid duplicate `_lib.js` ports.

---

## References

- `Docs/lift-sources.md` §3 — bundle sizes + modular source list
- `DesignOps-plugin/.../phases/07-steps15a-15c.md` — 27-row typography spec
- `DesignOps-plugin/.../phases/08-steps17-appendix.md` — Step 17 procedural spec
- `DesignOps-plugin/.../data/typography-slots.json` — 8 modes + body variants
- `DesignOps-plugin/.../data/platform-mapping-rows.json` — minimum platform rows
- `DesignOps-plugin/.../conventions/10-column-spec.md` — typography column widths
- `DesignOps-plugin/.../conventions/14-audit.md` — canvas audit checklist
- `.github/Sprint 2/WO-010-…/research/post-push-audit-rules.md` — `scope: 'canvas'` deferral
- `.github/Sprint 2/WO-008-…/research/push-bench-result.md` — timing baseline
