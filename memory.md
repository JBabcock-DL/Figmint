# Project memory (claude-ops)

<!-- This file is part of the dl-agent workflow. See CLAUDE.md (repo root) for mandatory read/update rules. -->

## Plugin workspace vs consumer repo

- **Developing `labs-agent-workflow`:** **`PLUGIN_ROOT`** is discovered dynamically — **`skills/conventions/01-plugin-root-and-templates.md`**. Never assume paths from another machine.
- **Consumer project (after `/project-start`):** **`REPO_ROOT/.github/templates/`** usually holds configured **`workflow.md`** and copies of **`agent-handoff.md`** — still resolve via that convention when reading so IDE-only opens work without copying templates.

---

## Instructions for agents (obligatory when this file exists)

You **must** do this without the user having to ask:

1. **Read this file** at the start of any session, subagent, or skill run that does ticket or repo work, **before** deep-diving a single ticket—unless the user is only doing an unrelated one-off. Then resolve and read **`workflow.md`** per **`skills/conventions/01-plugin-root-and-templates.md`** for the full spec.
2. **Update this file** when you learn something stable and reusable: backend IDs, Jira/phase quirks, team git preference, "always use" commands, or a mistake to avoid. Keep each bullet short; do not paste whole tickets or long plans here.
3. **Do not** move `plan.md` / `ticket.md` / `research/` content into here—`memory.md` is for **cross-ticket** facts only.

---

## Quick reference

