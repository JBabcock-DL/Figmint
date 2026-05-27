# claude-ops — Agent Workflow Context

This document describes how this project is structured and how work is tracked. All agents operating in this repo should follow this workflow.

---

## Project Goal

Native Figma plugin for design system management, component architecture, and design token workflows.

## Ticket Backend

<!-- CONFIGURE: set to either `github` or `jira` during /project-start. Agents must read this field to know which backend to use. -->

**Backend:** `github`

Exactly one of the two **Ticket Tracker** sections below applies, based on the backend above. The other section is marked N/A.

---

## Repository Structure

```
CLAUDE.md                  # Created by /project-start — instructs agents to read/update memory.md without user prompting
memory.md                  # Short running memory to save agent context (see Conventions)
.github/
├── templates/             # Ticket templates and agent workflow context
│   ├── workflow.md        # This file — agent context document
│   ├── bug_report.md      # Template for bug tickets
│   ├── work_order.md      # Template for work order tickets
│   ├── context.md         # Template for context tickets
│   └── agent-handoff.md   # Prompt block for new agent sessions
└── Sprint {N}/            # One folder per sprint
    └── {TICKET-ID}-{slug}/  # One folder per ticket (BUG-###, WO-###, or CTX-###)
        ├── ticket.md        # The ticket definition (synced to the backend)
        ├── plan.md          # Implementation approach and step checklist (not created for CTX tickets until promoted)
        ├── research/        # Data, findings, reference docs (.md, .json, etc.)
        └── scripts/         # Any automation, tooling, or helper scripts
```

### memory.md and CLAUDE.md (recommended)

- **`CLAUDE.md`** at the repository root (created by `/project-start`) tells Claude to **read `memory.md` first** and **update it** when durable facts change—**the user should not have to repeat those instructions.** Keep the **Agent rules** block when editing that file.
- **`memory.md`** holds short, project-level facts: backend choice, default branch, stack, build/git defaults, naming conventions, integration pointers, and “do not repeat” notes. Read it at session start, then `workflow.md` for the full spec. This keeps sessions cheaper on context and tokens.
- `ticket.md` / `plan.md` remain the source of truth for a single unit of work; do not duplicate per-ticket steps into `memory.md`.

---

## Ticket Types

| Type       | Label        | Template        | Naming           | Lifecycle                                                                                                                          |
| ---------- | ------------ | --------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Bug        | `bug`        | `bug_report.md` | `BUG-{N}-{slug}` | Full lifecycle (create → research → plan → build → vqa)                                                                            |
| Work Order | `work-order` | `work_order.md` | `WO-{N}-{slug}`  | Full lifecycle (create → research → plan → build → vqa)                                                                            |
| Context    | `context`    | `context.md`    | `CTX-{N}-{slug}` | Triage — raw dumps **or** design-handoff scaffold; must be promoted to `bug` or `work-order` before research / planning / building |

Each type has its own sequential numbering (`BUG-001`, `BUG-002`, `WO-001`, `CTX-001`, etc.).

### Context tickets

Context tickets are an intake format for **bulk raw information** — designer notes, research transcripts, meeting dumps, Figma comments, Slack threads, customer interviews, analytics observations.

**`context.md` ships two intake shapes:** (1) **Design handoff (default scaffold)** — Goal, Design reference, Requirements (functional / visual / technical), Acceptance criteria, Out of scope, and Notes for build agent — use this when dropping **Figma → engineering** work or running `/dev-handoff` so a build agent can scope a task **before** promotion. (2) **Raw dump** — lean on Source, Summary, Raw Notes, and Assets & Links; leave structured sections empty or `TBD` when no UI/code scope exists yet. Bug and work-order tickets still use **`bug_report.md`** / **`work_order.md`** for fully structured Requirements / Success Criteria **after** promotion.

A context ticket stays in **Context Backlog** until it is **promoted** into the correct type:

