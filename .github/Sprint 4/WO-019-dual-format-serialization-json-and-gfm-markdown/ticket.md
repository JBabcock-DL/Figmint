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

1. **`src/io/formats/index.ts`** — export `format(doc, 'json' | 'md')` dispatching on `doc.kind` over `FormattableDocument` (`OpsProgramV1 | TokensV1 | ComponentSpecV1 | DriftReportV1 | HandoffContextV1` from `@detroitlabs/figmint-contracts`).
2. **`src/io/formats/json.ts`** — `serializeJson` via recursive **stable key order** (`stableStringify`) + `JSON.stringify` (2-space indent); byte-identical output regardless of object construction order.
3. **`src/io/formats/markdown.ts`** — five pure renderers (no Figma/fs side effects):
   - `ops-program` — meta + ops summary table
   - `tokens` — preview tables (collections + capped token rows; full data stays in JSON)
   - `component-spec` — preview (variants, props, bindings, layout; omit deep archetype blobs)
   - `drift-report` — `## ↑ Push (N)` / `## ↓ Pull (N)` / `## ⚠ Conflicts (N)` per PRD §8.4; GFM tables per direction; summary table with glyphs
   - `handoff-context` — meta, per-frame screenshot `![name](dataUrl)`, components-used table, tokens-used list, auto-layout table
4. **One-way serialization only** — no `md→json` parser; `loadFromFile` keeps rejecting `.md` (update hint to “export-only” per research).
5. **Fixtures** — committed under `src/io/formats/__fixtures__/` (JSON inputs + golden `.md` per kind; drift AC fixture with 4 push / 2 pull / 1 conflict).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-003 (`@detroitlabs/figmint-contracts`); WO-006 ingest paths unchanged
- **Out of union:** `registry.v1`, input wire shapes (`tokens-dtcg` / `tokens-legacy`); resolve `audit-report` markdown in `/plan` (WO-010 deferred — see research)

---

## Acceptance criteria _(definition of done)_

- [ ] `format(driftReport, 'md')` for fixture with 4 push, 2 pull, 1 conflict renders three directional sections with matching `(N)` counts and ↑ ↓ ⚠ headings.
- [ ] `format(handoffContext, 'md')` includes embedded screenshot image, components-used table, and tokens-used list.
- [ ] `stableStringify` produces identical JSON for semantically equal objects with different key insertion order.
- [ ] Vitest golden tests per renderer using `src/io/formats/__fixtures__/`.
- [ ] No markdown parsing code in `src/io/formats/` or `src/io/sources/`.

## Out of scope

- Format conversion the other direction (markdown → JSON not supported; markdown is read-only output).
- Schema validation (handled at adapter layer).
- `registry.v1` markdown renderer (unless explicitly added during `/plan`).
- Ingesting `.md` files (remain `unsupported-type` on file picker).

---

## Testing & verification

### Functional QA

- Vitest: `tests/unit/io/formats/` (or colocated `src/io/formats/*.test.ts`) — dispatch, stable JSON, golden markdown per fixture.

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

- [x] [Dual-format serialization](research/dual-format-serialization.md) (2026-05-27)

## 📋 Ready for `/plan`

- Dependencies: WO-003.
- `plan.md` should lock: audit-report 6th renderer yes/no, empty drift sections, tokens preview cap, `file.ts` hint text.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.8 FR-IO-3, §8.4, §10.3
- [Dual-format serialization research](research/dual-format-serialization.md)
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
