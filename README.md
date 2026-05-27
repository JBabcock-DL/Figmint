# Figmint

A native Figma plugin for design system management, component architecture, and design token workflows.

## Status

Pre-alpha — Sprint 1 in progress (scaffold + Phase 0 spike). See the canonical planning artifacts below.

## Canonical references

- **[Product spec (PRD)](Docs/PRD.md)** — full mission, contracts, phasing, sunset plan for legacy DesignOps-plugin.
- **[Lift-source map (`Docs/lift-sources.md`)](Docs/lift-sources.md)** — canonical sub-agent reference for any port work from `DesignOps-plugin`. Drift corrections, file sizes, skill dispositions, hard-sunset list.
- **[Sprint roadmap & ticket breakdown](file:///C:/Users/jbabc/.claude/plans/breakdown-the-plan-and-mellow-whale.md)** — multi-sprint plan + per-ticket lift-source pointers from `DesignOps-plugin`. Lives outside the repo at `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`.
- **`memory.md`** — short cross-ticket running memory for agents (includes sprint-state snapshot + "do not repeat" notes).
- **`CLAUDE.md`** — agent rules (auto-loaded).

## Project board

[Figmint Project #9](https://github.com/users/JBabcock-DL/projects/9) on GitHub. **55 tickets** spanning Sprints 1–11 (WO-001 Completed; WO-002..054 + CTX-002 in Context Backlog). Sprint 1 tickets live under `.github/Sprint 1/`; later sprints under `.github/Sprint {N}/`.

## Legacy lift source

Most of Figmint's deterministic logic already exists in the legacy [`DesignOps-plugin`](../DesignOps-plugin/) repo. It is a Claude Code / Cursor **skill pack** — Markdown orchestration + committed Plugin API JavaScript bundles — not a shipped Figma UI plugin. ~80% portable by stripping MCP transport wrappers. **`Docs/lift-sources.md` is the canonical file-by-file map**, including drift corrections (e.g. variable-push primitives live in `phases/04-step11-push.md`, not in the canvas-table bundle `step-15a-primitives.mcp.js`).
