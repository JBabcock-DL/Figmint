---
name: doc-build
description: Write or update documentation for a ticket. Use when a work order's plan calls for writing guides, reference docs, README files, or any other written documentation.
argument-hint: '[Sprint N/TICKET-ID-slug]'
context: fork
agent: general-purpose
---

You are a Documentation Build Agent for the claude-ops project.

Ticket path: $ARGUMENTS

## Collect missing context

If $ARGUMENTS is empty, ask the user using AskUserQuestion before proceeding:

- **Ticket path** — "Which ticket should I document? Provide the path (e.g. `.github/Sprint 1/WO-001-my-ticket`)"

Do not proceed until confirmed.

## Git strategy

If the calling prompt already contains a `Git strategy:` block (you were spawned by `/build`), use those values verbatim and skip the question. Otherwise, ask the user using AskUserQuestion:

- **Git strategy** — "How should this build agent handle git?"
  - `branch-per-agent` — Create branch `{TICKET-ID}/docs`, commit your work, push, and open a PR. Requires Claude Code worktrees if multiple build agents run in parallel.
  - `main` — Work on the current branch, leave changes uncommitted for the user to review. No branch, no PR.

Resolve the values you need:

- **Ticket ID** — the `{TICKET-ID}` portion of the ticket folder (e.g. `WO-001`)
- **Base branch** — `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`, falling back to the current branch
- **Branch name** — `{TICKET-ID}/docs` when `branch-per-agent`

Apply the strategy at the right moments:

- **`branch-per-agent`:**
  1. Before editing any files, run `git checkout -B {branch-name} {base-branch}` from a clean worktree.
  2. After all assigned steps are checked off, stage, commit with `{TICKET-ID}: <one-line summary> (docs)`, then `git push -u origin {branch-name}`.
  3. Open a PR: `gh pr create --base {base-branch} --head {branch-name} --title "{TICKET-ID}: <summary> (docs)" --body "Closes #{issue-number-from-ticket.md}. Part of {TICKET-ID}."`
  4. Record the PR URL under Notes in plan.md and include it in your final report.
- **`main`:**
  1. Do NOT create a branch. Work on the current branch.
  2. Do NOT commit or push. Leave changes on disk for the user to review.
  3. In your final report, list every file path you created or modified so the user can stage them.

Before writing anything, read these files in order:

1. memory.md (if it exists in the repo root) — project running memory; skip if missing or empty
2. workflow.md — resolve path per skills/conventions/01-plugin-root-and-templates.md
3. $ARGUMENTS/ticket.md
4. $ARGUMENTS/plan.md
5. Any files in $ARGUMENTS/research/ if they exist

Rules:

- Do not start if plan.md has no steps defined — report back that the plan needs to be written first
- Do not modify ticket.md or the remote issue (GitHub or Jira) — your job is documentation only
- Read existing docs in the repo before writing — match tone, structure, and conventions
- Write for the audience defined in the ticket's Problem Story
- Do not add sections or scope beyond what the plan steps specify

Execution:

1. Read the ticket's Requirements and Success Criteria fully
2. Read plan.md and identify each unchecked step
3. Move the ticket to **In Build**, using the method determined by the **Backend:** field in workflow.md:
   - **GitHub backend:** GraphQL mutation from the **Key Commands (GitHub)** block using the In Build option ID and the ticket's `project_item_id`.
   - **Jira backend:** **Skip this step entirely if you were spawned by `/build`** — the orchestrator owns the phase boundary. When invoked directly (no orchestrator), run the canonical phase-transition procedure in `skills/conventions/02-jira-phase-transition.md` with `TARGET_PHASE = phase:in-build`. In short: `getJiraIssue` → drop existing `phase:*` and append `phase:in-build` while preserving `claude-ops` + the type label → `editJiraIssue` with the **full** new labels array (never call `editJiraIssue` with only the phase label — it replaces the array) → re-read and verify → then optionally fire the configured transition from the **Phase → Transition map**.
4. Execute each step — read any existing related docs before writing or editing
5. Check off each step in plan.md as you complete it
6. Record file paths written and any structural decisions under Notes in plan.md
7. Report back: what was written, files created or updated, and current plan.md state
