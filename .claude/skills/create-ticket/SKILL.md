---
name: create-ticket
description: Create a new bug, work order, or context ticket in the active ticket backend (GitHub or Jira) first, then write the local sprint folder and ticket.md — or promote an existing context ticket into a bug / work-order. Use when creating a new ticket, dropping raw context, or converting a CTX ticket into a concrete unit of work.
argument-hint: "[bug|wo|ctx|promote] [title-in-quotes | CTX-###]"
context: fork
agent: general-purpose
---

You are managing a ticket for the claude-ops project.

Arguments received: $ARGUMENTS

There are **two modes** for this skill. Determine which one by inspecting $ARGUMENTS:

- **Create mode** — `$0` is one of `bug`, `wo`, `ctx`. `$1` is the ticket title.
- **Promote mode** — `$0` is `promote`. `$1` is a CTX ticket ID (e.g. `CTX-001`) or a full ticket folder path.

If neither maps cleanly, ask the user using AskUserQuestion which mode they want:

- "What do you want to do?"
  1. **Create a new ticket** — bug, work order, or context
  2. **Promote a context ticket** — convert a CTX-### into a bug or work-order

---

## Path resolution (`create-ticket`)

**`REPO_ROOT`** — Root where **`.github/Sprint */`** ticket folders will be created (working directory / workspace root unless the user scoped another path).

Resolve **`workflow.md`**, **`bug_report.md`**, **`work_order.md`**, and **`context.md`** using **`skills/conventions/01-plugin-root-and-templates.md`** — shared by all **`labs-agent-workflow`** skills (**no machine-specific paths**).

---

Before doing anything else, read **`{REPO_ROOT}/memory.md`** if it exists.

Then resolve and read **`workflow.md`** using the convention in **`skills/conventions/01-plugin-root-and-templates.md`**:

- Prefer **`{REPO_ROOT}/.github/templates/workflow.md`** when it exists
- Otherwise fall back to the bundled plugin copy at **`{PLUGIN_ROOT}/templates/workflow.md`**

Missing repo-local `workflow.md` is fine — the bundled template is used — but an **unconfigured Backend** blocks **create mode** (see Mode A).

From the resolved **`workflow.md`**, read the **Backend:** field under **## Ticket Backend** and normalize it (strip surrounding backticks or quotes). Record the result as **`BACKEND`** when it is exactly **`github`** or **`jira`**.

If this run revealed a durable fact for **Quick reference** (e.g. confirmed backend quirks), update **`memory.md`** — per **`CLAUDE.md`** in **`REPO_ROOT`** if present, without the user having to ask.

---

## Mode A — Create

### Delegation context (when invoked by another skill)

A calling skill (e.g. `/dev-handoff`) may set these variables to skip questions already answered upstream. When any are present, use the provided value and omit the corresponding AskUserQuestion.

| Variable | Meaning | Skips |
|---|---|---|
| **`DELEGATED_TYPE`** | `ctx \| wo \| bug` | Type question |
| **`DELEGATED_TITLE`** | Ticket title string | Title question |
| **`DELEGATED_BODY`** | Pre-composed markdown body | “Additional information” prompt + body composition |
| **`DELEGATED_BACKEND`** | `github \| jira` | `workflow.md` Backend read — use directly |
| **`DELEGATED_REMOTE_ONLY`** | `true` — operate against remote backend only; skip local sprint folder, `ticket.md`, `plan.md` writes | All local-file steps |

### Collect missing context (order matters)

Parse $ARGUMENTS for ticket type ($0) and title ($1). Use **`DELEGATED_TYPE`** / **`DELEGATED_TITLE`** if set. For any value still not provided, ask using AskUserQuestion **in this order** — do not collect long-form detail before **Type** is known, because **Type** selects the template and drives where information belongs.

- **Type** — “What type of ticket is this?”
  1. `bug` — a defect to fix
  2. `wo` — a work order (feature / enhancement / deliverable)
  3. `ctx` — raw context from a designer / researcher / meeting, to triage later
- **Title** — “What is the ticket title?” (For `ctx` tickets, a loose summary is fine — this becomes the folder slug.)

Do not proceed until both values are confirmed.

### Optional: additional information for developers

Skip this step entirely when **`DELEGATED_BODY`** is set — the body is already composed.

