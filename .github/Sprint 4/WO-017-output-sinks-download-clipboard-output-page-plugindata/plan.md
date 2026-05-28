# WO-017 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes

### Locked decisions (from research 2026-05-27 — do not relitigate during `/plan` or `/build`)

- **`Sink.write(doc: LoadedDocument, options: FormatOptions): Promise<SinkResult>`** — shared interface for all four sinks; see [`research/output-sinks-implementation.md`](research/output-sinks-implementation.md) §1.
- **Thread split:** `download.ts` + `clipboard.ts` run in UI iframe; `outputPage.ts` + `pluginData.ts` run on main thread; UI uses `outputPageClient.ts` / `pluginDataClient.ts` postMessage wrappers (bootstrap pattern).
- **Serialization:** `prepareSinkContent()` calls WO-019 `format()` when available; stub `JSON.stringify` + placeholder MD acceptable until WO-019 merges.
- **Clipboard write:** primary `navigator.clipboard.writeText()` on Export click; fallback `execCommand('copy')` via transient textarea (inverse of WO-006 read constraint).
- **Output page:** name `Figmint Output`; legacy `DesignOps Output`; shared pluginData `figmint.pageRole=output`; update text node by `label` (`figmint/<kind>/…`).
- **pluginData:** keys `figmint:<kind>`; value JSON only; single selection required; 100 kB limit guard.
- **Vitest:** extend canvas figma mock for pages/text; spy Blob/anchor/clipboard APIs — see research §7.
- **ES2017 main thread:** no `?.` / `??` / `replaceAll` in main-bundle sink code (`memory.md`).

### Blockers

- None. WO-019 stub unblocks parallel build with WO-017.

## References

- Ticket: `./ticket.md`
- Research: [`research/output-sinks-implementation.md`](research/output-sinks-implementation.md)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