- **Project goal (one line):** Native Figma plugin for design system management, component architecture, and design token workflows — a **deterministic context bridge between agents** (zero LLM tokens inside the plugin)
- **Ticket backend:** `github` — from `workflow.md` **## Ticket Backend** → Backend
- **Default branch / PR target:** `main`
- **Current sprint folder:** `.github/Sprint 3/` — **Sprint 3 complete** (VQA refresh 2026-05-27): WO-011–015 all **Completed** on Project #9. E2E bootstrap verified on Plugin Sandbox with `bootstrap-complete` (~17.5 s, all 12 steps `done`). **Documentation** variable collection drives style-guide table chrome (not Theme semantic aliases).
- **Stack / runtimes:** Figma Plugin API, TypeScript strict, **Node 22 LTS** (`engines.node: ">=22.0.0"` — bumped from 20 during Sprint 1 research reconciliation; Node 20 EOL'd 2026-04-30; WO-003's JSON Schema generator + WO-004's ESLint 10 / typescript-eslint v8 both require ≥22), Vite (raw — locked WO-002); React 19 UI shell; planned workspace package `@detroitlabs/figmint-contracts`
- **This repo is:** Figmint application codebase — native Figma plugin that supersedes the agent-driven `DesignOps-plugin` workflow
- **PRD (full product spec):** `Docs/PRD.md` (18 sections, ~900 lines — read §6 functional reqs, §8 contracts, §12 phasing, §17 sunset first)
- **Sub-agent lift-source map:** `Docs/lift-sources.md` — **CANONICAL** for any port work from `DesignOps-plugin`. Catches drift between the breakdown plan and the actual legacy source. Read §0 (drift corrections) before opening any `.mcp.js` file.
- **Sprint roadmap + Sprint 1 breakdown (canonical plan):** [breakdown-the-plan-and-mellow-whale.md](file:///C:/Users/jbabc/.claude/plans/breakdown-the-plan-and-mellow-whale.md) — lives at `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`. Contains the full multi-sprint roadmap, per-ticket lift-source pointers into `DesignOps-plugin`, and locked architectural decisions. **Read alongside the per-ticket `ticket.md` before any `/research`, `/plan`, or `/build`.**
- **Legacy lift source (do not rebuild from scratch):** `c:\Users\jbabc\Documents\GitHub\DesignOps-plugin\` — Claude Code / Cursor skill pack (Markdown orchestration + committed Plugin API JS bundles). ~80% portable by stripping MCP transport. See `Docs/lift-sources.md` for the file-by-file map + size warnings.
- **Project board (GitHub):** [Figmint Project #9](https://github.com/users/JBabcock-DL/projects/9) — 55 tickets live (WO-001 Completed; WO-002..054 + CTX-002 in Context Backlog).

### Sprint 1 state (snapshot 2026-05-27)

Sprint 1 build phase done; ready for `/vqa` + ticket closure.

| Ticket  | Title                                                              | Status                                     | Depends on        |
| ------- | ------------------------------------------------------------------ | ------------------------------------------ | ----------------- |
| WO-001  | Configure project goal in workflow.md                              | **Completed**                              | —                 |
| WO-002  | Bootstrap Figmint TypeScript + Vite plugin scaffold                | **Build complete** (CI green)              | none (foundation) |
| WO-003  | Set up `@detroitlabs/figmint-contracts` workspace package          | **Build complete** (CI green)              | WO-002            |
| WO-004  | Minimal CI pipeline (lint + typecheck + build)                     | **Build complete** (CI green)              | WO-002, WO-003    |
| WO-005  | Phase 0 spike — variable push + EVC validation + latency benchmark | **Build complete** — verdict: **G1 = YES** | WO-002            |
| CTX-002 | Canonical internal token model — decision capture                  | **Ready for promotion** to Sprint 2 WO     | WO-005 (informs)  |

**WO-005 headline finding (2026-05-27 spike execution):** spike-400 median push = **606 ms** (10% of the <6000 ms YES threshold). Per-call rates at n=400: createVariable 0.50 ms · setValueForMode 0.30 ms · setVariableCodeSyntax 0.23 ms. Full 5-collection extrapolation: ~904 ms (~3% of G1 budget). EVC Test 1 plan-gate PASS with documented `"enterprise plan"` error text; Tests 2–4 UNTESTED-ON-PLAN (Pro/Org sandbox; deferred to Enterprise follow-up). **Sprint 2 architecture commit unblocked.** Full results: `.github/Sprint 1/WO-005-…/research/spike-execution-log.md`.

Sprints 2–11 ticket bodies (WO-006..054) live in `.github/Sprint {N}/`. Bootstrap script (`scripts/bootstrap-sprints-2-11.py`) was a one-off; do NOT re-run (not idempotent).

---

## Where everything lives (paths)

- **Global workflow + IDs:** **`workflow.md`** — resolve per **`skills/conventions/01-plugin-root-and-templates.md`** (typically **`REPO_ROOT/.github/templates/workflow.md`** after **`/project-start`**, else **`PLUGIN_ROOT/templates/workflow.md`**)
- **Plan quality bar:** **`.github/templates/plan-quality-bar.md`** — plans must be detailed enough for **build sub-agents** to execute from `plan.md` alone, grounded in the **parent `ticket.md`** (requirements + AC traceability)
- **Handoff / new sessions:** **`agent-handoff.md`** — same resolution rules
- **Per ticket:** `.github/Sprint {N}/{TICKET-ID}-{slug}/ticket.md` + `plan.md` + optional `research/`, `scripts/`
- **Skills (slash commands):** `.claude/skills/{skill}/SKILL.md` — _after `/project-start` these are the copies in this repo; developing the plugin may use a marketplace path instead_

---

## Ticket types & guards

| Type       | ID prefix | `plan.md`             | `research` | Notes                                                                                                                            |
| ---------- | --------- | --------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Bug        | `BUG-###` | yes (stub+)           | common     |                                                                                                                                  |
| Work order | `WO-###`  | yes (stub+)           | common     |                                                                                                                                  |
| Context    | `CTX-###` | **no** until promoted | often      | **Intake only**—promote with `/create-ticket promote CTX-###` or `/create-backlog` before `/research`, `/plan`, `/build`, `/vqa` |

- **Interactive intake:** **`create-ticket`** and **`/dev-handoff` → ClaudeOps** collect **ticket type** (and title) **before** the optional "additional notes for the engineer" prompt so the body follows **`bug_report.md`** / **`work_order.md`** / **`context.md`**.

---

## Lifecycle & phases (order)

1. **Intake (optional):** `/create-ticket ctx` → raw notes
2. **Triage (optional):** `/create-backlog` or `/create-ticket promote` → `bug` or `wo`
3. **Create (if needed):** `/create-ticket` bug|wo
4. **Research (optional):** `/research`
5. **Plan:** `/plan` — read **parent `ticket.md` first**; write `plan.md` per **`.github/templates/plan-quality-bar.md`**: every requirement + AC traceable to a step; sub-agent-ready detail (paths, signatures, **Done when**); phased `## Build Agents`; not stubs. Report `wc -l plan.md` in handoff.
6. **Build:** `/build` (or domain skills: `code-build`, `doc-build`, `script-build`, `api-build`, `figma-build`)
7. **Verify:** `/vqa`
8. **Onboarding / fresh session:** `/new-agent` (optional)

**Phases (conceptual order):** Context Backlog → In Research → In Planning → In Build → In Review → Completed

- **GitHub:** single **Status** field on the Project (column IDs in `workflow.md`)
- **Jira:** `phase:*` **labels** (not Status)—see `workflow.md` Jira table

---

## Build & git (saves context on repeat runs)

- **`/build` orchestrator** reads `## Build Agents` in `plan.md` and spawns domain agents in **phased parallel** (all domains in a phase in parallel; phases sequential).
- **Git strategy** (asked at `/build` or per domain skill if run alone):
  - **`branch-per-agent`:** each domain uses `{TICKET-ID}/{code|docs|scripts|api|figma}` or combined tickets per agent section—follow the skill. Needs **separate worktrees** for safe parallel work.
  - **`main`:** work on current branch; **do not** auto-commit/PR; user reviews uncommitted files.

  - **Default git strategy for this repo:** `main` (locked 2026-05-27). Build agents work on the current branch and leave changes **uncommitted** for the user to review and commit. Do NOT auto-PR; do NOT spin up per-agent branches unless the user explicitly opts in for a specific ticket.
  - **Worktrees:** Not configured. Stay on a single branch per ticket.

---

## MCP & external tools (names only, no secrets)

- **GitHub:** `gh` CLI; Board mutations per `workflow.md` **Key Commands (GitHub)**
- **Jira / Confluence:** Atlassian MCP (tool names in server descriptor)
- **Figma (optional):** Figma MCP for canvas; map URL in `ticket.md` **References**
- **Figma sandbox file (locked 2026-05-27):** [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox?node-id=0-1) — `file_key=cVdPraIafWFBRZnzMPhtrW`, root `node_id=0:1`, **Pro/Org tier** (NOT Enterprise). Default scratch file for any Figmint ticket that needs to test variables, components, or Plugin API calls. WO-005 Phase 0 spike runs here; EVC inheritance/override/revert tests stay **untested on this plan** (Test 1 `extend()` plan-gate throw is still in scope and counts as PASS).
- **Other (project-specific):** _e.g. Datadog, Sentry, Linear_

---

## Conventions (this repo's agreements)

- **TypeScript strict mode** everywhere (`strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`) — locked by WO-002 acceptance criteria.
- **Workspace layout** matches PRD §7.3 — `src/{core,ops,io,contracts,ui,config}` + `packages/contracts/` workspace. Do NOT invent alternative folder structures.
- **Contracts are versioned literals.** Every contract type has a `v: 1` discriminator; bump = add `v2` alongside `v1` (never breaking change).
- **No LLM calls inside the plugin runtime** (PRD G5 / §11.2). This is a plugin-architecture goal, not a hard ban on user inputs — designers may freely paste in JSON / Markdown that they generated via Claude or any other LLM upstream. The constraint is that the plugin itself never consumes LLM tokens on the user's behalf. If a feature seems to need an LLM call from inside the plugin, it belongs in an agent-side skill consuming a Figmint contract document instead.
- **Always preview, never silent-apply** (PRD §11.4) — any deterministic-uncertainty case requires explicit designer confirmation; record decisions in the audit log.
- **No third-party network calls beyond GitHub API + Figma Plugin API.** `manifest.networkAccess.allowedDomains` is GitHub-only.
- **Dev UI stays visible early** (2026-05-27): Bootstrap tab keeps bundled sample-token dropdown, bench helpers, etc. **always on** — do not gate behind `import.meta.env.DEV` or per-build flags until a dedicated pre-release cleanup ticket strips them.
- **Bootstrap sample tokens:** default dropdown = **`bootstrap-complete`** (`src/core/variables/__fixtures__/bootstrap-complete.v1.json`, regenerate via `node scripts/generate-bootstrap-fixture.mjs`) — **167 tokens across all 5 collections**. **`spike-400`** is push-latency bench only (400 primitive colors). Figma file still needs style-guide **pages** + **Effect/shadow-*** styles for canvas steps (separate from token fixture).

---

## Phrases, products, and acronyms

- **Figmint** — Native Figma plugin; deterministic context bridge between agents for design system work
- **DesignOps-plugin** — Legacy agent-driven workflow being superseded by Figmint (see `Docs/PRD.md` §17 sunset plan)
- **EVC** — Figma's Extended Variable Collections (Plugin API Update 121, 2025-11-20). **Enterprise-only** at every API layer (`VariableCollection.extend()` throws on Pro/Org/Starter — confirmed by WO-005 research). API surface: `collection.extend(name)`, `extension.variableOverrides`, `variable.removeOverrideForMode(extendedModeId)`, `extension.removeOverridesForVariable(variableId)`. **Canonical token model stays plan-agnostic; EVC = optional render-time projector** for Enterprise files only (per WO-005 research §5 — CTX-002 should adopt this).
- **5-collection model** — Primitives / Theme / Typography / Layout / Effects (PRD §6.1 FR-BOOT-3 + `DesignOps-plugin/skills/create-design-system/conventions/01-collections.md`)
- **codeSyntax** — Per-platform variable codeSyntax: WEB `var(--*)`, ANDROID kebab-case M3, iOS dot paths. Replaces platform alias collections — no per-platform collections exist in the model.
- **Forward path** — Component scaffold direction: spec → Figma. **Reverse path** — Component import: code source → component-spec → Figma.
- **Snapshot** — Per-key "last synced" record stored in canvas pluginData on a hidden node in the Figmint Output page; baseline for 3-way drift detection (PRD §6.4 FR-DRIFT-1).
- **Ops protocol** — JSON ops-program-v1 contract between any shell (UI / agent / CLI) and the deterministic core (PRD §9).

---

## Plan quality bar (mandatory)

- **Full spec:** `.github/templates/plan-quality-bar.md`
- **Core rule:** `plan.md` = execution contract for **build sub-agents**; ground in **parent `ticket.md`** (requirements + acceptance criteria → numbered steps); sub-agents should not need to re-read ticket or research
- **Reject:** stubs, “TBD”, steps without **Done when** or file paths

---

## Do not repeat (dead ends, incidents, or decisions)

- **Don't ship thin `/plan` stubs** and move to In Planning — sub-agents drift from the parent ticket. Expand per **plan-quality-bar.md** until every ticket requirement/AC maps to a step.
- **Don't lift variable-push code from `step-15a-primitives.mcp.js`.** That file is a canvas-table builder — it reads variables that already exist. The actual `createVariableCollection` / `addMode` / `setValueForMode` / `setVariableCodeSyntax` sequence lives in `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` (+ per-collection variable lists in `phases/02-steps5-9.md`). The breakdown plan + WO-005 ticket have been corrected; see `Docs/lift-sources.md` §0.
- **Don't preserve the legacy two-layer (Plugin API + REST `codeSyntax`) variable push.** That split exists only because the MCP `use_figma.code` payload had a 50 kB cap. The plugin sandbox uses Plugin API end-to-end via `figma.variables.setVariableCodeSyntax`. (`Docs/lift-sources.md` §0.)
- **Don't load multiple `canvas-templates/bundles/*.mcp.js` files into one agent context.** Each is 44–57 KB / 1k–1.5k lines and inlines `_lib.js` + page template + runner. Read ONE at a time, prefer the modular `canvas-templates/<page>.js` source over the bundle, and never `*.min.mcp.js`. (`Docs/lift-sources.md` §3.)
- **Don't port `skills/canvas-bundle-runner/`, `scripts/{check-payload,probe-parent-transport,check-use-figma-mcp-args,assemble-component-use-figma-code,sync-cache,measure-sigma,create-component-step6-all,qa-assembled-size}*`, the `AGENTS.md` MCP anti-spiral body, `conventions/16-mcp-use-figma-workflow.md`, or `conventions/17-table-redraw-runbook.md`.** They exist only because of MCP transport. Hard-deleted by Sprint 11 WO-051. (PRD §17.2.)
- **Don't run `scripts/bootstrap-sprints-2-11.py` again.** It's the one-off creator for Sprints 2–11; not idempotent — would duplicate GitHub issues.
- **WO-005 spike code was deleted at Sprint 1 close (2026-05-27).** `src/spike/**` and the spike-scope blocks in `src/main.ts` + `src/ui/App.tsx` were stripped from `main` per the locked git strategy ("main only, work uncommitted, no spike branches"); deliverables are the four populated research docs + the ticket-folder scripts/fixtures. The `spike/phase-0` branch (local + `origin/spike/phase-0`) was deleted. **Sprint 2 must NOT lift code from `src/spike/`** — re-derive `pushPrimitives` / DTCG parsing from `phases/04-step11-push.md` per the canonical lift map, and use the spike's measured per-call rates (in `research/latency-benchmark.md`) as the budget anchor, not the throwaway source.
- **Don't ship ES2020+ syntax in the plugin main thread (`code.js`).** Figma's sandbox throws `Syntax error on line 1: Unexpected token .` on optional chaining (`?.`). Set `build.target: 'es2017'` in `vite.config.ts` for the main-thread build and avoid `replaceAll` / `??` / `?.` in `src/main.ts` + `src/spike/**` source (esbuild may not downlevel `replaceAll`).
- **Don't leave `type="module"` on inlined `ui.html` scripts.** Figma's plugin UI iframe often shows a blank panel when the bundle is an ES module. `scripts/finalize-ui-html.mjs` strips `type="module"` and moves the inlined `<script>` to the end of `<body>` after `#root`.
- **Never pass a bundle (or any uncontrolled string) as the _replacement string_ argument of `String.prototype.replace`.** Use a function callback or `slice`+concat instead. JS interprets `$&`, `` $` ``, `$'`, `$n`, and `$$` in the replacement string as backreferences. Our React 19 UI bundle contains `` `$` `` template literals 22× (React's `escape()` returns `` `$` `` + key) — each one was expanding `` $` `` to "everything before the match", recursively splicing the surrounding HTML into the bundle. Symptom: the plugin iframe threw `Uncaught SyntaxError: Failed to execute 'write' on 'Document': Unexpected identifier 'object'` from Figma's `data:text/html` bootstrap when it `document.write`-ed our payload — because the corrupted bundle had `<!doctype html>...<body>` HTML literally pasted mid-expression. Caught only by counting `<!doctype html>` occurrences in the final `dist/ui.html` (should always be exactly 1). `scripts/finalize-ui-html.mjs` now uses `slice`/concat for the script-move step. Standalone Vite + viteSingleFile output is clean — the corruption happens only post-build.
- **Don't put `.` in Figma variable names.** `figma.variables.createVariable('color.primary.50', …)` throws `Error: in createVariable: invalid variable name`. Figma's variable-name grammar uses **slashes** to create the grouped folder hierarchy in the variables panel — `color/primary/50` renders as `color > primary > 50`. Pass slash paths verbatim from the DTCG nesting; do NOT pre-flatten with dots. (Sprint 2 WO-007 token-format adapter must inherit this rule when converting from legacy `dl-foundations` JSON, which uses dot-paths in some sources.)
- **Don't use `console.debug` in the plugin main thread (`code.js`).** Figma's QuickJS sandbox only forwards `console.log` / `warn` / `error` / `info` — not `debug`. Calling `console.debug(...)` after a successful push throws `TypeError: not a function`, which `main.ts` caught and surfaced as a false `push/error` in the UI. Use `pluginLog()` in `src/core/pluginLog.ts` (wraps `console.log`) for main-thread logging; `console.debug` is fine in the UI iframe (`src/ui/**`).
- **Don't call `figma.showUI('', ...)` — pass `__html__`.** Per [Figma docs](https://developers.figma.com/docs/plugins/api/properties/figma-showui), the first arg is the HTML string for the iframe. Empty string ⇒ blank white iframe (the root cause of "UI loads but is just a white box"). The standard pattern is `figma.showUI(__html__, { width, height })` where `__html__` is a build-time global containing the contents of `manifest.ui`. We inject it via Vite `define.__html__` in `vite.config.ts`, which reads the finalized `dist/ui.html` produced by the UI build pass. Build order is enforced in `scripts/build-{community,org}.mjs`: clean `dist/` → UI build → `finalize-ui-html.mjs` → main-thread build (so `dist/ui.html` exists by the time the main-thread Vite config substitutes `__html__`). The `__html__` global is declared in `src/figma-globals.d.ts`.
- **Ignore these Figma plugin console violations — they are platform noise, not our bug.** Every Figma plugin session logs them (sourced from `vendor-core-<hash>.min.js`, Figma's bundled code, not the plugin iframe):
  - `[Violation] Permissions policy violation: camera/microphone/clipboard-write/display-capture is not allowed`
  - `Page layout may be unexpected due to Quirks Mode` (affects Figma's outer document; our `dist/ui.html` has `<!doctype html>` so the plugin iframe is in standards mode)
  - `Unrecognized feature: 'local-network-access'` (Figma sets a `Permissions-Policy` value Chrome doesn't recognize yet)
  - `Deprecated feature used` (Figma vendor code, not ours)

  Don't chase these. Our `src/` contains zero references to `navigator.mediaDevices`, `clipboard`, `getUserMedia`, `getDisplayMedia` — `rg`-grep before assuming otherwise.

---

## Sub-agent ramp-up checklist (paste-friendly)

When spinning up a fresh sub-agent on a Figmint ticket, the agent MUST read these in order before any tool calls:

1. `memory.md` (this file) — cross-ticket facts + this checklist
2. `Docs/PRD.md` — full product spec; §6 / §8 / §12 / §17 are the most-cited
3. `Docs/lift-sources.md` — **drift corrections** + DesignOps-plugin → Figmint file map
4. `.github/templates/workflow.md` — backend IDs, status option IDs, lifecycle, gh CLI snippets
5. `.github/Sprint {N}/{TICKET-ID}-{slug}/ticket.md` — the assigned ticket
6. The legacy file(s) cited under "Lift reference" in the ticket — read at most one canvas bundle per session

`/new-agent` automates steps 1–4 via `.github/templates/agent-handoff.md`.

---

## Changelog (optional)

- _2026-05-26 — `/project-start` initialized claude-ops workflow with GitHub backend for Figmint._
- _2026-05-26 — All 55 tickets created on Project #9 via the breakdown plan (Sprints 1–11)._
- _2026-05-27 — Added `Docs/lift-sources.md` and expanded `memory.md` after orchestration agent audit. Captured drift correction: variable-push primitives live in `phases/04-step11-push.md`, not `step-15a-primitives.mcp.js`. Patched WO-005 ticket lift-source pointers to match._
- _2026-05-27 — `/research` ran on WO-002, WO-003, WO-004, WO-005. Cross-ticket reconciliation: bumped `engines.node` to `>=22.0.0` (Node 20 EOL'd 2026-04-30; WO-003 + WO-004 both require ≥22). Confirmed EVC is Enterprise-only (Plugin API Update 121, 2025-11-20). Patched WO-005 ticket: corrected non-existent `removeVariableValueOverride` → `variable.removeOverrideForMode` / `extension.removeOverridesForVariable`._
- _2026-05-27 — User sign-off on 5 planning-gate decisions before `/plan`:_
  - _PRD §11.5 (Node 22 LTS) + §13.1 (EVC Org-only) + §15 (EVC risk row rewording) + §16 OQ-8 (Figma dev-support question on plan-detection) — all patched._
  - _CTX-002 direction: canonical token model stays plan-agnostic; EVC = optional render-time projector. **Locked tentatively** — marked "subject to spike confirmation" until WO-005 BUILD validates. Sprint 2 adapter work may proceed under this assumption._
  - _WO-005 spike sandbox plan: **Pro/Org tier only.** EVC inheritance/override tests stay **untested on this plan**; the `extend()` throw verification still runs as a PASS criterion. Enterprise-tier follow-up is a separate ticket if needed._
  - _PRD G5 nuance: zero-LLM is a plugin-runtime goal, not a constraint on user input. No ESLint `no-restricted-imports` rule blocking LLM SDKs. Users may freely import LLM-generated data; the plugin never calls an LLM on their behalf._
  - _Git strategy locked: **`main`** (uncommitted changes, user reviews + commits manually). No worktrees._
- _2026-05-27 — Figma sandbox file locked: [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox?node-id=0-1) (`file_key=cVdPraIafWFBRZnzMPhtrW`, Pro/Org tier). WO-005 plan.md Step 1 + Dependencies section + ticket.md Figma VQA Checklist pre-populated. Default for any future Figmint Plugin-API testing._
- _2026-05-27 — Fixed Figma plugin "white UI box" at the root: `src/main.ts` was passing `''` to `figma.showUI`. Switched to `figma.showUI(__html__, ...)` and wired `__html__` build-time substitution via `vite.config.ts` `define`. Build order locked: clean → UI build → `finalize-ui-html.mjs` → main-thread build. Added `src/figma-globals.d.ts` for the ambient `__html__: string` declaration. Promoted `SpikeUiMessage` to a discriminated union so the exhaustive `never` check works under TS strict mode. Verified all four CI legs (typecheck, lint, format, dual build) green._
- _2026-05-27 — Fixed the follow-on `Uncaught SyntaxError: Failed to execute 'write' on 'Document': Unexpected identifier 'object'`: `scripts/finalize-ui-html.mjs` was using `html.replace('</body>', <bundle>)`, and the React 19 bundle contains 22 `` `$` `` template literals (from `escape()` returning `$`+key). String-replacement `$` patterns expanded `` $` `` to "everything before the match", spawning 23 copies of `<!doctype html>...<body>...` inside the bundle (`dist/ui.html` ballooned from 193 KB → 200 KB, and the corrupt JS threw on parse inside Figma's `data:text/html` bootstrap). Rewrote finalize to use `slice`/concat and added a function-callback for the attribute-stripping step. Documented the gotcha under "Do not repeat"._
- _2026-05-27 — WO-005 Phase 2 prep on `spike/phase-0`: generated deterministic fixtures (`spike-10` 2-mode Light/Dark, `spike-100` + `spike-400` single-mode Default) under `.github/Sprint 1/WO-005-…/scripts/fixtures/` via FNV-1a hashed hex per token name. Extended `src/spike/{parseDtcg.ts,pushPrimitives.ts}` to support both single- and multi-mode push (smoke fixture exercises `addMode` + `setValueForMode` across `Light`/`Dark`; latency fixtures stay single-mode per plan Step 3). Added "Load fixture" dropdown to `src/ui/App.tsx`. Pre-created `research/spike-execution-log.md` skeleton (Step-11 deliverable, durable). **Spike-throwaway map** — these live on `spike/phase-0` only and disappear when the branch is deleted: `src/spike/fixtures.ts` (auto-generated; clearly banner-commented), all `src/spike/*.ts` non-canonical code, the `// --- BEGIN/END SPIKE FIXTURE DROPDOWN ---` block in `src/ui/App.tsx`. **Durable artifacts** (survive branch close per plan Step 14): `.github/Sprint 1/WO-005-…/scripts/generate-fixtures.mjs`, the 3 JSON fixtures + their `README.md`, and `research/spike-execution-log.md`. All CI legs green (typecheck, lint, format, dual build). Build size grew 197 → 371 KB because the fixtures are inlined into the UI bundle — vanishes with the branch._
- _2026-05-27 — **WO-005 Phase 2 executed end-to-end against the Pro/Org sandbox. Headline: G1 = YES with ~10× headroom.** EVC Test 1 plan-gate PASS (`extend()` threw `"Cannot create extended collections outside of enterprise plan."` verbatim — CTX-002 working assumption confirmed). Latency: spike-10 / spike-100 / spike-400 medians = 22 / 155 / 606 ms (3 runs each, no anomalies, ~7% spread at the 400-var scale). Per-call rates at n=400: createVariable 0.50 ms, setValueForMode 0.30 ms, setVariableCodeSyntax 0.23 ms. Full 5-collection extrapolation per `latency-benchmark.md` §3.1 call-count budget: ~904 ms total (~3% of the 30 s G1 budget). MCP-baseline speedup ~115–145× across all three sizes (against extrapolated range; fresh measurement skipped because the speedup is already decisive). Updated `research/spike-execution-log.md` (§2 EVC, §4 latency, §5 verdict, §6 CTX-002), `research/latency-benchmark.md` (§2 / §6 result tables + verdict), `research/extended-collections.md` (§3 Tests 1–4 result + UNTESTED-ON-PLAN markers). **Sprint 2 architecture commit unblocked.**_
- _2026-05-27 — **Sprint 1 close-out — throwaway code deleted, durable artifacts committed on `main`.** Per locked git strategy ("main only, no archival branches"), stripped `src/spike/**`, the SPIKE-SCOPE dropdown block in `src/ui/App.tsx`, and the spike message handlers in `src/main.ts`. Rewrote `src/main.ts` + `src/ui/App.tsx` as minimal Sprint 1 scaffolds (UI shows the build target + a placeholder paragraph). Removed the `src/spike/**` ESLint override and the `.github/Sprint 1/WO-005-*/scripts/**` ignore (broadened to `.github/Sprint */**/scripts/**`). Deleted local `spike/phase-0` branch (+ `origin/spike/phase-0` if the user opted in). Bundle dropped 371 → 192 KB. All four CI legs green on the cleaned tree. Sprint 1 deliverables committed in four sequenced commits per ticket. **From this point on, anyone reading `src/` sees a clean Sprint 1 scaffold — no spike code anywhere.**_
- _2026-05-27 — **WO-008 completed.** Live Figma UI push path verified: spike-400 idempotent re-push skipped 400 in **490 ms**, audit 16/16 pass. Bench logged in `.github/Sprint 2/WO-008-…/research/push-bench-result.md`. GitHub issue #11 → Project #9 **Completed**. **Do not repeat:** Figma main-thread sandbox has no `console.debug` — use `pluginLog()` / `console.log` only in `code.js` (not UI iframe); calling `console.debug` after a successful push threw bare `TypeError: not a function` and surfaced as false `push/error` in the UI._
- _2026-05-27 — **Typography text-style binding fix.** `publishTypographyStyles` now binds `_Doc/*` + 27 slot styles to Typography mode-100 variables (`fontFamily`, `fontSize`, `fontWeight`, `lineHeight`) via `src/core/canvas/typographyStyleBinding.ts`. Re-run bootstrap to upgrade existing Inter-14 defaults in a file.