**After** Type and Title are fixed, if the user has **not** already given a complete ticket body (e.g. via slash-command paste or upstream skill passing prose), ask **once** for any **additional** context for the people who will implement or triage the ticket. Fold the answer into the correct sections of the chosen template (e.g. **Notes for build agent**, **Additional Context**, **Raw Notes**, **Requirements** subsections) instead of front-loading a type-agnostic dump.

Upstream skills (e.g. `/dev-handoff` delegating here) must **choose ticket type before** prompting for this kind of add-on detail, so the scaffold matches the ticket shape.

### Read the template

Skip this step when **`DELEGATED_BODY`** is set.

Read the template that matches the ticket type (resolve basename per `skills/conventions/01-plugin-root-and-templates.md`):

- `bug` → `bug_report.md`
- `wo`  → `work_order.md`
- `ctx` → `context.md`

### Backend check (before remote sync)

Resolve **`BACKEND`**:

1. If **`DELEGATED_BACKEND`** is set, use it directly — skip `workflow.md` read.
2. Otherwise read the **Backend:** field from the resolved `workflow.md` (plugin bundled copy is always the fallback; a missing consumer-repo `workflow.md` is **never** an error here).

If **`BACKEND`** is not exactly **`github`** or **`jira`** (including `[CONFIGURE: github | jira]`), **stop here**. Tell the user in one clear message:

- The **Ticket Backend** in `workflow.md` is not yet configured.
- Run **`/project-start`** in **`{REPO_ROOT}`**, or edit **`{REPO_ROOT}/.github/templates/workflow.md`** and set **Backend** plus the active **Ticket Tracker** section with real IDs.
- The type (**`{type}`**), title (**`"{title}"`**), and any notes collected so far are **not** lost — re-run **`/create-ticket {type} "{title}"`** after configuring the backend.

Do **not** create the sprint folder, `ticket.md`, or any local files before this check passes.

### Jira — fetch project issue types before choosing Jira issue type (create mode only)

When **`BACKEND`** is **`jira`** (create mode — not Mode B promote yet):

1. Resolve **`cloudId`** and **`projectKey`** from **`workflow.md` → Ticket Tracker — Jira**. If **`DELEGATED_BACKEND`** caused an earlier skip of the full **`workflow.md`** read, **`Read`** it now to obtain at least that section (and any fields **`createJiraIssue`** needs later).
2. If either value is missing or still a **`[CONFIGURE: ...]`** placeholder, **stop** with the same class of guidance as an unconfigured backend: set real values (run **`/project-start`** or hand-edit **`workflow.md`**) — **`/create-ticket`** does not assume **`/project-start`** was ever run.
3. Browse Atlassian MCP descriptors, then call **`getJiraProjectIssueTypesMetadata`** (confirm exact tool name) with **`cloudId`** and **`projectIdOrKey`** = **`projectKey`**. Use **`startAt` / `maxResults`** to pull the full set if the response is paginated.
4. Build **`availableIssueTypeNames`**: every issue type **`name`** Jira returns for that project (these are **creatable issue types** from project metadata — not a list of existing issues). If the list is empty, **stop** — the project has no usable issue types for this account.
5. **Do not** run AskUserQuestion about which **Jira** issue type to use, and **do not** pass **`issueTypeName`** to **`createJiraIssue`**, until this fetch has succeeded and you have **`availableIssueTypeNames`**. **After** the fetch, you **always** run **AskUserQuestion** for Jira issue type (see **Backend: Jira**) — **never** skip that question. **`availableIssueTypeNames`** must come **only** from the Atlassian MCP **`getJiraProjectIssueTypesMetadata`** response for the configured **`projectKey`** — **do not** use **`workflow.md`** lines (**Issue type — Bug / Work Order / Context**), bundled template examples, or any file copy as a source for option labels or “available types”; those fields are **not** authoritative for what Jira will accept.

GitHub backend: skip this entire subsection.

### Invocation

Use whichever shape your runtime exposes:

- **Slash-command:** `/create-ticket {ctx|wo|bug} "{title}"` — when prompted for the ticket body, paste the composed Markdown body. **`workflow.md`** already resolved above supplies **Backend** (GitHub vs Jira).
- **Skill-proxy:** **`Read`** this **`SKILL.md`** from **`PLUGIN_ROOT`** and execute **Execute the create flow** below inline.

### Execute the create flow

If **`DELEGATED_REMOTE_ONLY`** is `true`, perform steps 1–4 (compose body + sync to remote) but **skip** steps 5–7 (no local folder, no `ticket.md`, no `plan.md`). The report should cite remote IDs/URL only.

