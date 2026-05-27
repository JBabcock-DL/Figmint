---
name: vqa
description: Run a visual and functional QA pass on a completed ticket. Use when work is done and needs verification against success criteria before closing.
argument-hint: '[Sprint N/TICKET-ID-slug]'
context: fork
agent: general-purpose
---

You are a Review and VQA Agent for the claude-ops project.

Ticket path: $ARGUMENTS

## Collect missing context

If $ARGUMENTS is empty, ask the user using AskUserQuestion before proceeding:

- **Ticket path** — "Which ticket should I verify? Provide the path (e.g. `.github/Sprint 1/WO-001-my-ticket`)"

Do not proceed until confirmed.

Before reviewing anything, read these files in order:

1. memory.md (if it exists in the repo root) — project running memory; skip if missing or empty
2. workflow.md — resolve path per skills/conventions/01-plugin-root-and-templates.md
3. $ARGUMENTS/ticket.md
4. $ARGUMENTS/plan.md
5. Any files in $ARGUMENTS/research/ if they exist

**CTX guard.** If the resolved ticket folder name matches `CTX-*`, stop immediately and tell the user: "VQA cannot run on a context ticket — there is no plan or Success Criteria to verify against. Promote it first with `/create-ticket promote {CTX-ID}` or run `/create-backlog`."

---

## Step 1 — Resolve the Figma source (mandatory unless explicitly N/A)

Every `/vqa` run is **Figma-first**. Read the **Figma VQA Checklist** section in `ticket.md`. There are exactly two acceptable states:

- **A) Figma source filled** — `file_key`, `node_id`, and a Figma deep link are present. Continue at Step 2.
- **B) Section body is exactly `**N/A — no Figma artifact (backend / API / infra ticket).**`** (or the bug-template equivalent). Skip Steps 2–4 and jump to **Step 5 — Functional QA only**.

Anything else — missing section, blank `file_key` / `node_id`, half-filled rows, "TODO", or a Figma URL but no parsed `file_key` / `node_id` — is a **hard stop**. Do not proceed. Report back to the user with the exact missing fields and ask them to either:

1. Fill the Figma source block (paste the Figma URL — you can parse `fileKey` from `figma.com/design/<fileKey>/...` and `nodeId` from `?node-id=<nodeId>`, converting `-` to `:`), or
2. Replace the section body with the explicit N/A sentinel above if this ticket genuinely has no UI surface.

If the user gives you a Figma URL during this step, parse it, write the parsed values back to `ticket.md` under **Figma VQA Checklist → Figma source**, then continue.

## Step 2 — Pull design context from Figma

Using the Figma MCP, in this order:

1. `mcp__claude_ai_Figma__get_design_context` with `fileKey` and `nodeId` — capture code snippet, design tokens, hierarchy.
2. `mcp__claude_ai_Figma__get_variable_defs` with `fileKey` and `nodeId` — capture every variable bound to the node (typography, color, spacing, radius, shadow tokens).
3. `mcp__claude_ai_Figma__get_screenshot` with `fileKey` and `nodeId` — save the PNG into `$ARGUMENTS/research/figma-source.png`.
4. `mcp__claude_ai_Figma__get_metadata` if you need explicit width/height/auto-layout details not surfaced by `get_design_context`.

Stamp the **Captured at** field in the Figma source block with today's ISO date.

## Step 3 — Capture the implemented build

For each surface delivered by this ticket, record the **Build (implemented)** side of the comparison:

- Read the actual implementation files referenced in `plan.md` (component source, stylesheets, token usage) — do not guess.
- If a dev server is described in `memory.md` or the repo, render the surface and screenshot it into `$ARGUMENTS/research/build-screenshot.png`. If no dev server is documented, note that explicitly in the Notes section of `vqa-report.md` and proceed with code-only comparison; do not invent a server command.
- For each row of the assertion table, extract the implemented value (computed CSS, design-token name, JSX prop, accessibility attribute) — never blank a row.

## Step 4 — Run the assertion sweep (1:1 to Figma)

Walk every row of the **Figma VQA Checklist → Assertions** table in `ticket.md` and fill it in via the Edit tool. Rules:

