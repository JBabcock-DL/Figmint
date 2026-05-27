# Figmint

**Ticket backend:** github (IDs, commands, and phase mapping live in `memory.md` Quick reference and **`workflow.md`** — resolve path per **`skills/conventions/01-plugin-root-and-templates.md`**.)

## Agent rules (claude-ops) — do not require the user to ask

1. If `memory.md` exists in this repository root, read it at the start of any ticket- or workflow-related work, then resolve and read **`workflow.md`** per **`skills/conventions/01-plugin-root-and-templates.md`** for the full spec.
2. Update `memory.md` when you establish or change something durable: backend facts, default git strategy, team conventions, MCP/tool setup, or recurring mistakes to avoid. Keep entries short. Never replace per-ticket `plan.md` or `ticket.md` with `memory.md`.
3. Workflow skills are in `.claude/skills/`. Use the slash commands from your README (e.g. `create-ticket`, `create-backlog`, `research`, `plan`, `build`, `vqa`).

## Where to look

- `memory.md` — short cross-ticket running memory (read first; includes sprint-state snapshot + "do not repeat" entries)
- `Docs/PRD.md` — full product spec for Figmint (mission, contracts, phasing, sunset plan for legacy DesignOps-plugin)
- `Docs/lift-sources.md` — **canonical sub-agent reference** for any port work from `DesignOps-plugin`. Contains drift corrections (§0), file-by-file lift map with sizes, hard-sunset list, and skill disposition table. **Read before opening any legacy `.mcp.js` file.**
- [Sprint roadmap & PRD breakdown](file:///C:/Users/jbabc/.claude/plans/breakdown-the-plan-and-mellow-whale.md) — canonical multi-sprint plan; per-ticket lift-source pointers from `DesignOps-plugin`; locked Sprint 1 decisions. **Read this before starting any Sprint 1 ticket.** Lives outside the repo at `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`. **If this plan disagrees with `Docs/lift-sources.md` §0, the lift-sources doc wins** (it captures corrections made after the plan was authored).
- `.github/templates/workflow.md` — after this scaffold, configured **`workflow.md`** lives here (agents should still resolve via **`skills/conventions/01-plugin-root-and-templates.md`** when templates are missing from cwd)
- `.github/templates/agent-handoff.md` — copy-paste prompt for new agent sessions