- `/create-ticket promote {CTX-ID}` — interactively promote a single CTX ticket into a `bug` or `work-order`
- `/create-backlog` — bulk-triage every unpromoted CTX ticket in the current sprint, classifying each into a `bug` or `work-order` (with user confirmation per ticket)

The `/research`, `/plan`, `/build`, and `/vqa` skills refuse to run on an un-promoted `CTX-*` ticket and will point the user at `/create-ticket promote` or `/create-backlog` first.

---

## Ticket Lifecycle

0. **Intake (optional)** — `/create-ticket ctx "..."` drops raw context into a CTX ticket without forcing structure. CTX tickets are triaged later via `/create-ticket promote {CTX-ID}` (single) or `/create-backlog` (batch), which converts each into a `bug` or `work-order` with the next sequential ID of that type.
1. **Create ticket** — `/create-ticket` requires a configured **Ticket Backend** in `workflow.md`, creates the **remote** issue first (GitHub Issue + Project, or Jira), then writes the sprint folder, `ticket.md`, and stub `plan.md` (bug / work-order only), with board/status: **Context Backlog**
2. **Research** _(optional, recommended for unfamiliar work)_ — `/research` investigates the problem domain and writes findings to `research/`; moves ticket to **In Research**
3. **Plan** — `/plan` reads parent **`ticket.md`**, writes **`plan.md`** per **`.github/templates/plan-quality-bar.md`** (sub-agent-ready steps traceable to ticket requirements + AC; phased `## Build Agents`), then moves ticket to **In Planning**
4. **Build** — `/build` reads the `## Build Agents` section, moves ticket to **In Build**, and spawns build agents in parallel phases; agents within a phase run simultaneously, phases run sequentially. Individual build skills (`/code-build`, `/doc-build`, `/script-build`, `/api-build`, `/figma-build`) can be used directly for single-domain tickets.
5. **Verify** — `/vqa` runs a Figma-first QA pass: it requires the **Figma VQA Checklist** in `ticket.md` to either have `file_key` + `node_id` filled or be explicitly marked `**N/A — no Figma artifact**`. The agent pulls the design from Figma via MCP, captures the implemented build, fills the assertion table 1:1, then runs Functional QA. Moves ticket to **In Review** → **Completed** when every assertion passes.

> Skip research for well-understood, mechanical tickets where requirements are unambiguous.

The six workflow phases are:

| Phase           | Meaning                            |
| --------------- | ---------------------------------- |
| Context Backlog | Ticket created, not yet started    |
| In Research     | Discovery / investigation underway |
| In Planning     | plan.md being drafted or refined   |
| In Build        | Build agents executing the plan    |
| In Review       | VQA pass in progress               |
| Completed       | Verified, done                     |

These phases are stored on each ticket:

- **GitHub backend** → as the Status single-select field on the Project board
- **Jira backend** → as a `phase:<name>` label on each Jira issue (e.g. `phase:in-build`). The label is authoritative. Optionally, each phase can also fire a Jira workflow **transition** (configured via the **Phase → Transition map** below) so the issue's Status field updates and the card physically moves on a default Status-grouped Jira board. The transition is best-effort — if the mapping is `skip` or the named transition is not currently available from the issue's state, the label swap still wins.

---

## Ticket Tracker — GitHub

<!-- CONFIGURE: Fill this section only if Backend is `github`. If Backend is `jira`, replace this entire section with: "**N/A** — this project uses the Jira backend; see the Jira section below." -->

- **Project name:** Figmint
- **Project ID:** `PVT_kwHOD9B30s4BY4aY`
- **Owner:** `JBabcock-DL`
- **Status field ID:** `PVTSSF_lAHOD9B30s4BY4aYzhT7CAM`

### Status Options

<!-- CONFIGURE: Replace each option ID with the actual singleSelectOptionId values from your project board.
     Find them with: gh project field-list NUMBER --owner YOUR_USERNAME --format json | jq '.fields[] | select(.name=="Status") | .options' -->