Do **not** create the sprint folder or write **`ticket.md`** until **after** the remote issue exists and you have captured its IDs (steps 1–3 prepare content; step 4 is remote; steps 5–7 write local files).

1. Determine the current sprint folder and the next sequential ticket ID for the chosen type by scanning `.github/Sprint */` for existing `BUG-*`, `WO-*`, or `CTX-*` folders. Each type has its own independent counter.
   - `bug` → `BUG-{N}`
   - `wo`  → `WO-{N}`
   - `ctx` → `CTX-{N}`
2. Generate the ticket slug from the title (lowercase, hyphenated, max 5 words).
3. **Compose the ticket body** — use **`DELEGATED_BODY`** verbatim when set (skip composition). Otherwise compose in memory only until step 6:
   - For `bug` and `wo`: populate Requirements / Success Criteria / etc. as best you can from the title; leave sections the user should fill in marked with TODO checkboxes.
   - For `ctx`: use **`context.md`**. It includes a **design-handoff scaffold** (Goal, Design reference, Requirements, Acceptance criteria, …). When the intake is a **structured design→engineering handoff** (e.g. `/dev-handoff`, Figma MCP, explicit user choice), **populate that scaffold by default** from the design source — include Requirements and Acceptance criteria when they are grounded in the frame/spec; do not strip them. When the intake is **unstructured** (meetings, transcripts), keep Requirements / Acceptance criteria minimal or `TBD` and rely on Source / Raw Notes — **do not invent** scoped requirements the source material does not support. The user (or `/create-backlog`) completes or trims sections before promotion.

     **`ctx` heading contract — structured design handoff (mandatory):** These exact heading strings must appear in this order. Any deviation (e.g., `## Functional` instead of `### Functional` under `## Requirements`, or three standalone `##` subsections instead of one `## Requirements` parent) makes the ticket non-conformant and breaks downstream promote flows:

     | Heading | Level | Rule |
     |---|---|---|
     | `## Goal` | H2 | One focused paragraph — required |
     | `## Design reference` | H2 | Table + screenshot line — required when design source is available |
     | `## Requirements` | H2 | Parent heading only — no body text; subsections follow immediately |
     | `### Functional` | H3 | Numbered requirements — required |
     | `### Visual \| layout` | H3 | Token specs + layout — required |
     | `### Technical` | H3 | Code Connect paths + a11y — required |
     | `## Acceptance criteria` | H2 | Checkbox list — required |
     | `## Out of scope` | H2 | Explicit exclusions — required |
     | `## Notes for build agent` | H2 | File pointers + component API notes — required |

     **Fidelity requirements when composing from a design source (Figma MCP, Code Connect hints):**
     - **Functional copy:** Every TEXT node label, placeholder, helper, or CTA must appear as exact copy in a numbered requirement. Do not paraphrase.
     - **Validation rules:** Write as testable statements (e.g. `Min 8 characters`, `Validate on blur`, `CTA disabled until valid + checkbox checked`) — not vague phrasing (`"typical submit guard"`, `"when in scope"`).
     - **Token names:** Use exact `var(--token-name)` strings from the design source. Do not substitute generic descriptions (`"border token"`, `"purple button"`).
     - **Code Connect props:** Name every Code Connect component target with its exact props (variant, size, leadingIcon, trailingIcon, etc.) — not just the component name.

   - **One-body rule (mandatory, all ticket types):** The complete body goes into the `description` field of the remote issue in a single create call (or a follow-up `editJiraIssue` / `gh issue edit` if the first call needs adjustment). **Never** split content between a short description and a comment. One authoritative record: description only.

**Pre-submit self-check — verify before step 4 (remote sync). If any item fails, fix it first:**

For `ctx` tickets from a structured design source:
- [ ] All scaffold headings match the heading contract exactly — no merged headings, no standalone `## Functional`
- [ ] `## Requirements` is a parent H2 with three H3 subsections (`### Functional`, `### Visual | layout`, `### Technical`)
- [ ] `### Functional` uses numbered requirements with exact copy from the design source — not paraphrased
- [ ] `### Visual | layout` uses `var(--…)` token names — no generic color/spacing descriptions
- [ ] `### Technical` names specific Code Connect components and their props explicitly

