---
type: work-order
github_issue: 20
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JEE
---

## Goal

Implement the four non-GitHub output sinks: download as file, copy to clipboard, write to a labeled text node on the Figmint Output page, and write to a selected frame's pluginData. All sinks share the same `LoadedDocument` input shape and a common `Sink` interface for the unified export sheet (WO-020).

PRD anchors: `Docs/PRD.md` §6.8 FR-IO-2, §10.2.

---

## Problem story

As a designer exporting a contract document (e.g. drift-report), I want to send it to my preferred destination — file download, clipboard, a persistent canvas node, or frame pluginData — without re-copying JSON by hand, so agents and engineers can consume the same canonical payload.

## User stories

- [ ] As a designer, I can download a contract as `.v1.json` and/or `.v1.md` files.
- [ ] As a designer, I can copy the serialized document to my clipboard from an Export action (user gesture).
- [ ] As a designer, I can write the document to a labeled text node on the **Figmint Output** page (auto-created on first use).
- [ ] As a designer, I can write JSON to pluginData on a **single selected** frame/node for machine-readable round-trips.

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).** Export sheet UI is WO-020.

---

## Requirements

### Functional

1. `src/io/sinks/types.ts` — `Sink` interface: `write(doc: LoadedDocument, options: FormatOptions): Promise<SinkResult>`; export `SinkId`, `FormatOptions` (`format: 'json' | 'md' | 'both'`, optional `primaryFormat`, `baseName`, `label`), `SinkResult`, `PreparedContent`.
2. `src/io/sinks/prepareContent.ts` — `prepareSinkContent(doc, options)` calls WO-019 `format()` when available; **stub** (`JSON.stringify` + placeholder markdown) until WO-019 merges.
3. `src/io/sinks/download.ts` — UI-thread sink: `Blob` + temporary `<a download>` click; supports `json`, `md`, or `both` (two files).
4. `src/io/sinks/clipboard.ts` — UI-thread sink: `navigator.clipboard.writeText()` on user gesture; **`document.execCommand('copy')` fallback** via off-screen textarea when `writeText` throws.
5. `src/io/sinks/outputPage.ts` — **main-thread** find-or-create **Figmint Output** page (legacy alias **DesignOps Output**); write/update labeled TEXT node by `label` (default `figmint/<kind>/<generatedAt>`); content frame `_FigmintOutputContent`.
6. `src/io/sinks/pluginData.ts` — **main-thread** `setPluginData(key, value)` on exactly one selected node; keys **`figmint:<kind>`** (e.g. `figmint:drift-report`); value always JSON string; reject >100 kB.
7. `src/io/sinks/outputPageClient.ts` + `pluginDataClient.ts` — UI-thread `Sink` wrappers that dispatch via `parent.postMessage` (do not import main-thread Figma modules in UI bundle).
8. `src/io/messages/sinks.ts` — typed `sink/output-page`, `sink/plugin-data`, `sink/result`, `sink/error` messages + ES2017-safe guards; wire handlers in `src/main.ts`.
9. `src/io/sinks/index.ts` — barrel + `runSink(id, doc, options)` orchestrator for WO-020.

### Visual / UX

_See ticket-level scope. Export sheet (WO-020) owns destination checkboxes; this ticket is subsystem-only._

### Technical / architectural

- **Lift reference (DesignOps-plugin):** _None — new code designed in PRD._
- **Thread split (LOCKED):** download + clipboard = UI iframe; output page + pluginData = main thread via postMessage (bootstrap pattern). See `research/output-sinks-implementation.md` §6.
- **Serialization (LOCKED):** sinks never hand-author markdown; `prepareSinkContent` delegates to WO-019. Stub acceptable for WO-017 build if WO-019 not merged yet.
- **Dependencies:** WO-002, WO-003; soft dependency WO-019 (stub until merged)

---

## Acceptance criteria _(definition of done)_

- [ ] All four sinks implement `Sink.write()` and succeed against a sample `DriftReportV1` `LoadedDocument` built from `tests/fixtures/io/sinks/drift-report-sample.v1.json`.
- [ ] Download sink writes `{baseName}.v1.json` and/or `{baseName}.v1.md` with correct MIME types.
- [ ] Clipboard sink copies JSON or markdown per `FormatOptions`; fallback path covered in unit test when `writeText` rejects.
- [ ] Output page auto-created on first use (`Figmint Output` + `figmint` shared pluginData `pageRole=output`); subsequent export with same `label` updates existing text node characters.
- [ ] pluginData sink writes `figmint:drift-report` (or matching kind) on a single selected node; errors on 0 or 2+ selections.
- [ ] Unit tests per sink + `messages/sinks` type guards; Vitest mocks per `research/output-sinks-implementation.md` §7.

## Out of scope

- GitHub PR sink (WO-018).
- Full GFM markdown renderers (WO-019) — stub only in `prepareContent` if needed.
- Unified export sheet UI (WO-020).
- Snapshot hidden node on Output page (WO-028).

---

## Testing & verification

### Functional QA

- Vitest unit tests cover each sink + message guards.
- Manual smoke (Plugin Sandbox): run all four sinks against drift-report sample.

### Visual / design QA

- See ticket-level scope; visual QA in WO-020.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- `console.debug` in UI sinks; `pluginLog()` on main-thread handlers; production telemetry deferred.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- ✅ Resolved 2026-05-27. Sink interface, thread split, clipboard fallback, Output page conventions, and Vitest strategy locked in `research/output-sinks-implementation.md`.

## 📋 Ready for `/plan`

- Dependencies: WO-002, WO-003; coordinate WO-019 stub vs merge.
- `plan.md` should lock file paths, message types, and build order before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.8 FR-IO-2, §10.2, §10.3
- Research: [Output sinks implementation](research/output-sinks-implementation.md)
- Contracts: `packages/contracts/src/driftReport.v1.ts`, `src/io/sources/types.ts` (`LoadedDocument`)
- Clipboard input precedent: [WO-006 io-subsystem-design §Q1](../../Sprint%202/WO-006-io-subsystem-foundation-paste-file-clipboard/research/io-subsystem-design.md)
- Lift reference: _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
