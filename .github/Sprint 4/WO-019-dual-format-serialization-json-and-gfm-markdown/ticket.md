---
type: work-order
github_issue: 22
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JHA
---

## Goal

Every output document gets a JSON form AND a GFM markdown form, both derived from the same canonical TS object. Markdown rendering uses plain GFM tables + headings — readable in chat, GitHub, and Figma canvas text nodes.

PRD anchors: `Docs/PRD.md` §6.8 FR-IO-3, §10.3.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/io/formats/json.ts` — serialize canonical → JSON (just JSON.stringify with stable key order).
2. `src/io/formats/markdown.ts` — serialize canonical → GFM markdown per contract type (5 renderers: ops-program, tokens preview, component-spec preview, drift-report, handoff-context).
3. Markdown uses the `↑ Push` / `↓ Pull` / `⚠ Conflict` glyphs and section headings from the PRD §8.4 + §10.3.
4. `format(doc, 'json' | 'md')` is the entry point.
5. Round-trip: never authoring markdown directly — always derived from JSON.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-003

---

## Acceptance criteria _(definition of done)_

- [ ] A drift-report.v1.json with 4 push, 2 pull, 1 conflict renders as markdown with three sections and correct counts.
- [ ] A handoff-context.v1 renders as markdown with screenshot embed + components-used table + tokens-used list.
- [ ] Unit tests per contract type, fixtures committed.

## Out of scope

- Format conversion the other direction (markdown → JSON not supported; markdown is read-only output).
- Schema validation (handled at adapter layer).

---

## Testing & verification

### Functional QA

- Vitest unit + integration tests cover the acceptance criteria above.

### Visual / design QA

- See ticket-level scope; most subsystem tickets have visual QA in their UI counterpart.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- Console.debug per major event; production telemetry deferred.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-003.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.8 FR-IO-3, §10.3
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
