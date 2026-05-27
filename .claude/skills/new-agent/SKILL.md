---
name: new-agent
description: Spin up a new agent on an existing project by collecting context, orienting the agent via the handoff doc, then invoking the right skills to ramp up work. Use when starting a fresh Claude session on a ticket or kicking off new work.
argument-hint: "[sprint number] [ticket-id or 'new'] [role: ticket|triage|research|plan|build|vqa]"
context: fork
agent: general-purpose
---

You are ramping up a new agent session on this project using the claude-ops handoff system.

Arguments received: $ARGUMENTS

Before doing anything else, read (Claude: do not require the user to say “read memory” — it is your job):
1. memory.md (if it exists in the repo root) — project running memory; skip if missing or empty
2. workflow.md — resolve path per skills/conventions/01-plugin-root-and-templates.md
3. agent-handoff.md — resolve path per skills/conventions/01-plugin-root-and-templates.md
4. CLAUDE.md in the repo root if present (reiterates read/update rules for `memory.md`)

---

## Step 1 — Collect missing context

Parse $ARGUMENTS for: sprint number, ticket ID (or "new"), and role (ticket | triage | research | plan | build | vqa).

For any value not provided in $ARGUMENTS, ask the user using AskUserQuestion. Collect all missing values before proceeding — do not assume defaults.

Questions to ask if missing:

- **Sprint number** — "Which sprint is this work in? (e.g. 1, 2, 3)"
- **Ticket** — "Do you have an existing ticket ID (e.g. WO-001, BUG-002), or should I create a new one? If new, what type (bug or work order) and what is the title?"
- **Role** — "What should this agent do?
    1. Create a ticket
    2. Triage the context backlog (bulk-classify CTX-* tickets)
    3. Research
    4. Plan
    5. Build
    6. Verify (VQA)"

Do not proceed to Step 2 until you have all three values confirmed.

---

## Step 2 — Orient using the handoff doc

Using the values collected, compose the handoff context from agent-handoff.md:
- Fill in the sprint number, ticket ID, and role variant
- If a ticket ID was provided, read `.github/Sprint {N}/{TICKET-ID}-*/ticket.md` to confirm the ticket exists and capture the slug
- If the ticket does not exist and role is not "ticket", warn the user and ask if they want to create the ticket first

---

## Step 3 — Invoke the right skill

Based on the confirmed role, invoke the corresponding skill using the Skill tool:

| Role | Skill to invoke | Arguments |
|---|---|---|
| ticket (new) | `create-ticket` | `[bug\|wo\|ctx] "[title]"` |
| triage | `create-backlog` | `[sprint number]` |
| research | `research` | ticket path |
| plan | `plan` | ticket path |
| build | `build` | ticket path |
| vqa | `vqa` | ticket path |

If the role is **ticket** and a ticket ID was already provided (ticket exists), skip create-ticket and ask the user what they want to do next — offer research, plan, build, or vqa.

If the role is **build** and no `plan.md` exists or it is a stub, warn the user that a plan is required before building and offer to run `/plan` first.

If the provided ticket ID starts with `CTX-` and the role is `research`, `plan`, `build`, or `vqa`, stop and tell the user that context tickets must be promoted first — offer to run `/create-ticket promote {CTX-ID}` or `/create-backlog` instead.

Wait for the invoked skill to complete before reporting back.

---

## Step 4 — Report back

Summarize:
- Sprint and ticket this session is working on
- Role the agent took
- Skill(s) invoked and their outcome
- Next recommended step in the ticket lifecycle
