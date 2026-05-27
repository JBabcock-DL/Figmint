---
name: build
description: Orchestrate the full build phase for a ticket by spawning parallel build agents across all required domains. Use when a ticket has an approved plan.md with a Build Agents section and is ready to enter the build phase.
argument-hint: "[Sprint N/TICKET-ID-slug]"
agent: general-purpose
---

You are a Build Orchestrator for the claude-ops project.

Ticket path: $ARGUMENTS

## Collect missing context

If $ARGUMENTS is empty, ask the user using AskUserQuestion before proceeding:

- **Ticket path** — "Which ticket should I build? Provide the path (e.g. `.github/Sprint 1/WO-001-my-ticket`)"

Do not proceed until confirmed.

### Git strategy

Always ask the user using AskUserQuestion (even if $ARGUMENTS was provided):

- **Git strategy** — "How should build agents handle git for this ticket?"
  - `branch-per-agent` — Each agent creates its own branch (`{TICKET-ID}/{domain}`), commits its work, pushes, and opens a PR. Requires Claude Code worktrees for safe parallel execution; pick this if you have worktrees set as the default.
  - `main` — All agents work on the current branch and leave changes uncommitted for you to review. No branches created, no PRs opened. Pick this if you do not have worktrees configured.

Record the chosen strategy. It must be injected verbatim into every spawned build agent's prompt (see Execution step 3) so agents behave consistently.

Capture these values too — you will need them for agent prompts and for the final report:
- **Ticket ID** — the `{TICKET-ID}` portion of the ticket folder name (e.g. `WO-001`)
- **Base branch** — the repository's default branch (e.g. `main`); detect with `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` or fall back to the current branch

Do not proceed until the strategy is confirmed.

Before starting, read these files in order:
1. memory.md (if it exists in the repo root) — project running memory; skip if missing or empty
2. workflow.md — resolve path per skills/conventions/01-plugin-root-and-templates.md
3. $ARGUMENTS/ticket.md
4. $ARGUMENTS/plan.md

**CTX guard.** If the resolved ticket folder name matches `CTX-*`, stop immediately and tell the user: "Build cannot run on a context ticket — promote it first with `/create-ticket promote {CTX-ID}` or run `/create-backlog`."

Rules:
- Do not start if `$ARGUMENTS/plan.md` is missing, empty, a stub, or has no steps — report back that the plan was never persisted to the ticket folder. If the user planned in an IDE that uses a sidecar plan file (e.g. Cursor's `.plan.md` or any in-memory plan-mode buffer), tell them to re-run `/plan` so the full plan is written to `$ARGUMENTS/plan.md`; build agents cannot read IDE-local sidecars.
- Do not start if plan.md has no `## Build Agents` section — report back that the planner must define build phases before orchestration can begin
- Do not modify ticket.md or the remote issue directly — build agents handle their own step checkoffs in plan.md
- Agents within a phase run IN PARALLEL. Phases run SEQUENTIALLY — do not start Phase N+1 until all agents in Phase N have completed.

Execution steps (in order):

1. Move the ticket to **In Build**, using the method determined by the **Backend:** field in workflow.md:
   - **GitHub backend:** GraphQL `updateProjectV2ItemFieldValue` mutation from the **Key Commands (GitHub)** block, using the `project_item_id` from ticket.md frontmatter and the In Build option ID from workflow.md.
   - **Jira backend:** run the canonical phase-transition procedure in `skills/conventions/02-jira-phase-transition.md` with `TARGET_PHASE = phase:in-build`. In short: `getJiraIssue` → drop existing `phase:*` and append `phase:in-build` while preserving `claude-ops` + the type label → `editJiraIssue` with the **full** new labels array (never call `editJiraIssue` with only the phase label — it replaces the array) → re-read and verify exactly one `phase:*` plus `claude-ops` + type label remain → then optionally fire the configured transition from the **Phase → Transition map**. Do not assume `/plan` already swapped the label — run the procedure unconditionally. Build subagents spawned in step 3 below must NOT repeat this — only this orchestrator owns the phase boundary.

2. Read the `## Build Agents` section of plan.md. It defines ordered phases. Each phase lists one or more build domains and the plan steps they own.

3. For each phase, spawn one Agent tool call PER domain IN PARALLEL (single message, multiple Agent tool calls). Each agent prompt must include:
   - The full contents of $ARGUMENTS/ticket.md
   - The full contents of $ARGUMENTS/plan.md
   - The full contents of .claude/skills/{domain}-build/SKILL.md
   - The specific steps the agent is responsible for
   - A **Git strategy** block with the value collected above. Format it exactly like this so the agent's Git strategy rules pick it up:

     ```
     Git strategy: {branch-per-agent | main}
     Ticket ID: {TICKET-ID}
     Domain: {domain}
     Base branch: {default-branch}
     Branch name (if branch-per-agent): {TICKET-ID}/{domain}
     ```

   - Instruction: "Execute only the steps assigned to you. Check off each step in plan.md as you complete it. Do not modify ticket.md, do not call `editJiraIssue` / `transitionJiraIssue` / `gh issue edit`, and do not run the phase-transition procedure — the `/build` orchestrator already did that. You were spawned by `/build`, so skip the 'Move the ticket to In Build' step in your skill's instructions. Follow the Git strategy block above exactly."

4. Wait for all agents in the phase to complete before launching the next phase.

5. After all phases complete, read plan.md and verify all steps are checked off. Report any unchecked steps as blockers.

6. Report back: which agents ran, which phases completed, any failures or unchecked steps, any PR URLs opened by agents (if `branch-per-agent`) or the list of uncommitted file paths (if `main`), and confirm the ticket is ready for `/vqa`.
