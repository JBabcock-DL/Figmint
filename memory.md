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

- **Project goal (one line):** Native Figma plugin for design system management, component architecture, and design token workflows
- **Ticket backend:** `github` — from `workflow.md` **## Ticket Backend** → Backend
- **Default branch / PR target:** `main`
- **Current sprint folder:** `.github/Sprint 1/`
- **Stack / runtimes (if this is an app repo):** Figma Plugin API, TypeScript (see `Docs/PRD.md`)
- **This repo is:** Figmint application codebase — native Figma plugin for design system management and agent context bridge
- **PRD (full product spec):** `Docs/PRD.md`
- **Sprint roadmap + Sprint 1 breakdown (canonical plan):** [breakdown-the-plan-and-mellow-whale.md](file:///C:/Users/jbabc/.claude/plans/breakdown-the-plan-and-mellow-whale.md) — lives at `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`. Contains the full multi-sprint roadmap, per-ticket lift-source pointers into `DesignOps-plugin`, and locked architectural decisions. **Read alongside the per-ticket `ticket.md` before any `/research`, `/plan`, or `/build`.**
- **Legacy lift source (do not rebuild from scratch):** `c:\Users\jbabc\Documents\GitHub\DesignOps-plugin\` — most deterministic logic Figmint needs already exists there as MCP-wrapped code; strip the wrapper and lift. See the plan's "Lift sources from `DesignOps-plugin`" section for the file-by-file map.

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
- Record a **default preference** for this team below if you use `/build` often:

  - **Default git strategy for this repo:** *branch-per-agent | main*  
  - **Worktrees:** *yes, default in Claude Code | no*  

---

## MCP & external tools (names only, no secrets)

- **GitHub:** `gh` CLI; Board mutations per `workflow.md` **Key Commands (GitHub)**
- **Jira / Confluence:** Atlassian MCP (tool names in server descriptor)
- **Figma (optional):** Figma MCP for canvas; map URL in `ticket.md` **References**
- **Other (project-specific):** *e.g. Datadog, Sentry, Linear*

---

## Conventions (this repo's agreements)

- *Branch naming, commit style, i18n, "definition of done," CODEOWNERS, etc.*

---

## Phrases, products, and acronyms

- **Figmint** — Native Figma plugin; deterministic context bridge between agents for design system work
- **DesignOps-plugin** — Legacy agent-driven workflow being superseded by Figmint (see `Docs/PRD.md`)

---

## Do not repeat (dead ends, incidents, or decisions)

- *One line each—what went wrong and what we do instead.*

---

## Changelog (optional)

- *2026-05-26 — `/project-start` initialized claude-ops workflow with GitHub backend for Figmint.*