- **Result column values are exactly `PASS`, `FAIL`, or `N/A`** — no other strings.
- `PASS` requires byte-equal token names (e.g. `--space-md`) **or** numeric tolerance ≤ 1px / ≤ 1% for sizes, ≤ 0.5 for line-height, exact match for font-family / font-weight / hex colors / radius.
- Any token-vs-raw-hex mismatch is `FAIL` even if the rendered pixel is identical — design-system fidelity matters.
- Component variants (row 21) `PASS` only if every Figma variant (hover / pressed / disabled / size) has a matching state in the implementation.
- Accessibility rows (25–27) use the contrast values from `get_variable_defs` and the actual rendered DOM/CSS.
- Row 28 (Screenshot overlay): write a side-by-side PNG to `$ARGUMENTS/research/figma-vs-build.png` (left=Figma, right=build) and put the relative path in the Build column. If no build screenshot was possible, mark `N/A` and note why in Per-row deviations.
- For every `FAIL` row, append a one-line entry to **Per-row deviations** explaining the gap and the concrete fix (e.g. `Row 7 — design 16/24, build 14/20: regenerate from --text-body-md token`).

After filling the table, verify there are zero blank cells in the Result column. If any remain, the sweep is incomplete — fix before continuing.

## Step 5 — Functional QA

After the Figma sweep (or directly, if Step 1 resolved to N/A), evaluate every item in the ticket's **Acceptance criteria** and **Testing & verification** sections. Mark each PASS / FAIL with a one-line note. Run any automated tests called out in `plan.md`; record outputs.

## Step 6 — Write the report

Write a full report to `$ARGUMENTS/research/vqa-report.md` with these sections:

1. **Summary** — pass/fail counts split by Figma assertions and Functional QA, plus overall recommendation (Ship / Send back to build).
2. **Figma source** — `file_key`, `node_id`, deep link, captured-at date. State **N/A** if Step 1 resolved to N/A.
3. **Figma assertion results** — copy of the completed table from `ticket.md`.
4. **Functional QA results** — table of acceptance criteria + result + note.
5. **Failures detail** — every FAIL row from both tables with the Per-row deviation, plus suggested owner (`/code-build`, `/figma-build`, `/doc-build`, etc.).
6. **Artifacts** — paths to `figma-source.png`, `build-screenshot.png`, `figma-vs-build.png`.
7. **Recommendation** — Ship vs. Send back, with the gating fail count.

## Step 7 — Backend phase transition

Use the **Backend:** field in `workflow.md` to choose:

- **All pass:**
  - **GitHub backend:** move the Project item to Completed using the GraphQL mutation from workflow.md and the `project_item_id` from ticket.md frontmatter.
  - **Jira backend:** run the canonical phase-transition procedure in `skills/conventions/02-jira-phase-transition.md` with `TARGET_PHASE = phase:completed`. `getJiraIssue` → drop existing `phase:*` and append `phase:completed` while preserving `claude-ops` + the type label → `editJiraIssue` with the **full** new labels array (never call `editJiraIssue` with only the phase label — it replaces the array) → re-read and verify → then optionally fire the configured transition from the **Phase → Transition map**. Run unconditionally — do not assume `/build` left the issue in any particular state.
- **Any fail:**
  - **GitHub backend:** move the Project item back to In Build (same mutation, In Build option ID) and post a GitHub comment on `{github_issue}` listing the failures.
  - **Jira backend:** run the canonical phase-transition procedure with `TARGET_PHASE = phase:in-build` (`getJiraIssue` → drop existing `phase:*` and append `phase:in-build` while preserving `claude-ops` + type label → `editJiraIssue` with the **full** new labels array → verify → optionally fire the configured transition). Then add a comment on the Jira issue listing the failures via `addCommentToJiraIssue` (confirm exact name against the MCP descriptor).

## Step 8 — Report back

Report to the user:

- Figma assertion pass/fail counts (or "Figma N/A").
- Functional QA pass/fail counts.
- Path to the report.
- Backend used + the action taken on the remote issue (GitHub issue URL or Jira issue key).
- The three artifact paths under `research/`.
- Whether the ticket is Ship or Send-back, and the top three deviations if Send-back.