| Status          | Option ID  |
| --------------- | ---------- |
| Context Backlog | `38fea6b7` |
| In Research     | `a8b54b8c` |
| In Planning     | `69ec5a34` |
| In Build        | `9673608e` |
| In Review       | `594e69fa` |
| Completed       | `167fdd81` |

### Key Commands (GitHub)

```bash
# Create a GitHub issue
gh issue create --repo JBabcock-DL/Figmint --title "..." --label "..." --body "..."

# Add issue to project board
gh project item-add 9 --owner JBabcock-DL --url https://github.com/JBabcock-DL/Figmint/issues/{N}

# Move issue to a status column
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwHOD9B30s4BY4aY"
    itemId: "{PVTI_...}"
    fieldId: "PVTSSF_lAHOD9B30s4BY4aYzhT7CAM"
    value: { singleSelectOptionId: "{status option ID}" }
  }) {
    projectV2Item { id }
  }
}'

# List issues in the project
gh project item-list 9 --owner JBabcock-DL
```

---

## Ticket Tracker — Jira

**N/A** — this project uses the GitHub backend; see the GitHub section above.

---

## MCP Integrations

MCP (Model Context Protocol) servers extend what agents can do within this workflow — connecting to external tools, APIs, and platforms without leaving the ticket lifecycle. Any MCP-driven work should still be tied to a ticket.

### General conventions for MCP work

- Reference any external resource URLs (files, boards, APIs) in `ticket.md` under **References**
- Document what was read, written, or changed via MCP in `plan.md` after completion
- MCP tool calls are treated as implementation steps — they belong in the work phase, after a plan exists

### Available MCP servers

#### Figma (`mcp__claude_ai_Figma__*`)

Read designs, write to the Figma canvas, manage variables and component code connections.

Use when a work order involves:

- Reading a Figma design to inform implementation
- Writing components, frames, or variables back to a Figma file
- Generating diagrams in FigJam
- Managing Code Connect mappings between Figma and the codebase

#### Atlassian (Jira / Confluence)

Used as the ticket backend when **Backend** above is set to `jira`. Also available on `github`-backed projects for reading or cross-posting to a Jira/Confluence workspace when a ticket references one.

Use when a ticket involves:

- Creating, reading, or updating Jira issues
- Transitioning Jira issue phase labels
- Reading or writing Confluence pages that the ticket references

<!-- ADD YOUR MCP SERVERS HERE
#### [Server Name] (`mcp__<server>__*`)
Brief description of what it connects to and what it can do.

Use when a work order involves:
- ...
-->

---

## Conventions

- `CLAUDE.md` at the repository root (from `/project-start`) must keep its **Agent rules** so Claude reads and updates `memory.md` without the user asking. **`memory.md`** holds short, project-wide facts; update it when something stable and reusable changes. Do not use either file to replace `ticket.md` or `plan.md` for a specific ticket
- Ticket IDs are sequential per type (`BUG-001`, `BUG-002`, `WO-001`, `WO-002`, `CTX-001`, `CTX-002`) and are always prefixed onto the remote issue title
- When a `CTX-###` ticket is promoted, the folder is renamed to the next `BUG-###` or `WO-###` in sequence, the ticket body is re-templated, and the remote issue is relabeled / retyped in place. The ticket.md frontmatter records `promoted_from: CTX-###` so history is preserved.
- Sprint folders are named `Sprint {N}` — do not use dates
- All `ticket.md` files include frontmatter fields for the remote issue:
  - **GitHub backend**: `github_issue` (issue number) and `project_item_id` (PVTI\_…)
  - **Jira backend**: `jira_issue` (issue key, e.g. `PROJ-123`) and `jira_issue_id` (numeric id returned by the MCP)
- `plan.md` is always a stub when first created — expand to **plan-quality-bar.md** standard (grounded in parent `ticket.md`, sub-agent-ready) before `/build`
