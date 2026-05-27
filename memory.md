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
- **Current sprint folder:** `.github/Sprint 1/`
- **Stack / runtimes:** Figma Plugin API, TypeScript strict, Node 20+, Vite (locked WO-002); React UI shell; planned workspace package `@detroitlabs/figmint-contracts`
- **This repo is:** Figmint application codebase — native Figma plugin that supersedes the agent-driven `DesignOps-plugin` workflow
- **PRD (full product spec):** `Docs/PRD.md` (18 sections, ~900 lines — read §6 functional reqs, §8 contracts, §12 phasing, §17 sunset first)
- **Sub-agent lift-source map:** `Docs/lift-sources.md` — **CANONICAL** for any port work from `DesignOps-plugin`. Catches drift between the breakdown plan and the actual legacy source. Read §0 (drift corrections) before opening any `.mcp.js` file.
- **Sprint roadmap + Sprint 1 breakdown (canonical plan):** [breakdown-the-plan-and-mellow-whale.md](file:///C:/Users/jbabc/.claude/plans/breakdown-the-plan-and-mellow-whale.md) — lives at `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`. Contains the full multi-sprint roadmap, per-ticket lift-source pointers into `DesignOps-plugin`, and locked architectural decisions. **Read alongside the per-ticket `ticket.md` before any `/research`, `/plan`, or `/build`.**
- **Legacy lift source (do not rebuild from scratch):** `c:\Users\jbabc\Documents\GitHub\DesignOps-plugin\` — Claude Code / Cursor skill pack (Markdown orchestration + committed Plugin API JS bundles). ~80% portable by stripping MCP transport. See `Docs/lift-sources.md` for the file-by-file map + size warnings.
- **Project board (GitHub):** [Figmint Project #9](https://github.com/users/JBabcock-DL/projects/9) — 55 tickets live (WO-001 Completed; WO-002..054 + CTX-002 in Context Backlog).

### Sprint 1 state (snapshot 2026-05-27)

5 tickets ready for `/research` or `/plan`:

| Ticket | Title | Status | Depends on |
|---|---|---|---|
| WO-001 | Configure project goal in workflow.md | **Completed** | — |
| WO-002 | Bootstrap Figmint TypeScript + Vite plugin scaffold | Context Backlog | none (foundation) |
| WO-003 | Set up `@detroitlabs/figmint-contracts` workspace package | Context Backlog | WO-002 |
| WO-004 | Minimal CI pipeline (lint + typecheck + build) | Context Backlog | WO-002, WO-003 |
| WO-005 | Phase 0 spike — variable push + EVC validation + latency benchmark | Context Backlog | WO-002 |
| CTX-002 | Canonical internal token model — decision capture | Context Backlog | WO-005 (informs) |

Sprints 2–11 ticket bodies (WO-006..054) live in `.github/Sprint {N}/`. Bootstrap script (`scripts/bootstrap-sprints-2-11.py`) was a one-off; do NOT re-run (not idempotent).

---

## Where everything lives (paths)

- **Global workflow + IDs:** **`workflow.md`** — resolve per **`skills/conventions/01-plugin-root-and-templates.md`** (typically **`REPO_ROOT/.github/templates/workflow.md`** after **`/project-start`**, else **`PLUGIN_ROOT/templates/workflow.md`**)
- **Handoff / new sessions:** **`agent-handoff.md`** — same resolution rules
- **Per ticket:** `.github/Sprint {N}/{TICKET-ID}-{slug}/ticket.md` + `plan.md` + optional `research/`, `scripts/`
- **Skills (slash commands):** `.claude/skills/{skill}/SKILL.md` — *after `/project-start` these are the copies in this repo; developing the plugin may use a marketplace path instead*

---

## Ticket types & guards

| Type     | ID prefix  | `plan.md`   | `research` | Notes |
|----------|------------|-------------|------------|--------|
| Bug      | `BUG-###`  | yes (stub+) | common     | |
| Work order | `WO-###` | yes (stub+) | common     | |
| Context  | `CTX-###`  | **no** until promoted | often | **Intake only**—promote with `/create-ticket promote CTX-###` or `/create-backlog` before `/research`, `/plan`, `/build`, `/vqa` |

- **Interactive intake:** **`create-ticket`** and **`/dev-handoff` → ClaudeOps** collect **ticket type** (and title) **before** the optional "additional notes for the engineer" prompt so the body follows **`bug_report.md`** / **`work_order.md`** / **`context.md`**.

---

## Lifecycle & phases (order)

1. **Intake (optional):** `/create-ticket ctx` → raw notes  
2. **Triage (optional):** `/create-backlog` or `/create-ticket promote` → `bug` or `wo`  
3. **Create (if needed):** `/create-ticket` bug|wo  
4. **Research (optional):** `/research`  
5. **Plan:** `/plan` — `plan.md` must gain `## Build Agents` with parallel phases for `/build`  
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

  - **Default git strategy for this repo:** *TBD — ask user on first `/build` invocation. No team preference locked yet.*
  - **Worktrees:** *TBD — confirm Claude Code worktree setting before defaulting to `branch-per-agent`.*

---

## MCP & external tools (names only, no secrets)

- **GitHub:** `gh` CLI; Board mutations per `workflow.md` **Key Commands (GitHub)**
- **Jira / Confluence:** Atlassian MCP (tool names in server descriptor)
- **Figma (optional):** Figma MCP for canvas; map URL in `ticket.md` **References**
- **Other (project-specific):** *e.g. Datadog, Sentry, Linear*

---

## Conventions (this repo's agreements)

- **TypeScript strict mode** everywhere (`strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`) — locked by WO-002 acceptance criteria.
- **Workspace layout** matches PRD §7.3 — `src/{core,ops,io,contracts,ui,config}` + `packages/contracts/` workspace. Do NOT invent alternative folder structures.
- **Contracts are versioned literals.** Every contract type has a `v: 1` discriminator; bump = add `v2` alongside `v1` (never breaking change).
- **No LLM calls inside the plugin** (PRD G5 / §11.2). If a feature seems to need one, it belongs in an agent-side skill consuming a Figmint contract document instead.
- **Always preview, never silent-apply** (PRD §11.4) — any deterministic-uncertainty case requires explicit designer confirmation; record decisions in the audit log.
- **No third-party network calls beyond GitHub API + Figma Plugin API.** `manifest.networkAccess.allowedDomains` is GitHub-only.

---

## Phrases, products, and acronyms

- **Figmint** — Native Figma plugin; deterministic context bridge between agents for design system work
- **DesignOps-plugin** — Legacy agent-driven workflow being superseded by Figmint (see `Docs/PRD.md` §17 sunset plan)
- **EVC** — Figma's Extended Variable Collections (Jan 2026 platform feature); WO-005 spike validates whether the 5-collection theming model maps cleanly onto EVC inheritance
- **5-collection model** — Primitives / Theme / Typography / Layout / Effects (PRD §6.1 FR-BOOT-3 + `DesignOps-plugin/skills/create-design-system/conventions/01-collections.md`)
- **codeSyntax** — Per-platform variable codeSyntax: WEB `var(--*)`, ANDROID kebab-case M3, iOS dot paths. Replaces platform alias collections — no per-platform collections exist in the model.
- **Forward path** — Component scaffold direction: spec → Figma. **Reverse path** — Component import: code source → component-spec → Figma.
- **Snapshot** — Per-key "last synced" record stored in canvas pluginData on a hidden node in the Figmint Output page; baseline for 3-way drift detection (PRD §6.4 FR-DRIFT-1).
- **Ops protocol** — JSON ops-program-v1 contract between any shell (UI / agent / CLI) and the deterministic core (PRD §9).

---

## Do not repeat (dead ends, incidents, or decisions)

- **Don't lift variable-push code from `step-15a-primitives.mcp.js`.** That file is a canvas-table builder — it reads variables that already exist. The actual `createVariableCollection` / `addMode` / `setValueForMode` / `setVariableCodeSyntax` sequence lives in `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` (+ per-collection variable lists in `phases/02-steps5-9.md`). The breakdown plan + WO-005 ticket have been corrected; see `Docs/lift-sources.md` §0.
- **Don't preserve the legacy two-layer (Plugin API + REST `codeSyntax`) variable push.** That split exists only because the MCP `use_figma.code` payload had a 50 kB cap. The plugin sandbox uses Plugin API end-to-end via `figma.variables.setVariableCodeSyntax`. (`Docs/lift-sources.md` §0.)
- **Don't load multiple `canvas-templates/bundles/*.mcp.js` files into one agent context.** Each is 44–57 KB / 1k–1.5k lines and inlines `_lib.js` + page template + runner. Read ONE at a time, prefer the modular `canvas-templates/<page>.js` source over the bundle, and never `*.min.mcp.js`. (`Docs/lift-sources.md` §3.)
- **Don't port `skills/canvas-bundle-runner/`, `scripts/{check-payload,probe-parent-transport,check-use-figma-mcp-args,assemble-component-use-figma-code,sync-cache,measure-sigma,create-component-step6-all,qa-assembled-size}*`, the `AGENTS.md` MCP anti-spiral body, `conventions/16-mcp-use-figma-workflow.md`, or `conventions/17-table-redraw-runbook.md`.** They exist only because of MCP transport. Hard-deleted by Sprint 11 WO-051. (PRD §17.2.)
- **Don't run `scripts/bootstrap-sprints-2-11.py` again.** It's the one-off creator for Sprints 2–11; not idempotent — would duplicate GitHub issues.
- **Don't auto-merge the spike branch (`spike/phase-0`).** WO-005 is throwaway; findings + scripts under the ticket folder are the deliverable, not the code.

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

- *2026-05-26 — `/project-start` initialized claude-ops workflow with GitHub backend for Figmint.*
- *2026-05-26 — All 55 tickets created on Project #9 via the breakdown plan (Sprints 1–11).*
- *2026-05-27 — Added `Docs/lift-sources.md` and expanded `memory.md` after orchestration agent audit. Captured drift correction: variable-push primitives live in `phases/04-step11-push.md`, not `step-15a-primitives.mcp.js`. Patched WO-005 ticket lift-source pointers to match.*
