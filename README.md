# Figmint

A native Figma plugin for design system management, component architecture, and design token workflows.

## Status

Pre-alpha — Sprint 1 in progress (scaffold + Phase 0 spike). See the canonical planning artifacts below.

## Canonical references

- **[Product spec (PRD)](Docs/PRD.md)** — full mission, contracts, phasing, sunset plan for legacy DesignOps-plugin.
- **[Sprint roadmap & ticket breakdown](file:///C:/Users/jbabc/.claude/plans/breakdown-the-plan-and-mellow-whale.md)** — multi-sprint plan + per-ticket lift-source pointers from `DesignOps-plugin`. Lives outside the repo at `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`.
- **`memory.md`** — short cross-ticket running memory for agents.
- **`CLAUDE.md`** — agent rules (auto-loaded).

## Project board

[Figmint Project #9](https://github.com/users/JBabcock-DL/projects/9) on GitHub. Sprint 1 tickets live under `.github/Sprint 1/`.

## Legacy lift source

Most of Figmint's deterministic logic already exists in the legacy [`DesignOps-plugin`](../DesignOps-plugin/) repo, wrapped in MCP transport. The sprint plan maps each new module to its lift source — port, don't rebuild from scratch.
