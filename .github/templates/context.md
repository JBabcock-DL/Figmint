---
name: Context
about: Intake for designer/research/meeting context — ships a default **design-handoff scaffold** (Goal, Requirements, Acceptance criteria) so engineering can pick up work without promotion; unstructured dumps still supported via Source / Raw Notes
labels: context
---

<!--
CTX tickets are triaged before `/research`, `/plan`, or `/build`.

**Two intake shapes — pick one per ticket (trim sections you do not need):**

| Shape | When to use | Fill heavily |
|-------|----------------|--------------|
| **Design handoff (default scaffold)** | Figma/Code Connect → engineering, `/dev-handoff`, or any time you want a **scoped task body** before promotion | Goal, Design reference, Requirements, Acceptance criteria, Notes for build agent |
| **Raw / research dump** | Interviews, Slack threads, transcripts, “everything we know” with **no** scoped UI yet | Source, Summary, Raw Notes, Assets & Links — leave structured sections minimal or `TBD` |

Agents creating tickets from **structured design sources** (e.g. DesignOps `/dev-handoff`, Figma MCP output) should **populate the scaffold by default** — do not strip Requirements / Acceptance criteria when the user or workflow selected a design handoff.

Promotion (`/create-ticket promote` or `/create-backlog`) still moves salient content into `bug_report.md` / `work_order.md` when CTX becomes BUG/WO.
-->

## Source

<!-- Designer / researcher / meeting / tool / date. Links to Slack, FigJam comments, etc. -->

## Goal

<!-- One short paragraph: what should engineering deliver or understand after reading this card? For design handoffs: ship surface X matching frame Y, wired for validation + a11y. -->

---

## Design reference

<!-- Omit this section if there is no visual/design artifact. -->

|                            |                               |
| -------------------------- | ----------------------------- |
| **Figma**                  | <!-- deep link -->            |
| **File key**               | <!-- optional -->             |
| **Node ID**                | <!-- optional -->             |
| **Frame / component name** | <!-- e.g. Signup — sample --> |
| **Type**                   | <!-- FRAME, COMPONENT, … -->  |

**Screenshot / preview:** <!-- MCP URL, exported PNG link, or “see Figma link” -->

---

## Requirements

### Functional

<!-- Numbered or bulleted: fields, validation rules, submit gates, navigation (terms links, sign-in), error behavior. -->

### Visual | layout

<!-- Tokens, typography styles, spacing, responsive expectations — tie to variables when known (`--space-*`, `--radius-*`, …). -->

### Technical

<!-- Stack: components/paths (`src/components/ui/…`), form library (e.g. RHF + Zod), routing, Code Connect targets. Strip `CodeConnectSnippet` wrappers in real code. -->

---

## Acceptance criteria

<!-- Checkbox list verifiable by QA / a build agent. -->

- [ ] <!-- criterion 1 -->
- [ ] <!-- criterion 2 -->
- [ ] <!-- … -->

---

## Out of scope

<!-- Optional: backend integration, email verification, i18n, … -->

---

## Notes for build agent

<!-- Concrete pointers: repo files to open, patterns to reuse, env/feature flags, MCP tools if any. -->

---

## Summary

<!-- Optional one-liner duplicate of Goal for PM dashboards — or merge with Goal if you prefer a single block. -->

## Raw Notes

<!-- Unstructured dump: transcripts, bullets, contradictions, caveats. For **design handoffs**, this can stay short if Requirements above are complete. -->

## Assets & Links

<!-- Extra attachments beyond Design reference: recordings, analytics, related issues. -->

## Observed Problems / Opportunities

<!-- Rough bullets — pain points or ideas surfaced by research/design. -->

## Proposed Ticket Type

<!-- Hint for triage / promotion. -->

- [ ] `bug` — a defect to fix
- [ ] `work-order` — a feature, enhancement, or deliverable
- [ ] `unknown` — needs human / agent triage

## Related Tickets

<!-- BUG-*, WO-*, CTX-* in this repo that overlap. -->
