# WO-019 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes

Research (2026-05-27) — [dual-format-serialization.md](./research/dual-format-serialization.md):

- Entry: `format(doc, 'json' | 'md')` in `src/io/formats/index.ts`; union covers five output kinds only (not `registry`, not input wire tokens).
- JSON: `stableStringify` (recursive lexicographic key sort) — not raw `JSON.stringify`.
- Markdown: GFM only; drift headings locked to `## ↑ Push (N)` / `## ↓ Pull (N)` / `## ⚠ Conflicts (N)` (PRD §8.4).
- **Never** md→json; update `file.ts` hint from “parsing lands in WO-019” to export-only message.
- Fixtures + goldens: `src/io/formats/__fixtures__/`; drift AC fixture = 4 push / 2 pull / 1 conflict.
- **Open for plan:** sixth renderer for `audit-report` (WO-010 deferral) vs strict five renderers on ticket.

## References

- Ticket: `./ticket.md`
- Research: `./research/dual-format-serialization.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