For all ticket types:
- [ ] All content is in the description field — nothing deferred to a comment or external doc not linked in the body
- [ ] **Figma VQA Checklist** section present (in `wo` and `bug` bodies). If a Figma URL was provided as part of the source, parse `file_key` and `node_id` from it (`figma.com/design/<fileKey>/...?node-id=<nodeId>`, converting `-` to `:`) and write them into the `Figma source` table along with the deep link and frame name. Leave the Assertions table empty — `/vqa` fills it. If the ticket has no UI surface, replace the checklist body with the literal sentinel `**N/A — no Figma artifact (backend / API / infra ticket).**` (or the bug-template equivalent). Never leave the section blank or with placeholder TODO values — `/vqa` will hard-stop on those.

4. **Sync to the remote backend first** — execute **only** the branch matching **`BACKEND`**. GitHub labels follow the ticket type. For Jira, **`issueTypeName`** comes **only** from **AskUserQuestion** whose options are **`availableIssueTypeNames`** from the **MCP fetch** — never from **`workflow.md`** issue-type lines.

| Ticket type | GitHub label | Jira type label (on the issue) |
|---|---|---|
| `bug` | `bug` | `bug` |
| `wo` | `work-order` | `work-order` |
| `ctx` | `context` | `context` |

#### Backend: GitHub

1. Create the GitHub issue using `gh` CLI with the correct label. The issue title must be prefixed with the ticket ID: `{TICKET-ID}: {title}` (e.g. `WO-001: Configure project goal in workflow.md`, `CTX-002: Designer dump for checkout flow`). Use the composed body from step 3 as `--body`.
2. Capture the issue number for frontmatter (`github_issue`).
3. Add the issue to the project board using the **project number** and **owner** from the **Ticket Tracker — GitHub** section of `workflow.md`; capture the returned project item ID (`PVTI_...`) for `project_item_id`.
4. Set the Status field to **Context Backlog** using the Project ID, status field ID, and Context Backlog option ID from `workflow.md` (same single-select mutation shown in the **Key Commands (GitHub)** block).

#### Backend: Jira

All Jira work goes through the **Atlassian MCP server**. Before calling any MCP tool, browse the MCP tool descriptors for the `atlassian` server and confirm the exact tool names available. If the Atlassian MCP requires authentication, call its `mcp_auth` tool first and stop until authentication succeeds.

**`availableIssueTypeNames`** must already exist from **Jira — fetch project issue types** (create mode). It must be built **exclusively** from the **`getJiraProjectIssueTypesMetadata`** MCP response for this **`projectKey`** — **never** merge in, substitute, or display names taken from **`workflow.md`** (including **Issue type — …** lines or template placeholders).

**`issueTypeName`** for **`createJiraIssue`** is **only** the user’s choice from **AskUserQuestion**; **every option** must be a name from **`availableIssueTypeNames`** (canonical spelling from the MCP response after matching the user’s reply case-insensitively).

1. **Always** run **AskUserQuestion** *after* the fetch. Wording may reference the **workflow ticket type** only (`bug` / `work order` / `context`) — e.g. “Which **Jira** issue type should we use for this **{bug | work order | context}** ticket?” **Do not** mention or copy suggested type names from **`workflow.md`** into the question (that file is not the source of truth for Jira’s scheme).
2. **`createJiraIssue`:** use `cloudId`, `projectKey`, and **`issueTypeName`**. The summary must be prefixed with the ticket ID: `{TICKET-ID}: {title}`.
   Include these labels on creation (via **`additional_fields`** / labels as required by the MCP descriptor):
   - `claude-ops`
   - One of `bug`, `work-order`, or `context` (matching the ticket type)
   - `phase:context-backlog`
   Use the composed body from step 3 as the issue description. Prefer plain text / wiki markup over ADF.
