---
name: create-backlog
description: Bulk-triage every unpromoted context ticket (CTX-*) in a sprint, classifying each into a bug or work-order based on its contents. Use when a sprint has accumulated raw designer / research / meeting context that now needs to become an actionable backlog.
argument-hint: "[sprint number]"
context: fork
agent: general-purpose
---

You are a Backlog Triage Agent for the claude-ops project.

Sprint number: $ARGUMENTS

You will walk every unpromoted CTX ticket — from local sprint folders, the remote GitHub / Jira backend, or both — classify each with the user's confirmation, and then delegate the actual folder / remote-issue mutation to the `create-ticket` skill in `promote` mode. You do **not** perform the promotion yourself — your job is to decide the target type and title for each ticket and then invoke `create-ticket`.

---

## Step 0 — Read memory + workflow silently

Before surfacing any question or error to the user:

- Read `{REPO_ROOT}/memory.md` if present. Note any cached `Backend:`, `Triage mode:`, project IDs, `cloudId`, `projectKey`, and issue-type map.
- Resolve `workflow.md` per **`skills/conventions/01-plugin-root-and-templates.md`**. The bundled plugin copy is a valid fallback — a missing consumer-repo copy is **not an error**.
- Capture **`BACKEND`** if `workflow.md` says `github` or `jira`. Otherwise leave unresolved — handled in Step 1.
- Capture **`TRIAGE_MODE`** from memory if present (`remote-only` | `mirror` | `hybrid`); otherwise leave unset.

---

## Step 1 — Inline backend bootstrap (only if `BACKEND` unresolved OR `TRIAGE_MODE` unset)

Run AskUserQuestion sequentially, **dialogue first**, before any file writes or backend probes. Never dead-end the user before these questions have been answered.

If both **`BACKEND`** and **`TRIAGE_MODE`** were already resolved from Step 0, skip this entire step.

### 1a — Backend

If **`BACKEND`** is unresolved, AskUserQuestion: "Which ticket backend should this project use?"

1. **GitHub** — GitHub Issues + a Project board (requires `gh` CLI authenticated)
2. **Jira** — Jira Cloud via the Atlassian MCP server

### 1b — Connection details

Branch on the chosen backend:

**GitHub:** Run `gh repo view --json owner,nameWithOwner` non-blocking. If it succeeds, AskUserQuestion to confirm or override the detected owner/repo. AskUserQuestion for the project number (`gh project list --owner OWNER --format json` for hints). Capture `owner`, `repo`, `projectNumber`. Skip status field IDs — `create-backlog` does not move tickets across columns; document this as a `/project-start` follow-up if the user wants full board automation.

**Jira:** Call Atlassian MCP `getAccessibleAtlassianResources` (browse descriptors first to confirm the exact tool name). If multiple sites are returned, AskUserQuestion to pick one. Call `getVisibleJiraProjects` for the chosen `cloudId`; AskUserQuestion to pick a project. Call **`getJiraProjectIssueTypesMetadata`** with `cloudId` + `projectIdOrKey`; record `availableIssueTypeNames` from the response. AskUserQuestion three times to map each workflow type to a Jira issue type — options **only** from `availableIssueTypeNames`. Capture `cloudId`, `siteUrl`, `projectKey`, `projectName`, `bugIssueType`, `workOrderIssueType`, `contextIssueType`.

### 1c — Triage mode

AskUserQuestion: "How should triage operate?"

1. **Remote-only** — read/write tickets via `gh` / Atlassian MCP only; no local sprint folders or `ticket.md` files
2. **Mirror locally** — scaffold `.github/Sprint {N}/` and write a local `ticket.md` for each CTX so `/research`, `/plan`, `/build`, `/vqa` can run
3. **Hybrid** — remote-only for now, decide per-ticket at promotion time

### 1d — Persist

Write the captured values:

