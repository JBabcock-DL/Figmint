---
name: Work Order
about: Agile ticket for features, enhancements, or design-system work — structured so research, planning, build, and VQA agents can run without tribal knowledge
labels: work-order
---

<!--
WO tickets use the full scaffold below when created via `/create-ticket`, `/doc-handoff`-style enrichment, or human authoring.
Stages: 🔍 Research → 📋 Planning → 🛠️ Build → ✅ VQA — each section tells agents what to produce or validate at that gate.
-->

## Goal

<!--
One paragraph: what shipped state looks like — product outcome + engineering outcome (routes live, parity with design where applicable).
-->

---

## Problem story

<!--
As a [persona], I want [capability] so that [outcome].

Optional: Problem — [pain today]. Opportunity — [what changes if we ship this].
-->

## Hypothesis (optional)

<!--
We believe [intervention] for [persona] will [measurable outcome].

We'll know we're right when [signal].
-->

---

## User stories

<!--
Scrum-style slices the build agent can implement independently. Checkbox or numbering is fine.

Example:
- As a shopper, I can save payment methods so checkout is faster on return visits.

Add “Out of MVP” stories under ### Deferred if helpful.
-->

- [ ] <!-- story 1 -->

## Design reference *(when UI work applies)*

| | |
| --- | --- |
| **Figma** | <!-- deep link --> |
| **File key** | <!-- optional --> |
| **Node ID** | <!-- optional --> |
| **Frame / scope** | <!-- e.g. Checkout — payment methods --> |

**Screenshot / preview:** <!-- MCP asset URL, PNG, or “see link” -->

*If purely API / backend WO, replace this block with **N/A — no Figma artifact** and point to specs below.*

---

## Requirements

<!-- Break down so `/plan` can map tasks without re-interviewing the designer. -->

### Functional

<!-- Numbered bullets: flows, validations, persistence, integrations, toggles -->

1. <!-- … -->

### Visual / UX

<!-- Typography, spacing, breakpoints, responsive rules, tokens — tie to DS variables -->

- <!-- … -->

### Technical / architectural

<!--
Stack anchors: routes, services, repos, queues, schemas, env flags. Code Connect or component targets if applicable.
-->

- <!-- … -->

---

## Acceptance criteria *(definition of done)*

- [ ] <!-- testable criterion -->
- [ ] <!-- … -->

## Out of scope

<!-- Deliberately excluded: future phases, platform variants, integrations not in this WO -->

-

---

## Testing & verification

### Functional QA

-

### Visual / design QA

-

### Accessibility *(WCAG AA where applicable)*

-

### Telemetry / observability *(if needed)*

-

---

## Figma VQA Checklist

<!--
`/vqa` populates and evaluates this section AUTOMATICALLY against the Figma node referenced above. The build must match the design ~1:1. The agent fills `Captured` columns by reading Figma via the Figma MCP (get_design_context, get_variable_defs, get_screenshot) and then compares against the implemented build (rendered DOM, CSS, screenshot). Each row must end up PASS / FAIL / N/A — no blank rows on a completed ticket.

If this ticket has no UI surface, replace the entire section body with:
**N/A — no Figma artifact (backend / API / infra ticket).**
-->

**Figma source (must be filled before `/vqa` runs):**

| Field | Value |
| --- | --- |
| `file_key` | `<!-- e.g. AbCdEfGhIj1234 -->` |
| `node_id` | `<!-- e.g. 123:456 -->` |
| Figma deep link | `<!-- https://www.figma.com/design/<fileKey>/...?node-id=<nodeId> --> ` |
| Frame / scope | `<!-- e.g. Checkout — payment methods -->` |
| Captured at | `<!-- ISO date the screenshot/design_context was pulled by /vqa -->` |

**Assertions** *(agent fills `Design (Figma)` and `Build (implemented)` columns, then marks Result):*

| # | Category | Property | Design (Figma) | Build (implemented) | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Layout | Frame width × height | | | |
| 2 | Layout | Auto-layout direction / gap | | | |
| 3 | Layout | Padding (T/R/B/L) | | | |
| 4 | Layout | Alignment / distribution | | | |
| 5 | Typography | Font family | | | |
| 6 | Typography | Font weight | | | |
| 7 | Typography | Font size | | | |
| 8 | Typography | Line height | | | |
| 9 | Typography | Letter spacing | | | |
| 10 | Typography | Text token (display/body/etc.) | | | |
| 11 | Color | Background fill (hex / token) | | | |
| 12 | Color | Foreground / text fill (hex / token) | | | |
| 13 | Color | Border / stroke (hex / token) | | | |
| 14 | Color | State variants (hover / pressed / disabled) | | | |
| 15 | Spacing | Margin / gap tokens | | | |
| 16 | Effects | Border radius | | | |
| 17 | Effects | Shadow / elevation token | | | |
| 18 | Effects | Opacity | | | |
| 19 | Iconography | Icon set / size | | | |
| 20 | Components | Code Connect target / shadcn primitive used | | | |
| 21 | Components | Component variants present (size, intent, state) | | | |
| 22 | Content | Copy matches Figma exactly | | | |
| 23 | Content | Localization placeholders honored | | | |
| 24 | Responsive | Breakpoint behavior matches Figma variants | | | |
| 25 | Accessibility | Contrast ratio (WCAG AA / AAA) | | | |
| 26 | Accessibility | Hit target ≥ 44×44 pt | | | |
| 27 | Accessibility | Focus ring visible & token-based | | | |
| 28 | Screenshot | Side-by-side overlay diff (path) | | | |

**Per-row deviations:**

<!-- For every FAIL row, drop a one-line note here: "Row 7 — design 16/24, build 14/20: regenerate from `--text-body-md` token". `/vqa` writes these. -->

-

---

## 🔍 Ready for `/research`

<!--
Research agent: fill **`research/`** with findings — unknowns addressed here unblock planning.

Suggested outputs:
-

Open questions *(delete when answered)*:

-
-->

-

## 📋 Ready for `/plan`

<!--
Planning agent: `plan.md` should cite sections above — no orphaned scope.

Unresolved dependencies:

-
-->

-

## 🛠️ Ready for `/build`

<!--
Build agents: prerequisites before implementation

-
-->

-

## References

<!-- Links to tickets, RFCs, Confluence, metrics dashboards, Slack threads -->

-