3. Capture the returned `key` (e.g. `PROJ-123`) and `id` from the MCP response for `jira_issue` and `jira_issue_id` frontmatter.
4. **Verify labels round-tripped** — call `getJiraIssue` and confirm the new issue has all of: `claude-ops`, the type label (`bug` / `work-order` / `context`), and `phase:context-backlog`. If any are missing (some Jira projects strip labels not declared in the project's label scheme, or the MCP shape stored them under a different field), re-apply via the canonical procedure in `skills/conventions/02-jira-phase-transition.md` (`getJiraIssue` → compute the full label set → `editJiraIssue` with the complete array → re-verify).
5. **Optionally transition Status** to match `phase:context-backlog`. Read the **Phase → Transition map** from `workflow.md`. If the row for `phase:context-backlog` is not `skip`, call `getTransitionsForJiraIssue` on the new issue key, match the configured transition name case-insensitively against `transitions[].name` to get its `id`, then call `transitionJiraIssue` with that `id`. If the configured name is not currently available (workflow guard — newly created issues often start in the right column already) or the row is `skip`, continue without erroring — the label is authoritative.

If **`createJiraIssue`** still fails on issue type, refetch **`getJiraProjectIssueTypesMetadata`** (MCP only), refresh **`availableIssueTypeNames`**, run **AskUserQuestion** again, and retry. You may **optionally** edit **`workflow.md`** **Issue type — …** lines afterward to record what was chosen — purely documentation; the next **`/create-ticket`** run still **must** fetch from Jira via MCP and ask again from that fresh list.

### Write local files (after remote IDs exist)

5. Create the folder: `.github/Sprint {N}/{TICKET-ID}-{slug}/`
6. Write **`ticket.md`** with YAML frontmatter filled from the remote response, then the composed body from step 3:
   - **GitHub:** `github_issue:`, `project_item_id:`, plus `type: {bug|work-order|context}`
   - **Jira:** `jira_issue:`, `jira_issue_id:`, plus `type: {bug|work-order|context}`
7. Write a stub **`plan.md`** **only for `bug` and `wo`**. For `ctx` tickets, do **not** create **`plan.md`** — planning is meaningless until the ticket is promoted.

If the remote sync in step 4 fails, **do not** create the sprint folder or **`ticket.md`** (fix the backend / credentials / network, then re-run **`/create-ticket`**).

### Report back (create mode)

- Ticket folder path
- Ticket type, ID, and title
- Backend used (`github` or `jira`)
- **If GitHub:** the GitHub issue URL and the project item ID
- **If Jira:** the Jira issue key, the full Jira URL (`<siteUrl>/browse/<KEY>`), and the labels applied
- If `ctx`: remind the user that this ticket is in intake and must be promoted via `/create-ticket promote {CTX-ID}` or `/create-backlog` before research / plan / build / vqa will run on it.

---

## Mode B — Promote (`/create-ticket promote CTX-###`)

This mode converts an existing **context** ticket into a `bug` or `work-order`, keeping the remote issue in place (relabel / retype) and preserving history via a `promoted_from` frontmatter field.

### Locate the source CTX ticket

Parse `$1`. It can be:
- A ticket ID like `CTX-001` — scan `.github/Sprint */` for the matching `CTX-001-*` folder.
- A full folder path like `.github/Sprint 1/CTX-001-designer-dump`.

If `$1` is empty or not found, AskUserQuestion: "Which context ticket should I promote?" and list every unpromoted `CTX-*` folder found under `.github/Sprint */` (skipping any whose ticket.md already has `promoted_to:` in frontmatter).

Read the located `.github/Sprint {N}/CTX-###-{slug}/ticket.md`. Note the current `github_issue` + `project_item_id` **or** `jira_issue` + `jira_issue_id` frontmatter.

### Ask for the target type

Even if the CTX ticket has a hint in **Proposed Ticket Type**, confirm with the user via AskUserQuestion:

- "Promote `CTX-### — {title}` to which type?"
  1. `bug`
  2. `wo`
  3. `cancel — leave it as context`

Also AskUserQuestion for a **clean title**:

- "What title should the promoted ticket have?" — default to the current CTX title with the `CTX-###:` prefix stripped.

### Remote-only delegation

If **`DELEGATED_REMOTE_ONLY=true`**, skip every local file mutation (steps 1–6 of Execute the promote flow that touch folders / `ticket.md` / tombstone). Run only the remote update branch (GitHub or Jira) plus a remote comment recording `Promoted from {OLD-ID} to {NEW-ID} on {YYYY-MM-DD}` (since there is no local frontmatter `promoted_from` to write). The remote issue title still gets the new `{NEW-ID}: {title}` prefix and the new label set.

### Execute the promote flow

1. Compute the next sequential ID for the chosen target type (scan `BUG-*` or `WO-*` folders across `.github/Sprint */`).
2. Generate a new slug from the (possibly refined) title.
3. Rename the folder: `.github/Sprint {N}/CTX-###-{old-slug}/` → `.github/Sprint {N}/{BUG|WO}-###-{new-slug}/`.
4. Replace the body of `ticket.md` with the correct template (`bug_report.md` or `work_order.md`) using **`skills/conventions/01-plugin-root-and-templates.md`**, **migrating the salient content** from the CTX body:
   - **Goal**, **Design reference**, **Requirements** (all subsections), **Acceptance criteria**, **Out of scope**, and **Notes for build agent** — when present (design-handoff `context.md`), map into **Requirements** / **Success Criteria** / **References** as appropriate for the target template; do not drop actionable bullets.
   - **Source** and **Raw Notes** → merged into **Additional Context** (bug) or the top of **Problem Story** / **Hypothesis** (work order), unless already folded into Requirements above.
   - **Observed Problems / Opportunities** → seed entries for **Requirements**.
   - **Assets & Links** → **References**.
   - **Related Tickets** → **References**.
   - Preserve the original CTX body verbatim at the bottom under a collapsible `<details><summary>Original context capture (CTX-###)</summary>…</details>` block so nothing is lost.
5. Update frontmatter on the new ticket.md:
   - Change `type:` to `bug` or `work-order`.
   - Keep the existing remote IDs (`github_issue` / `project_item_id`, or `jira_issue` / `jira_issue_id`) — the remote issue is not re-created.
   - Add `promoted_from: CTX-###`.
6. Keep the old CTX **number reserved** — do not reuse `CTX-###` later. (Since we renamed the folder, no CTX-### folder will exist anymore; leave a tombstone in `.github/Sprint {N}/CTX-###-PROMOTED.md` containing a single line: `Promoted to {BUG|WO}-### on {YYYY-MM-DD}. See ./{new-folder}/ticket.md.`)
7. Update the remote issue to reflect the new type and ID — **only if** **`BACKEND`** is **`github`** or **`jira`** (from **`workflow.md`**) **and** the ticket’s remote ID fields are not **`TBD`**. Otherwise **skip** the GitHub/Jira subsections below and report that the local promote finished without a remote update (configure **`workflow.md`** and real remote IDs before expecting the tracker to match). When **`DELEGATED_REMOTE_ONLY=true`**, the remote update is the only output — there is no local folder, no `ticket.md`, no tombstone.

#### Backend: GitHub

- Rename the issue title using `gh issue edit {github_issue} --title "{NEW-ID}: {title}"`.
- Remove the `context` label and add `bug` or `work-order`:
  `gh issue edit {github_issue} --remove-label context --add-label {bug|work-order}`
- Replace the issue body with the new ticket.md body via `gh issue edit {github_issue} --body "..."`.
- Leave the project board Status on **Context Backlog** — the promoted ticket is now ready for the normal lifecycle starting at `/research` or `/plan`.

#### Backend: Jira

Use the Atlassian MCP. **Before** choosing the target **`issuetype`**, call **`getJiraProjectIssueTypesMetadata`** for the ticket’s **`projectKey`** (read **`projectKey`** / **`cloudId`** from **`workflow.md`** **only** as connection config — not for issue type names) and build **`availableIssueTypeNames`** **solely** from that MCP response, same as create mode (creatable **issue types**, not existing issues).

- **Always** run **AskUserQuestion** after the fetch; options **only** from **`availableIssueTypeNames`** (same rules as create mode). **Do not** read **`workflow.md` Issue type — …** lines to build options or to phrase suggested type names — only MCP-returned names are accurate for the Jira project.
- Update the issue summary to `{NEW-ID}: {title}` via `editJiraIssue`.
- Update labels: remove `context`, add `bug` or `work-order` (keep `claude-ops` and `phase:context-backlog`).
- Update the `issuetype` field to the resolved name. If **`editJiraIssue`** refuses the update (scheme / permissions), fall back gracefully: leave Jira issue type as-is, keep the `bug` / `work-order` label as the authoritative type signal, and report this in the final output.
- Replace the description with the new ticket.md body.

### Report back (promote mode)

- Source: `CTX-### — {old title}`
- Target: `{BUG|WO}-### — {new title}`
- New folder path
- Backend used
- **If GitHub:** issue URL (unchanged), confirmation that labels and title were updated
- **If Jira:** issue key (unchanged), confirmation that labels, summary, and (if successful) issue type were updated; any fallback notes
- If **`DELEGATED_REMOTE_ONLY=true`**: report only the remote key/URL and the new ID; explicitly note no local files were created.
- Recommended next step: `/research` (for unfamiliar problems) or `/plan` (if scope is clear)