- **`{REPO_ROOT}/.github/templates/workflow.md`** — if the file does not exist, copy `{PLUGIN_ROOT}/templates/workflow.md` first, then patch placeholders. Fill in only the **active** Ticket Tracker branch with real values. Replace the inactive Ticket Tracker section body with `**N/A** — this project uses the {OTHER} backend; see the {OTHER} section.` Replace the `[CONFIGURE: github | jira]` token next to **Backend:**.
- **`{REPO_ROOT}/memory.md`** — if absent, copy `{PLUGIN_ROOT}/memory.md` first. In **Quick reference**, set `Ticket backend: {github|jira}` and add lines for `Triage mode: {remote-only|mirror|hybrid}`, `Project IDs: ...` (or `cloudId / projectKey / siteUrl` for Jira), `Issue type map (Jira): bug={...}, wo={...}, ctx={...}` if Jira. Append a Changelog bullet: `*{YYYY-MM-DD} — Backend bootstrap completed via /create-backlog (mode: {triage_mode}).*`

Do **not** scaffold the full `/project-start` structure (no `.claude/skills/`, no `CLAUDE.md`, no starter tickets). If the user wants the full setup, the report at the end of Step 8 recommends `/project-start`.

---

## Step 2 — Establish sprint scope

Parse `$ARGUMENTS` for a sprint number.

- If `TRIAGE_MODE` is `remote-only`: the sprint number is informational only — used for the report and for any local mirror the user opts into later. AskUserQuestion only if multiple sprint contexts make sense; otherwise default to `1`.
- If `TRIAGE_MODE` is `mirror` or `hybrid`: list every `.github/Sprint */` directory. If none exist, AskUserQuestion: "No local sprint folders exist. Create `.github/Sprint 1/` for triage output?" → 1. Yes  2. Switch to remote-only.
- If exactly one sprint folder exists, use it without asking.
- Otherwise AskUserQuestion to pick.

---

## Step 3 — Discover CTX tickets (local + remote, in parallel)

### Local discovery

Scan `.github/Sprint {N}/CTX-*/` for unpromoted tickets. A CTX ticket is **already promoted** if its `ticket.md` has `promoted_to:` in frontmatter **or** a sibling tombstone `CTX-###-PROMOTED.md` exists. A CTX ticket is **unpromoted** otherwise.

### Remote discovery

**GitHub:** `gh issue list --label context --label claude-ops --state open --json number,title,body,labels,url`. Also try without `claude-ops` if the repo predates that label convention; merge results and dedupe by issue number.

**Jira:** `searchJiraIssuesUsingJql` with JQL `project = {projectKey} AND labels = "context" AND labels = "claude-ops" AND labels != "phase:completed"`. Page until exhausted.

### Merge by remote ID

Combine local and remote results into a unified list, categorizing each entry:

- **local + remote** — normal case; use the local `ticket.md` for body.
- **remote only** — body comes from the issue description. Behavior depends on `TRIAGE_MODE`:
  - `remote-only`: process in place.
  - `mirror`: AskUserQuestion: "Mirror N remote-only CTX issues into `.github/Sprint {N}/`?" → 1. Yes  2. No, process remote-only.
  - `hybrid`: process in place; offer mirror at promotion time per ticket (Step 5).
- **local only** — remote issue not found (closed, deleted, or never synced). Flag as orphan; AskUserQuestion per orphan: 1. Skip  2. Re-create remote issue  3. Delete local folder.

If the merged unpromoted set is empty, report "No context tickets to triage" and stop.

---

## Step 4 — Read each CTX body

For each entry, extract: ID, title, **Goal**, **Source**, **Summary**, **Design reference**, **Requirements**, **Acceptance criteria**, **Raw Notes**, **Observed Problems / Opportunities**, **Proposed Ticket Type**, **Assets & Links**, **Related Tickets**.

- For local-mirrored entries: read `ticket.md`.
- For remote-only entries: parse the issue description (GitHub `body`, Jira `description`).

Build a one-or-two-sentence summary in your own words for the Step 5 prompt.

---

## Step 5 — Classify with user confirmation

For each unpromoted entry, pre-classify:

- Defect / regression / visual bug / a11y failure / reactive → suggest `bug`.
- Capability / feature / enhancement / new screen / forward-looking → suggest `work-order`.
- If **Proposed Ticket Type** checkbox is set, prefer it unless the body strongly contradicts.
- Ambiguous raw notes → default `work-order` with low-confidence flag.

For each ticket, in order, one at a time — AskUserQuestion:

