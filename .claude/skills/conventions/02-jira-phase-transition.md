# Jira phase transition — canonical procedure

Every workflow skill that advances a ticket between phases (`/research`, `/plan`, `/build`, `/code-build`, `/api-build`, `/doc-build`, `/figma-build`, `/script-build`, `/vqa`, `/create-ticket`) must follow this exact procedure on the **Jira backend**. The label swap is the authoritative phase signal — **never** skip it, even when the IDE shows the ticket already moved or the agent assumes a previous step did it.

> **Why this file exists:** in earlier sessions, only `/research` reliably updated the Jira card. Downstream skills called `editJiraIssue` with just the new `phase:*` label, which **replaced** the entire labels array on the issue and silently wiped `claude-ops`, the type label (`bug` / `work-order`), and any others. The canonical procedure below prevents that by always reading the existing labels first and writing the **full** new set.

---

## The procedure (run on every phase boundary)

Inputs you must already have:

- `jira_issue` — issue key from `ticket.md` frontmatter (e.g. `PROJ-123`)
- `cloudId` — from `workflow.md` → **Ticket Tracker — Jira**
- `TARGET_PHASE` — the phase being entered (e.g. `phase:in-planning`)

Steps:

1. **Read the current issue.** Call `getJiraIssue` with `cloudId` and `issueIdOrKey = jira_issue`. Capture `fields.labels` as the current label array.

2. **Compute the new label set:**
   - Drop every label that starts with `phase:`.
   - Append `TARGET_PHASE`.
   - Preserve every other label exactly as returned (`claude-ops`, `bug` / `work-order` / `context`, and any user-added labels).

3. **Write the full set back.** Call `editJiraIssue` with `cloudId`, `issueIdOrKey = jira_issue`, and the **complete** new labels array as `fields.labels` (or via the `labels` parameter / `additional_fields.labels` shape the MCP descriptor exposes — confirm field name once per session). `editJiraIssue` replaces the array; do **not** call it with only the new phase label.

4. **Verify.** Re-read the issue with `getJiraIssue` and confirm:
   - Exactly one `phase:*` label, and it equals `TARGET_PHASE`.
   - `claude-ops` is still present.
   - The type label (`bug` / `work-order` / `context`) is still present.
     If verification fails, retry the edit once with the corrected array. If it still fails, stop and report the issue key, the labels read back, and what was attempted.

5. **Optional Status transition.** Read the **Phase → Transition map** from `workflow.md`. If the row for `TARGET_PHASE` is not `skip`:
   - Call `getTransitionsForJiraIssue` on `jira_issue`.
   - Match the configured transition name case-insensitively against `transitions[].name` to resolve its `id`.
   - Call `transitionJiraIssue` with that `id`.
     If the configured name is not in the available list (Jira workflow guards by current Status) or the row is `skip`, **continue without erroring** — the label swap from steps 1–4 is authoritative and the card still reflects the right phase to anything filtering by label.

6. **Never assume the previous skill did this.** Each skill must run steps 1–4 itself when it owns a phase boundary. The previous skill may have failed, the user may have invoked the skills out of order, or the user may have manually edited labels in Jira between runs.

---

## Where each skill calls in

| Skill                                                                                                                    | TARGET_PHASE                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `/research`                                                                                                              | `phase:in-research`                                                                                             |
| `/plan`                                                                                                                  | `phase:in-planning`                                                                                             |
| `/build` (orchestrator, before spawning subagents)                                                                       | `phase:in-build`                                                                                                |
| `/code-build`, `/api-build`, `/doc-build`, `/figma-build`, `/script-build` (when invoked **directly**, not via `/build`) | `phase:in-build`                                                                                                |
| `/vqa` (all pass)                                                                                                        | `phase:completed`                                                                                               |
| `/vqa` (any fail)                                                                                                        | `phase:in-build`                                                                                                |
| `/create-ticket` (create mode)                                                                                           | `phase:context-backlog` (set on `createJiraIssue`; no swap needed — but Status transition step 5 still applies) |

When `/build` is the orchestrator, **only the orchestrator** runs the procedure. Build subagents spawned by `/build` are explicitly told **not** to touch the remote issue. When a build skill is invoked directly (no orchestrator), that skill runs the procedure itself.
