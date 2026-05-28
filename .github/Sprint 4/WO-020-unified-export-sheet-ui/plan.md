# WO-020 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes

_Research (2026-05-27) — [export-sheet-ui-patterns.md](./research/export-sheet-ui-patterns.md):_

- **Greenfield:** `ExportSheet.tsx`, `exportSheetReducer.ts`, `src/ui/export/defaultPaths.ts`, `src/io/messages/export.ts`.
- **Props locked:** `{ document: ContractDocument, defaultSinks?: SinkId[] }` + optional `title`, `onComplete`, `onCancel`.
- **Sink split:** `download` + `clipboard` run in UI iframe; `output-page`, `plugin-data`, `github-pr` via `export/run` postMessage to `main.ts` (mirror Bootstrap pattern).
- **Parallel orchestration:** `Promise.allSettled` for UI sinks; main posts per-sink `export/sink-result` + terminal `export/complete`.
- **Feature gate:** `flags.githubOAuth` hides GitHub PR checkbox (Community build).
- **Path defaults:** `docs/figmint/{kind}-{date}` table per contract kind; registry → `.figmint-registry`.
- **Testing:** Vitest component tests as Storybook equivalent — no Storybook in repo; consider adding `@testing-library/react`.
- **Figma VQA blocked:** design frame not assigned (`file_key` TBD); build against Bootstrap inline-style conventions until design lands.
- **Dependency gate:** WO-019 serializer + WO-017 `Sink` interface must land (or stub) before full `/build`; WO-018 for GitHub sink wiring.

## References

- Ticket: `./ticket.md`
- Research: `./research/export-sheet-ui-patterns.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