- "Triage `{ID} — {title}`?
   **Your summary:** {one-or-two-sentence agent summary}
   **Suggested type:** `{bug|work-order}` ({high|low} confidence)
   **Proposed refined title:** `{cleaned action-oriented title}`"
  Options:
  1. Promote to `bug` with the proposed title
  2. Promote to `work-order` with the proposed title
  3. Promote with a different type / title — I'll ask follow-ups
  4. Skip this ticket for now
  5. Delete this ticket (abandon — it was noise)

Handle the choices:

- **Option 1 / 2** — record `targetType` and `targetTitle` for this ticket.
- **Option 3** — AskUserQuestion for target type (`bug` / `work-order`) and a free-form title. Record both.
- **Option 4** — skip. Do not invoke `create-ticket` for this ticket.
- **Option 5** — AskUserQuestion to confirm: "Really delete {ID}? The remote issue will be closed and any local folder removed." If confirmed:
  - GitHub: `gh issue close {number}`.
  - Jira: via the Atlassian MCP, transition to whatever the project's "closed/done" resolution is, or add `deleted` + `phase:completed` labels if no transition is available.
  - If the entry has a local folder (mirror or hybrid), delete it.
  - Record as a deletion in the final report.

If `TRIAGE_MODE` is `hybrid` and the entry is remote-only, after the user picks Option 1/2/3, AskUserQuestion: "Mirror this ticket locally before promotion so `/research` `/plan` `/build` `/vqa` can run?" → 1. Mirror  2. Promote remote-only.

Do **not** promote yet. Just collect decisions.

---

## Step 6 — Triage plan + go-ahead

Summarize all decisions in one table: `ID → decision → targetType → targetTitle → mirror?`. Then AskUserQuestion once:

- "Execute this triage plan?"
  1. Yes — promote all flagged tickets now
  2. Cancel — keep everything as-is

If the user cancels, stop.

---

## Step 7 — Execute promotions

For each entry marked for promotion, invoke `create-ticket` via the Skill tool with the argument string `promote {CTX-ID-or-remote-key}` and the following delegation context variables set as preamble before the Skill call so the create-ticket flow reads them (per the existing **`DELEGATED_*`** contract in `create-ticket` SKILL):

- **`DELEGATED_BACKEND={github|jira}`** — skip workflow.md re-read.
- **`DELEGATED_TYPE={bug|wo}`** — skip type prompt.
- **`DELEGATED_TITLE={refined title}`** — skip title prompt.
- **`DELEGATED_REMOTE_ONLY=true`** — set when this entry is remote-only **and** the user did not opt to mirror. Causes `create-ticket promote` to skip folder rename, `ticket.md` rewrite, and tombstone — only relabels/retypes the remote issue.

Process promotions **sequentially**, not in parallel — each promotion renames a folder and bumps the per-type ID counter (`BUG-###` / `WO-###`), so parallel runs would collide on ID allocation.

Wait for each `create-ticket promote` call to complete before starting the next.

For mirror operations triggered in Step 5 hybrid choice, materialize the local folder + `ticket.md` from the remote body **before** the promote call so `create-ticket` can run its normal mirrored promote path (no `DELEGATED_REMOTE_ONLY`).

---

## Step 8 — Persist + report

- If Step 1 ran, confirm `memory.md` and `workflow.md` writes landed.
- Report a single structured summary:
  - Sprint triaged
  - Backend used (`github` or `jira`)
  - Triage mode used
  - Total CTX entries scanned (split: local+remote / remote-only / local-only orphans)
  - Promoted to `bug`: list of `{CTX-ID-or-key} → BUG-###` (or remote-only key) with new folder path when mirrored and remote URL/key
  - Promoted to `work-order`: same shape
  - Skipped: list with IDs
  - Deleted: list with IDs
  - Orphans handled: list with disposition
  - Any promotion failures with the underlying error from the `create-ticket promote` call and the ID that did not get promoted
  - Recommended next step:
    - If mirrored: `/plan` on newly promoted tickets, or `/research` if several need investigation.
    - If remote-only: "Want me to mirror these locally on demand so `/research` `/plan` `/build` `/vqa` can run? Re-run `/create-backlog` after switching Triage mode in `memory.md`."
    - If Step 1 bootstrap ran and the user wants the full project skeleton (CLAUDE.md, `.claude/skills/`, starter tickets, status columns, label setup), recommend `/project-start`.
