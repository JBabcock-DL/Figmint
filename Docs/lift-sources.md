# Lift Sources — DesignOps-plugin → FigHub

**Status:** Canonical sub-agent reference. Read this before any Sprint 2+ port work.
**Legacy repo (source):** `c:\Users\jbabc\Documents\GitHub\DesignOps-plugin\`
**Target repo (this one):** `c:\Users\jbabc\Documents\GitHub\FigHub\`
**Authority above this file:** `Docs/PRD.md` §17 (Sunset Plan), `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md` "Lift sources A–E"

> **The legacy repo is a Claude Code / Cursor _skill pack_ — Markdown orchestration + committed Plugin API JavaScript bundles. It is NOT a shipped Figma UI plugin.** ~80% of FigHub's deterministic logic can be ported by stripping MCP transport wrappers off the existing JS. The other ~20% (variable creation, REST calls) lives as agent-instruction prose in `phases/*.md` files and must be translated to TS, not copy-pasted.

---

## 0. Critical drift corrections (read first)

These are points where the breakdown plan / Sprint 1 ticket bodies say one thing and the actual legacy files say another. Sub-agents porting code should follow this section, not the ticket text, where they disagree.

| What the ticket says                                                                                                 | Reality                                                                                                                                                                                                                                                              | Correct lift source                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WO-005 "the variable push IS already written, just MCP-wrapped" in `step-15a-primitives.mcp.js`                      | `step-15a-primitives.mcp.js` is a **canvas-table builder** for the Primitives style-guide page. It calls `ensureLocalVariableMapOnCtx` to **read** variables that already exist, then binds paints via `setBoundVariableForPaint`. **It does NOT create variables.** | `skills/create-design-system/phases/04-step11-push.md` — Plugin API + REST instruction prose with the exact `createVariableCollection` / `addMode` / `setValueForMode` / REST-`UPDATE`-codeSyntax sequence. Plus `skills/create-design-system/data/theme-aliases.json` (theme variable data) and `phases/02-steps5-9.md` (per-collection variable lists).         |
| Legacy flow applies `codeSyntax` via two separate API layers (Plugin API for structure + REST PUT for `codeSyntax`). | That split is a **legacy MCP transport artifact** — the REST hop was necessary because Plugin API `codeSyntax` calls inflated `use_figma` payloads past the 50 kB cap.                                                                                               | **FigHub should use `figma.variables.setVariableCodeSyntax` in the Plugin API for both creation and codeSyntax** — no REST hop. The two-layer split disappears with the sandbox. (PRD §6.1 FR-BOOT-5, §11.3 networkAccess GitHub-only.)                                                                                                                           |
| "Lift the canvas bundles wholesale into TS modules."                                                                 | Each `.mcp.js` bundle is 44–57 KB / ~1k–1.5k lines, with inlined `_lib.js` + page template + runner glue. Lifting wholesale into one TS module is unmaintainable.                                                                                                    | Split per file: `_lib.js` becomes a shared `src/core/canvas/lib/` module; per-page templates (`primitives.js`, `theme.js`, etc.) become individual builders under `src/core/canvas/`; `_step*-runner.fragment.js` files are deleted (they are MCP glue). The `canvas-templates/<page>.js` SOURCE files (not the bundled `.mcp.js`) are the readable form to port. |
| "Just delete `*.min.mcp.js` files."                                                                                  | Correct, but also delete the **readable `.mcp.js`** files after their interior templates are ported — they are bundle wire format, not modular source. The canonical readable source is `canvas-templates/<page>.js`.                                                | Hard-delete list (Sprint 11): both `*.min.mcp.js` AND `*.mcp.js` bundles in `canvas-templates/bundles/`, all `*-runner.fragment.js`, `canvas-bundle-runner/` skill, payload scripts.                                                                                                                                                                              |

If the breakdown plan or a ticket disagrees with this section, this section wins. Update the ticket text in-place when correcting.

---

## 1. Repo identity & top-level docs

| File (legacy repo)         | Purpose                                                                                                                                                                                                                                                                           | Disposition                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                | Designer-facing product README: eight slash commands, token architecture (5 collections), workflow, handoff template, plugin tree layout, maintainer commands (`sync-cache`, `bundle-component`, `build:props`). Documents MCP-inline policy + Org-tier REST requirement.         | **Reference only.** Sunset PR (Sprint 11) rewrites this as a "FigHub companion" doc.                                                     |
| `CLAUDE.md`                | Claude Code bootstrap: always load `memory.md` + `AGENTS.md`; lazy-load skills; `/create-component` Step 6 = five sequential `canvas-bundle-runner` Tasks.                                                                                                                        | **Reference only.** Sunset rewrites to point at FigHub.                                                                                  |
| `AGENTS.md`                | Cross-host agent policy: **MCP anti-spiral**, 50 kB `use_figma.code` cap, ephemeral disk staging, `Task` → `canvas-bundle-runner` vs parent `Read` → `call_mcp`, session split (style-guide tables before components), table-fidelity gotchas (§0.5–0.7), marketplace cache sync. | **Most of this sunsets.** Keep §0.5–0.7 gotchas as inline TS comments in the canvas builders; delete the MCP anti-spiral body wholesale. |
| `memory.md`                | Token-dense workflow index: authority stack, end-to-end flow, session choreography, skills-at-a-glance, lazy-load map, maintainer npm commands.                                                                                                                                   | **Reference.** Sunset replaces this with a thin FigHub companion summary.                                                                |
| `docs/PRD-figma-plugin.md` | Earlier draft PRD for the replacement native plugin (then called `DesignOps-figma-plugin`). Same mission/contracts/phasing/sunset as FigHub.                                                                                                                                      | **Superseded by** `FigHub/Docs/PRD.md`. Treat the new repo's PRD as source of truth.                                                     |

### MCP anti-spiral concepts that disappear in FigHub

These exist solely because legacy agents call Figma via the MCP `use_figma` tool with inline `code`. The plugin sandbox removes all of them:

- **50 kB cap** on `use_figma.code` (plus full JSON tool-arg round-trip).
- **`canvas-bundle-runner`** subagent that reads one bundle per call.
- **Assembly / QA scripts:** `assemble-component-use-figma-code.mjs`, `check-payload.mjs`, `check-use-figma-mcp-args.mjs`, `probe-parent-transport.mjs`, `create-component-step6-all.mjs`.
- **`*.min.mcp.js`** wire-size bundle variants.
- **`scripts/sync-cache.sh`** plugin-cache mirror to `~/.claude/plugins/.../labs-design-ops/`.

**Do not port into FigHub** — MCP transport artifacts only. DesignOps-plugin repo cleanup is out of scope for FigHub tickets.

---

## 2. Skill inventory (9 skills) + FigHub disposition

Disposition cross-referenced to `Docs/PRD.md` §17.1. Read each `SKILL.md` linked path for the full source-of-truth behavior of the legacy skill before porting / replacing.

| #   | Skill                    | `SKILL.md` (legacy)                                | One-line purpose                                                                                                     | FigHub §17 disposition                                                                         |
| --- | ------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | **create-design-system** | `skills/create-design-system/SKILL.md`             | Collect brand tokens; push 5 variable collections; optional `tokens.css`; redraw style guide (15a–c, 17) + thumbnail | **Replaced** → Bootstrap tab (Sprint 3 + 4)                                                    |
| 2   | **new-project**          | `skills/new-project/SKILL.md`                      | Scaffold Foundations file in Drafts via MCP                                                                          | **Replaced** → plugin scaffold flow (Sprint 4)                                                 |
| 3   | **sync-design-system**   | `skills/sync-design-system/SKILL.md`               | One reconcile A→B→C (variables, components, Code Connect)                                                            | **Thin Claude skill** consuming `drift-report.v1.md`; plugin does the detection (Sprint 6)     |
| 4   | **create-component**     | `skills/create-component/SKILL.md` + `EXECUTOR.md` | shadcn install + five-call Figma doc draw                                                                            | **Forward path replaced** by plugin (Sprint 5). shadcn CLI side stays as agent / external CLI. |
| 5   | **code-connect**         | `skills/code-connect/SKILL.md`                     | Map Figma components to code; publish after review                                                                   | **Replaced** → plugin PR stubs + CI publish (Sprint 8+)                                        |
| 6   | **dev-handoff**          | `skills/dev-handoff/SKILL.md`                      | Design context → GitHub/Jira ticket                                                                                  | **Thin Claude skill** consuming `handoff-context.v1.md` (Sprint 7)                             |
| 7   | **accessibility-check**  | `skills/accessibility-check/SKILL.md`              | WCAG 2.1 AA + iOS/Android scale clones                                                                               | **Deprecated** → Figma Agent (legacy repo; no FigHub WO)                                       |
| 8   | **new-language**         | `skills/new-language/SKILL.md`                     | Duplicate frame → locale page; inline translation                                                                    | **Deprecated** → Figma Agent (legacy repo; no FigHub WO)                                       |
| 9   | **canvas-bundle-runner** | `skills/canvas-bundle-runner/SKILL.md`             | Run one committed bundle or assembled cc-\* file                                                                     | **Do not port** — MCP transport only (legacy repo; no FigHub WO)                               |

---

## 3. Canvas bundle reference — sizes + what they actually contain

> ⚠️ **Sub-agent context warning.** Each readable bundle is 44–57 KB / ~1k–1.5k lines, mostly inlined `_lib.js` + page template + runner. Minified copies sit **just under** the 50 kB MCP cap. **Do not load more than one bundle into a single agent context.** When porting, prefer the modular source files at `canvas-templates/<page>.js` over the bundled `.mcp.js`.

### Variables vs Canvas — where logic lives

| Concern                                                                                    | Lives in                                                                                                                                      | FigHub target                                                                            |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Variable creation** (5 collections, modes, aliases, codeSyntax)                          | `skills/create-design-system/phases/04-step11-push.md` + per-collection variable lists in `phases/02-steps5-9.md` + `data/theme-aliases.json` | `src/core/variables/` (Sprint 2: WO-007 adapters, WO-008 push engine, WO-009 codeSyntax) |
| **Style-guide canvas tables** (color, theme, layout, effects, text styles, token overview) | `canvas-templates/<page>.js` + bundled `canvas-templates/bundles/step-15*.mcp.js` + `step-17-token-overview.mcp.js`                           | `src/core/canvas/*.ts` (Sprint 3: WO-011..013)                                           |
| **Component scaffold doc draw**                                                            | `create-component/canvas-templates/bundles/component-*.mcp.js` + `create-component/EXECUTOR.md` + `conventions/03-auto-layout-invariants.md`  | `src/core/components/scaffold/archetypes/*.ts` (Sprint 5: WO-022..027)                   |

### Style-guide bundles

| Source (legacy)                 | Lines | Bytes  | Min bytes | FigHub target (Sprint 3)                                                                                                   |
| ------------------------------- | ----- | ------ | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `step-15a-primitives.mcp.js`    | 1,314 | 57,033 | 40,860    | `src/core/canvas/colorTables.ts` (WO-011) — Primitives page (color ramps, space, radius, elevation, typeface, font-weight) |
| `step-15b-theme.mcp.js`         | 1,163 | 49,916 | 35,351    | `src/core/canvas/themeTables.ts` (WO-011) — Theme page (7 semantic group tables; Light/Dark dual-preview swatches)         |
| `step-15c-layout.mcp.js`        | 1,073 | 45,506 | 32,469    | `src/core/canvas/layout.ts` (WO-013) — Layout page (spacing + radius alias tables)                                         |
| `step-15c-text-styles.mcp.js`   | 1,059 | 43,871 | 31,626    | `src/core/canvas/textStyles.ts` (WO-012) — typography specimen (27 rows + sub-headers)                                     |
| `step-15c-effects.mcp.js`       | 1,209 | 50,186 | 36,059    | `src/core/canvas/effects.ts` (WO-013) — Effects page (shadow tier + shadow color rows; Light/Dark)                         |
| `step-17-token-overview.mcp.js` | 1,087 | 45,767 | 32,848    | `src/core/canvas/tokenOverview.ts` (WO-012) — Token Overview specimen + platform-mapping table                             |

**Modular source files** (preferred porting input): `canvas-templates/_lib.js`, `primitives.js`, `theme.js`, `layout.js`, `text-styles.js`, `effects.js`, `token-overview.js`. The `bundles/*.mcp.js` files are wire-format concatenations of those plus a runner fragment.

### Component archetype bundles (Sprint 5)

| Archetype       | Source (legacy)                  | Lines | Bytes  | FigHub target                                     |
| --------------- | -------------------------------- | ----- | ------ | ------------------------------------------------- |
| `chip`          | `component-chip.mcp.js`          | 1,064 | 45,046 | `src/core/components/scaffold/archetypes/chip.ts` |
| `control`       | `component-control.mcp.js`       | 1,477 | 61,549 | `archetypes/control.ts`                           |
| `composed`      | `component-composed.mcp.js`      | 1,456 | 59,958 | `archetypes/composed.ts`                          |
| `container`     | `component-container.mcp.js`     | 1,574 | 64,760 | `archetypes/container.ts`                         |
| `field`         | `component-field.mcp.js`         | 1,561 | 64,977 | `archetypes/field.ts`                             |
| `row-item`      | `component-row-item.mcp.js`      | 1,512 | 62,600 | `archetypes/rowItem.ts`                           |
| `surface-stack` | `component-surface-stack.mcp.js` | 1,560 | 64,576 | `archetypes/surfaceStack.ts`                      |
| `tiny`          | `component-tiny.mcp.js`          | 1,481 | 61,507 | `archetypes/tiny.ts`                              |

**Pipeline bundles** (5-call Step 6 sequence): `scaffold.mcp.js`, `properties.mcp.js`, `matrix.mcp.js`, `usage.mcp.js`, plus `cc-*` assembled files in `scripts/test-fixtures/.step6-orchestration-out/`. The 5-call sequence is an MCP-payload-budget artifact — FigHub executes the full pipeline in one Plugin API call.

**Runner fragments to delete (do NOT port):** `bundles/_step15a-runner.fragment.js`, `_step15b-runner.fragment.js`, etc. — MCP glue only.

---

## 4. Convention shards → TS helpers

Each markdown convention shard becomes a TypeScript helper in FigHub (per breakdown plan **Table B**). The rule moves from prose-the-LLM-must-remember to executable code.

### `skills/create-design-system/conventions/`

| Shard                                      | Rule                                                                                                                              | FigHub target                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `00-gotchas.md`                            | Hug-before-resize; header≠body cells; bound swatch paints; theme hex sibling; TOC exceptions; §0.10 resize-then-sizing-mode order | `src/core/canvas/helpers/autoLayout.ts` (WO-014) |
| `01-collections.md`                        | Exactly five collections (Primitives, Theme, Typography, Layout, Effects) + mode strategy                                         | `src/core/variables/collections.ts` (WO-008)     |
| `02-codesyntax.md`                         | WEB `var(--*)`, ANDROID kebab M3, iOS dot paths; theme syntax from tables, not paths                                              | `src/core/variables/codeSyntax.ts` (WO-009)      |
| `03-through-07-geometry-and-doc-styles.md` | 1800 canvas, 1640 tables, page list, `Doc/*` styles, body text variants                                                           | canvas builder helpers (Sprint 3)                |
| `08-hierarchy-and-09-autolayout.md`        | Table hierarchy; counter-axis AUTO; anti-10px-collapse                                                                            | `src/core/canvas/helpers/autoLayout.ts` (WO-014) |
| `10-column-spec.md`                        | Per-page column widths summing to 1640                                                                                            | table builders (Sprint 3)                        |
| `11-cells-12-bindings-13-build-order.md`   | Cell recipes, binding map, strict build order                                                                                     | table builders (Sprint 3)                        |
| `14-audit.md`                              | Post-build audit checklist                                                                                                        | `src/core/audit/runAudit.ts` (WO-010)            |
| `foundations-shell-and-preflight.md`       | Tier 3 shell, `schemaVersion: 1` preflight, manifest warnings                                                                     | bootstrap preflight (Sprint 4)                   |
| `16-mcp-use-figma-workflow.md`             | **SUNSET — DO NOT PORT** (MCP transport prose)                                                                                    | —                                                |
| `17-table-redraw-runbook.md`               | **SUNSET — DO NOT PORT** (slug → `.min.mcp.js` map)                                                                               | —                                                |

### `skills/create-component/conventions/`

| Shard                          | Rule                                                                | FigHub target                                                 |
| ------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `00-overview.md`               | Router; Mode A (CVA extraction) vs Mode B (synthetic); glossary     | reference only                                                |
| `01-config-schema.md`          | `CONFIG` / `ctx` shape used by scaffold                             | informs `packages/contracts/src/componentSpec.v1.ts` (WO-003) |
| `02-archetype-routing.md`      | `layout` field → builder dispatch (`chip`, `field`, `control`, ...) | `src/core/components/scaffold/archetypes/index.ts` (WO-022)   |
| `03-auto-layout-invariants.md` | Matrix specimen counter AUTO + minHeight; doc usage row sizing      | `src/core/components/scaffold/matrixSpecimen.ts` (WO-022)     |
| `04-doc-pipeline-contract.md`  | 5-section doc frame; matrix layout; build order                     | scaffold pipeline (Sprint 5)                                  |
| `05-code-connect.md`           | Mode A CVA extraction vs Mode B synthetic Code Connect              | import/scaffold metadata (Sprint 8)                           |
| `06-audit-checklist.md`        | Per-component draw audit                                            | `src/core/components/scaffold/audit.ts` (Sprint 5)            |
| `07-token-paths.md`            | Canonical Figma variable paths; ban guessed paths                   | `src/core/variables/tokenPaths.ts` (WO-007)                   |

---

## 5. Schemas to lift (Sprint 1, WO-003)

| File (legacy)                                                          | Top-level shape                                                                                                                                                                                            | Lift target                                                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `skills/create-component/registry.schema.json` (~33 lines JSON Schema) | Required: `fileKey`, `components` (map of name → `{ nodeId, key, pageName, publishedAt, version, optional cvaHash, composedChildVersions }`)                                                               | `packages/contracts/src/registry.v1.ts` (also defines on-disk `.fighub-registry.json` shape)                      |
| `skills/create-component/shadcn-props.schema.json` (~148 lines)        | Component entry map; `$defs` for `composeEntry` / `componentEntry` with `pageName`, `labelKey`, `summary`, `category`, `layout` enum, archetype specs, `properties[]`, `usageDo`/`usageDont`, `composes[]` | `packages/contracts/src/componentSpec.v1.ts`                                                                      |
| `skills/create-component/shadcn-props.json` (~79 KB, 59 components)    | Monolith keyed by kebab component name; mirrors split dir `shadcn-props/*.json` + `_index.json`                                                                                                            | Phase 2 (Sprint 5+) scaffold input — reuse as fixture data; regenerate via legacy `npm run build:props` if needed |

Per-component splits at `skills/create-component/shadcn-props/*.json` (300 B – 3 KB each) are the modular source.

---

## 6. Scripts & templates — port / reference / delete

### `c:\Users\jbabc\Documents\GitHub\DesignOps-plugin\scripts\`

| Script                                                                 | Tag                              | Why                                                        |
| ---------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| `assemble-component-use-figma-code.mjs`                                | **DELETE**                       | PRD §17.2 — MCP assembly                                   |
| `check-payload.mjs`                                                    | **DELETE**                       | PRD §17.2                                                  |
| `check-use-figma-mcp-args.mjs`                                         | **DELETE**                       | PRD §17.2                                                  |
| `probe-parent-transport.mjs`                                           | **DELETE**                       | PRD §17.2                                                  |
| `sync-cache.sh`                                                        | **DELETE**                       | PRD §17.2                                                  |
| `verify-cache.sh`                                                      | **DELETE**                       | Cache mirror only                                          |
| `measure-sigma.mjs`                                                    | **DELETE**                       | Breakdown §E                                               |
| `create-component-step6-all.mjs`                                       | **DELETE**                       | MCP Step 6 orchestration                                   |
| `qa-assembled-size.mjs`                                                | **DELETE**                       | MCP size QA                                                |
| `bundle-component-mcp.mjs`                                             | **KEEP-REFERENCE** then discard  | Understand bundle layout                                   |
| `skills/create-design-system/scripts/bundle-canvas-mcp.mjs`            | **KEEP-REFERENCE**               | Same, style-guide side                                     |
| `assemble-sync-changelog-figma.mjs`                                    | **KEEP-REFERENCE**               | Changelog assembly pattern → optional plugin op (Sprint 6) |
| `build-shadcn-props.mjs`                                               | **PORT** (or replace)            | Data pipeline for shadcn manifest                          |
| `split-shadcn-props.mjs`                                               | **KEEP-REFERENCE**               | One-time migration                                         |
| `build-create-component-docs.mjs`                                      | **KEEP-REFERENCE**               | Agent-side docs generation                                 |
| `build-config-block.mjs`                                               | **KEEP-REFERENCE**               | CONFIG projection                                          |
| `config-projection.mjs` + `config-projection-map.json`                 | **PORT** patterns                | Mode A → CONFIG mapping                                    |
| `validate-tokens.mjs`                                                  | **PORT**                         | Token validation (WO-010 audit)                            |
| `validate-config-sync.mjs`                                             | **PORT**                         | CONFIG ↔ props sync                                        |
| `cache-tokens.mjs`                                                     | **KEEP-REFERENCE**               | Token caching for agents                                   |
| `qa-assemble-component-code.mjs`                                       | **PORT** patterns → FigHub tests |                                                            |
| `qa-create-component-skill.mjs`                                        | **PORT** patterns → unit tests   |                                                            |
| `qa-config-projection.mjs`                                             | **PORT** patterns                |                                                            |
| `qa-foundations-shell-manifest.mjs`                                    | **PORT** patterns                |                                                            |
| `qa-lively-oasis-contract.mjs`                                         | **PORT** patterns                |                                                            |
| `qa-visual-diff.mjs`                                                   | **PORT** patterns                | Visual regression ideas                                    |
| `designops-canvas-session.mjs`                                         | **KEEP-REFERENCE**               | Session manifest                                           |
| `probe-page.mjs`                                                       | **KEEP-REFERENCE**               | Debug                                                      |
| `mcp-inline-args.txt`, `mcp-args-oneline.txt`, `outfull-mcp-args.json` | **DELETE**                       | Local MCP experiments                                      |
| `test-fixtures/**`                                                     | **KEEP-REFERENCE**               | QA fixtures for porting tests                              |

### `c:\Users\jbabc\Documents\GitHub\DesignOps-plugin\templates\`

| File               | Tag                | Notes                                                                                             |
| ------------------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| `agent-handoff.md` | **REPLACE**        | Evolves to FigHub contract + plugin I/O; fields `active_file_key`, `token_css_path`, `open_items` |
| `workflow.md`      | **KEEP-REFERENCE** | Agent-side workflow prose; FigHub has its own                                                     |

---

## 7. Recommended read order for porting sub-agents

When picking up a Sprint 2+ port ticket, read in this order — **never load all canvas bundles into one context**:

1. `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md` — Lift sources A–E (find your ticket's lift map row).
2. `FigHub/Docs/PRD.md` — §6 (functional reqs), §8 (data contracts), §17 (sunset).
3. `FigHub/Docs/lift-sources.md` (this file) — §0 corrections + your domain section.
4. **For variables (Sprint 2):** `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` (primary), then `phases/02-steps5-9.md` (per-collection variable lists), then `conventions/01-collections.md` + `02-codesyntax.md`.
5. **For canvas (Sprint 3):** One bundle at a time. Prefer the unbundled source `canvas-templates/<page>.js` over the `.mcp.js` wire format. Read `_lib.js` once; cross-reference helper calls against `conventions/00-gotchas.md` §0.7 (paint binding) and `08-hierarchy-and-09-autolayout.md`.
6. **For components (Sprint 5):** `create-component/EXECUTOR.md` (pipeline), then `conventions/01-config-schema.md` (CONFIG shape), then one archetype bundle (start with `component-chip.mcp.js` — smallest).
7. **For contracts (Sprint 1 WO-003):** `registry.schema.json`, `shadcn-props.schema.json`, one sample `shadcn-props/<name>.json`.

---

## 8. Quick reference: PRD §17 disposition table

| Legacy artifact                                                                                                          | FigHub disposition                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `/new-project`, `/create-design-system` skills                                                                           | Replaced by plugin UI (Sprint 4)                                                                           |
| `/create-component` forward draw                                                                                         | Plugin scaffold (Sprint 5)                                                                                 |
| `/sync-design-system`                                                                                                    | Thin agent skill consuming `drift-report.v1` (FigHub emits doc; legacy skill stays in DesignOps-plugin)    |
| `/dev-handoff`                                                                                                           | Thin agent skill consuming `handoff-context.v1` (FigHub emits doc; legacy skill stays in DesignOps-plugin) |
| `/code-connect`                                                                                                          | Plugin PR emission + CI publish (Sprint 8)                                                                 |
| `/accessibility-check`, `/new-language`                                                                                  | Deprecated → Figma Agent (legacy repo; no FigHub WO)                                                       |
| `/canvas-bundle-runner` + payload scripts + `.min.mcp.js` + `sync-cache.sh` + `measure-sigma.mjs`                        | Do not port — MCP transport only (legacy repo; no FigHub WO)                                               |
| `AGENTS.md` MCP anti-spiral body + `conventions/16-mcp-use-figma-workflow.md` + `conventions/17-table-redraw-runbook.md` | Do not port — MCP transport only (legacy repo; no FigHub WO)                                               |

---

## 9. Cross-references

- **PRD (full spec):** `Docs/PRD.md`
- **Sprint roadmap:** `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
- **Project board:** [FigHub Project #9](https://github.com/users/JBabcock-DL/projects/9)
- **Workflow / IDs:** `.github/templates/workflow.md`
- **Cross-ticket memory:** `memory.md`

If you find new drift between a ticket and the actual legacy source while porting, add a row to §0 of this file and update the ticket text. Sub-agents read this file first.
